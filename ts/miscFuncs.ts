import { Collection, Guild, GuildInviteManager, Message, OAuth2Guild, Role } from "discord.js";
import { GREET_CHAT_ID, NOMAD_ID, EMOJI_SETUP_MSG_ID, ROLE_KEY, ROLE_MAP, SERVER_OWNER_ID } from "./consts";
import { Disk } from "./disk";
import { Queue } from "./queue";
import { Manager } from './interfaces'
import { JsonTreeNode, NodeTypes } from "./jsonTree";
import { InputPipe } from "./inputPipe";

async function SendInitReactionMsg(guild: Guild) {
    const channels = await GetManagerData(guild.channels)
    const tree = Disk.Get().GetJsonTreeRoot().GetNode(guild.name)

    const greet_id = tree?.GetNode(GREET_CHAT_ID)?.Get() as string | undefined
    if (typeof greet_id !== 'string') { return false }

    const channel = channels.find(c => c.id === greet_id)
    if (!channel?.isText()) { console.log(`Error: channel doesn't exist in ${guild.name}`); return false }

    const roles = tree?.GetNode(ROLE_KEY)
    let instructions = `<@${NOMAD_ID}>, Please react to this message to associate the roles with emojis.\n`
    let index = 1

    for (let i = 0; roles && i < roles.ArraySize(); i++) {
        const role_id = roles.GetAt(i)
        if (!role_id) { continue }
        const role = guild.roles.cache.get(role_id.Get() as string)
        instructions += `${index}.) ${role?.name}\n`
        index++
    }

    const message = await channel.send(instructions)

    tree?.CreateChild(EMOJI_SETUP_MSG_ID, message.id)
    Disk.Get().Save()

    GetManagerData(guild.members, NOMAD_ID).then((members) => {
        members.get(NOMAD_ID)?.send("please check the server")
    })

    return true
}

async function RequestGreetChatAndUserId(guild: Guild, queue: Queue<string>): Promise<boolean> {
    const members = await GetManagerData(guild.members)
    const nomad = members.get(NOMAD_ID)
    queue.Enqueue(guild.name)
    console.log('requesting info')

    if (!nomad) {
        guild.members.cache.get(guild.ownerId)?.send("Sorry, you need to add me to your server in order for my bot to work")
        return false
    }
    else {
        nomad.send("Please send the id of the greet channel, and owner of server here in that order")
        const tree = Disk.Get().GetJsonTreeRoot().GetNode(guild.name)
        tree?.CreateChild(GREET_CHAT_ID, "")
        tree?.CreateChild(SERVER_OWNER_ID, "")
        tree?.CreateChild(ROLE_KEY, new Array())
        tree?.CreateChild(ROLE_MAP, new Map())
        Disk.Get().Save()
    }

    Disk.Get().Save()
    return true
}

async function GetServerRoles(message: Message, queue: Queue<string>): Promise<JsonTreeNode> {
    if (queue.Size() === 0) { return new JsonTreeNode(NodeTypes.NULL_TYPE) }

    const group = await GetManagerData(message.author.client.guilds)
    const guild_name = queue.Front()!

    let server: Guild | undefined = undefined
    if (group.at(0) instanceof Guild) {
        server = (group as Collection<string, Guild>).find(s => s.name === guild_name)
    }
    else {
        server = await (group as Collection<string, OAuth2Guild>).find(s => s.name === guild_name)?.fetch()
    }

    if (!server) { return new JsonTreeNode(NodeTypes.NULL_TYPE) }

    const roles = await GetManagerData(server.roles)
    const roles_list = Disk.Get().GetJsonTreeRoot().GetNode(guild_name)?.GetNode(ROLE_KEY)

    roles.forEach((role) => {
        if (role.managed || role.toString() === '@everyone') { return }
        roles_list?.PushTo(role.id)
        roles_list?.PushTo(role.name)
    })

    return roles_list ? roles_list : new JsonTreeNode(NodeTypes.NULL_TYPE)
}

function AskForRolesToNotOffer(node: JsonTreeNode, message: Message) {
    if (node.Type() !== NodeTypes.ARRAY_TYPE) { return false }

    let instructions = "Please pick the roles you wish to exclude.\n"
    let index = 1

    for(let i = 0; i < node.ArraySize(); i += 2) {
        const name_index = i + 1
        instructions += `${index}.) ${node.GetAt(name_index)?.Get()}\n`
        node.SetAt(name_index, null)
        index++
    }

    node.Filter(item => item.Type() !== NodeTypes.NULL_TYPE)
    message.channel.send(instructions)
    return true
}

async function GetServerRolesAndAskForRolesToNotOffer(message: Message, queue: Queue<string>): Promise<boolean> {
    if (message.author.id !== NOMAD_ID) { return false }
    const args = message.content.split(' ')

    const tree = Disk.Get().GetJsonTreeRoot().GetNode(queue.Front()!)
    tree?.GetNode(GREET_CHAT_ID)?.Set(args[0])
    tree?.GetNode(SERVER_OWNER_ID)?.Set(args[1])

    const roles_list = await GetServerRoles(message, queue)
    const ret = AskForRolesToNotOffer(roles_list, message)
    Disk.Get().Save()
    return ret
}

function ExcludeRoles(message: Message, guild_name: string) {
    const json_guild_root = Disk.Get().GetJsonTreeRoot().GetNode(guild_name)
    const roles_list = json_guild_root?.GetNode(ROLE_KEY)
    const role_indexes = message.content.split(' ')

    for (let str_index of role_indexes) {
        const num = Number.parseInt(str_index)
        if (Number.isNaN(num)) { continue }
        roles_list?.SetAt(num-1, null)
    }

    roles_list?.Filter(item => item.Type() != NodeTypes.NULL_TYPE)
}

async function AskForReactionOnMsg(message: Message, guild_name: string) {
    const members = await GetManagerData(message.author.client.guilds, g => g.name === guild_name)

    if (members.at(0) instanceof Guild) {
        const server = (members as Collection<string, Guild>).find(s => s.name === guild_name)
        if (server) {
            SendInitReactionMsg(server)
        }
        return Boolean(server)
    }

    const server = await (members as Collection<string, OAuth2Guild>).find(s => s.name === guild_name)?.fetch()
    if (server) {
        SendInitReactionMsg(server)
    }
}

async function ExcludeRolesAndAskForReactsOnMsg(message: Message, queue: Queue<string>): Promise<boolean> {
    const guild_name = queue.Front()!!
    ExcludeRoles(message, guild_name)
    AskForReactionOnMsg(message, guild_name)
    Disk.Get().Save()
    return true
}

export function CreatePipe(): InputPipe {
    const pipe = new InputPipe()
    pipe.MakeStartOfPipe(RequestGreetChatAndUserId)
    pipe.AddToPipe(GetServerRolesAndAskForRolesToNotOffer)
    pipe.AddToPipe(ExcludeRolesAndAskForReactsOnMsg)
    return pipe
}

export function GetManagerData<T, K>(mamager: Manager<T, K>, key: string | ((data: K) => boolean) | undefined = undefined) {
    const err_msg = "Error: promise unable to be"
    let promise: Promise<Collection<string, K>> | Promise<T>

    if (key === undefined) {
        const promise = mamager.fetch()
        promise.catch(() => {
            console.log(err_msg)
        })
        return promise
    }

    let data = typeof key === 'string' ? mamager.cache.get(key) : mamager.cache.find(key)

    if (data) {
        promise = new Promise<Collection<string, K>>((resolve) => {
            resolve(mamager.cache)
        })
    }
    else {
        promise = mamager.fetch()
        promise.catch(() => {
            console.log(err_msg)
        })
    }

    return promise
}