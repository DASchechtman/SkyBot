import { Collection, Guild, GuildInviteManager, Message, OAuth2Guild, Role } from "discord.js";
import { greet_chat_key, nomad_id, react_setup_msg, role_key, role_map, server_owner_key } from "./consts";
import { Disk } from "./disk";
import { Queue } from "./queue";
import { Manager } from './interfaces'
import { NodeTypes } from "./jsonTree";
import { InputPipe } from "./inputPipe";

function CreateListMessage<T>(
    func: (item: T) => string, 
    omit_res: (item: T) => boolean, 
    id_func: (item: T) => string,
    array: Collection<string, T>, 
    init_msg: string): [string, {i: number, id: string}[]] {
    let ret_message = init_msg
    let indexes: {i: number, id: string}[] = []
    let index = 1

    for (let i of array) {
        if (omit_res(i[1])) { continue }
        ret_message += `${index}.) ${func(i[1])}\n`
        indexes.push({
            i: index-1,
            id: id_func(i[1])
        })
        index++
    }

    return [ret_message, indexes]
}

async function AskRolesToRemove(guild: Guild) {
    const roles = await GetManagerData(guild.roles)

    let res = CreateListMessage(
        (item) => { return item.name },
        (item) => { return item.managed || `${item}` === "@everyone" },
        (item) => { return item.id },
        roles,
        "Please pick the roles you wish to exclude.\n"
    )

    await (await GetManagerData(guild.members, nomad_id)).get(nomad_id)?.send(res[0])

    return res[1]
}

async function SendInitReactionMsg(guild: Guild) {
    const channels = await GetManagerData(guild.channels)
    const tree = Disk.Get().GetJsonTreeRoot().GetNode(guild.name)

    const greet_id = tree?.GetNode(greet_chat_key)?.Get() as string | undefined
    if (typeof greet_id !== 'string') { return false }

    const channel = channels.get(greet_id)
    if (!channel?.isText()) { return false }

    const roles = tree?.GetNode(role_key)
    let instructions = `<@${nomad_id}>, Please react to this message to associate the roles with emojis.\n`
    let index = 1

    for (let i = 0; roles && i < roles.ArraySize(); i++) {
        const role_id = roles.GetAt(i)
        if (!role_id) { continue }
        const role = guild.roles.cache.get(role_id.Get() as string)
        instructions += `${index}.) ${role?.name}\n`
        index++
    }

    const message = await channel.send(instructions)

    tree?.CreateChild(react_setup_msg, message.id)
    Disk.Get().Save()

    GetManagerData(guild.members, nomad_id).then((members) => {
        members.get(nomad_id)?.send("please check the server")
    })

    return true
}

async function RequestGreetChatAndUserId(guild: Guild, queue: Queue<string>): Promise<boolean> {
    const members = await GetManagerData(guild.members)
    const nomad = members.get(nomad_id)
    queue.Enqueue(guild.name)
    console.log('requesting info')

    if (!nomad) {
        guild.members.cache.get(guild.ownerId)?.send("Sorry, you need to add me to your server in order for my bot to work")
        return false
    }
    else {
        nomad.send("Please send the id of the greet channel, and owner of server here in that order")
        const tree = Disk.Get().GetJsonTreeRoot().GetNode(guild.name)
        tree?.CreateChild(greet_chat_key, "")
        tree?.CreateChild(server_owner_key, "")
        tree?.CreateChild(role_key, new Array())
        tree?.CreateChild(role_map, new Map())
        Disk.Get().Save()
    }

    Disk.Get().Save()
    return true
}

async function GetServerRolesAndAskForExcluded(message: Message, queue: Queue<string>): Promise<boolean> {
    if (message.author.id !== nomad_id) { return false }

    const args = message.content.split(' ')
    const guild_name = queue.Front()!!

    let guild = await GetManagerData(message.author.client.guilds)
    const was_cached = guild.at(0) instanceof Guild

    const json_node = Disk.Get().GetJsonTreeRoot().GetNode(guild_name)
    json_node?.GetNode(greet_chat_key)?.Set(args[0])
    json_node?.GetNode(server_owner_key)?.Set(args[1])
    Disk.Get().Save()

    const RecordRoles = async (guild: Guild) => {
        for (let entry of await AskRolesToRemove(guild)) {
            json_node?.GetNode(role_key)?.SetAt(entry.i, entry.id)
        }
    }

    if (was_cached) {
        guild = guild as Collection<string, Guild>
        const server = guild.find(s => s.name === guild_name)
        if (server) {
            RecordRoles(server)
        }
        return Boolean(server)
    }

    guild = guild as Collection<string, OAuth2Guild>
    const server = await guild.find(s => s.name === guild_name)?.fetch()
    if (server) {
        RecordRoles(server)
    }

    return Boolean(server)
}

async function ExcludeRolesAndAskForReactsOnMsg(message: Message, queue: Queue<string>): Promise<boolean> {
    const guild_name = queue.Front()!!
    const tree = Disk.Get().GetJsonTreeRoot().GetNode(guild_name)
    let rk = role_key
    let roles = tree?.GetNode(rk)
    if (!roles) { return false }

    console.log("sending react msg")

    const indexes = message.content.split(' ')

    for (let str of indexes) {
        let num = Number.parseInt(str)
        if (Number.isNaN(num)) { continue }
        tree?.GetNode(role_key)?.SetAt(num - 1, null)
    }

    tree?.GetNode(role_key)?.Filter(item => item.Type() !== NodeTypes.NULL_TYPE)
    Disk.Get().Save()

    const members = await GetManagerData(message.author.client.guilds, g => g.name === guild_name)

    if (members.at(0) instanceof Guild) {
        const server = (members as Collection<string, Guild>).find(s => s.name === guild_name)
        if (server) {
            SendInitReactionMsg(server)
            return Boolean(server)
        }
    }

    const server = await (members as Collection<string, OAuth2Guild>).find(s => s.name === guild_name)?.fetch()
    if (server) {
        SendInitReactionMsg(server)
    }

    return Boolean(server)
}

export function CreatePipe(): InputPipe {
    const pipe = new InputPipe()
    pipe.MakeStartOfPipe(RequestGreetChatAndUserId)
    pipe.AddToPipe(GetServerRolesAndAskForExcluded)
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