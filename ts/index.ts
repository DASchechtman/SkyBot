import { Client, Guild, GuildMember, Intents, Message, OAuth2Guild, PartialGuildMember, PartialUser, User } from "discord.js";
import { greets, greet_chat_key, members_key, nomad_id, react_setup_msg, role_key, role_map, test_server_id } from "./consts";
import { Disk } from "./disk";
import { SetUpManager } from "./guildSetUpManager";
import { NodeTypes } from "./jsonTree";
import { GetManagerData } from "./miscFuncs";
import LoginInfo from './token.json'

const bot = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
        Intents.FLAGS.GUILD_MEMBERS,
        Intents.FLAGS.DIRECT_MESSAGES,
    ],
    partials: [
        'CHANNEL',
        'MESSAGE',
        'REACTION',
        'GUILD_MEMBER',
        'USER'
    ]
})

bot.user?.id
let index = 0

function GreetNewMember(member: GuildMember) {
    const tree = Disk.Get().GetJsonTreeRoot().GetNode(member.guild.name)
    const greet_channel = tree?.GetNode(greet_chat_key)

    if (!greet_channel || greet_channel.Type() !== NodeTypes.STR_TYPE) { return }

    if (!tree?.GetNode(greets)) {
        tree?.CreateChild(greets, new Map())
    }

    GetManagerData(member.guild.channels, greet_channel.Get() as string).then(async (channels) => {
        const greet_chan = channels.get(greet_channel.Get() as string)

        if (!greet_chan?.isText()) { return }

        let greeting = `Hello <@${member.id}>, and welcome aboard. Please react to this message to assign yourself roles.\n`
        greeting += "Each emoji gives you a role in the order they appear in the list below:\n"
        const emoji_id_to_role_id_map = Disk.Get().GetJsonTreeRoot().GetNode(member.guild.name)?.GetNode(role_map)

        if (!emoji_id_to_role_id_map) { console.log("couldn't get roles on greet"); return }

        const roles = await GetManagerData(member.guild.roles)

        const vals = emoji_id_to_role_id_map.GetAllVals()
        const keys = emoji_id_to_role_id_map.GetAllKeys()
        let index = 1
        for (let i of vals) {
            greeting += `${index}.) ${roles.get(i.Get() as string)?.name}\n`
            index++
        }

        let msg = await greet_chan.send(greeting)

        keys.forEach((key) => { msg.react(key) })
        tree?.GetNode(greets)?.CreateChild(msg.id, null)
        Disk.Get().Save()
    })
}

function ForgetMember(member: GuildMember | PartialGuildMember) {
    let tree = Disk.Get().GetJsonTreeRoot().GetNode(member.guild.name)?.GetNode(members_key)
    if (!tree) { console.log("Error: couldn't find members list"); return }
    tree.DeleteChild(member.id)
    Disk.Get().Save()
}

function TriggerMemberAdd(guild: Guild) {
    if (guild instanceof Guild) {
        console.log("reg guild")
        GetManagerData(guild.members, nomad_id).then(members => {
            const member = members.get('511313073215111179')
            if (member) {
                bot.emit("guildMemberAdd", member)
            }
        })
    }
}

const guild_input_pipes = SetUpManager.Get()

bot.once("ready", (client) => {
    console.log("online")
    client.guilds.fetch().then(guilds => {
        guilds.forEach(async (club) => {
            let tree_node = Disk.Get().GetJsonTreeRoot()

            const saved_guild: boolean = tree_node.HasNode(club.name)

            if (!saved_guild) {
                tree_node = tree_node.CreateChild(club.name, new Map())!!.CreateChild(members_key, new Map())!!
            }
            else {
                tree_node = tree_node.GetNode(club.name)!!.GetNode(members_key)!!
            }


            const server = await club.fetch()
            const members = await server.members.fetch()

            members.forEach((member) => {
                const has_member: boolean = tree_node.HasNode(member.id)
                if (saved_guild && !has_member) {
                    GreetNewMember(member)
                }

                if (!has_member) {
                    tree_node.CreateChild(member.id, null)
                }
            })

            Disk.Get().Save()
            if (!saved_guild) {
                guild_input_pipes.Add(members.get(nomad_id)!!)
                guild_input_pipes.GetIncompletePipe(nomad_id)?.Run(server)
            }
        })
        addListeners()
    })
})

const addListeners = () => {
    console.log("adding listeners")
    bot.on("guildCreate", (guild) => {
        let tree = Disk.Get().GetJsonTreeRoot()
            .CreateChild(guild.name, new Map())!!
            .CreateChild(members_key, new Map())!!

        console.log("adding new guild", guild.name)

        GetManagerData(guild.members, nomad_id).then(members => {
            const member = members.get(nomad_id)

            if (!member) {
                const err_msg = "Error: Bot owner not in the guild, not recording members"
                console.log(err_msg)
                Disk.Get().GetJsonTreeRoot().DeleteChild(guild.name)
                Disk.Get().Save()
                return
            }

            guild_input_pipes.Add(member)

            members.forEach((member) => {
                tree?.CreateChild(member.id, null)
            })
            Disk.Get().Save()
            guild_input_pipes.GetIncompletePipe(nomad_id)?.Run(guild)
        })
    })

    bot.on("guildDelete", (guild) => {
        Disk.Get().GetJsonTreeRoot().DeleteChild(guild.name)
        GetManagerData(guild.members, nomad_id).then(members => {
            const member = members.get(nomad_id)
            if (member) {
                SetUpManager.Get().Delete(member)
            }
        })
        Disk.Get().Save()
    })

    bot.on("messageCreate", (message) => {
        const from_bot_in_reg_server = message.author.bot && message.guild?.id !== test_server_id
        const from_bot_in_test_server = message.author.id === bot.user?.id
        if (from_bot_in_reg_server || from_bot_in_test_server) {
            return
        }

        if (guild_input_pipes.Has(message.author.id)) {
            const pipe = guild_input_pipes.GetIncompletePipe(message.author.id)
            pipe?.Run(message)
            return
        }
        else if (!message.guild || SetUpManager.Get().ServerNotReady(message.guild.id)) {
            index++
            return
        }

        if (message.content[0] !== '+') { console.log("ignoring message"); return }

        console.log(`processing ${index}`)
        index++
    })

    bot.on("messageReactionAdd", (reaction, user) => {
        if (user.bot) { console.log("bot trying to react"); return }
        if (!reaction.message.guild) { console.log("Error: no guild attact to message reaction"); return }

        const json_guild_root = Disk.Get().GetJsonTreeRoot().GetNode(reaction.message.guild.name)
        const input_pipe = guild_input_pipes.GetIncompletePipe(nomad_id)
        const emoji_id_to_role_id_map = json_guild_root?.GetNode(role_map)

        if (input_pipe && !input_pipe.IsComplete()) {

            const roles_list = json_guild_root?.GetNode(role_key)
            const react_msg_id = json_guild_root?.GetNode(react_setup_msg)

            if (
                !json_guild_root
                || !roles_list
                || !emoji_id_to_role_id_map
                || !react_msg_id
            ) { console.log("Error: required data not present for reaction"); return }

            const message_id = react_msg_id.Get() as string
            if (reaction.message.id !== message_id) { console.log("Error: not correct msg for init react setup"); return }

            const MapEmojiIdToRoleId = async function (react_user: User | PartialUser) {
                const first_user_id = react_user.id

                if (first_user_id !== nomad_id) {
                    reaction.remove()
                    console.log("Error: not the right person to create reactions")
                    return
                }

                if (roles_list.Type() !== NodeTypes.ARRAY_TYPE) { console.log("Error: roles not found"); return }

                const HasItems = () => { return roles_list.ArraySize() > 0 }

                if (HasItems()) {
                    const role_id = json_guild_root.GetNode(role_key)?.GetAt(0)?.Get()
                    if (role_id === undefined) { return }
                    emoji_id_to_role_id_map.CreateChild(reaction.emoji.identifier, role_id as string)
                    json_guild_root.GetNode(role_key)?.RemoveAt(0)
                }

                if (!HasItems()) {
                    const members = await reaction.message.guild!!.members.fetch()
                    input_pipe.MakeComplete()

                    if (members && members.get(nomad_id)) {
                        const member = members.get(nomad_id)!!
                        SetUpManager.Get().Delete(member)
                        member.send("Thank you. Setup all done")
                    }
                }
                Disk.Get().Save()
            }

            MapEmojiIdToRoleId(user)
            return
        }

        GetManagerData(reaction.message.guild.members).then(members => {
            const guild_member = members.get(user.id)
            const role_id = emoji_id_to_role_id_map?.GetNode(reaction.emoji.identifier)

            if (!role_id) { console.log("cant add role"); return }
            else if (role_id.Type() !== NodeTypes.STR_TYPE) { console.log("incorrect type for reaction"); return }
            else if (!guild_member) { console.log("member doesnt exist"); return }
            else if (!json_guild_root?.GetNode(greets)) { console.log("Error: not prior greet msgs"); return }
            else if (!json_guild_root?.GetNode(greets)?.GetNode(reaction.message.id)) { console.log("Error: not a greet msg"); return }

            guild_member?.roles.add(role_id.Get() as string)
        })
    })

    bot.on("messageReactionRemove", (reaction, user) => {
        if (!reaction.message.guild) { return }
        if (user.bot) { return }
        if (SetUpManager.Get().ServerNotReady(reaction.message.guild.id)) { return }

        const tree = Disk.Get().GetJsonTreeRoot()!!.GetNode(reaction.message.guild.name)
        let emoji_roles = tree?.GetNode(role_map)

        if (!emoji_roles) { return }

        GetManagerData(reaction.message.guild.members, user.id).then(members => {
            const member = members.get(user.id)!!
            const role_id = emoji_roles?.GetNode(reaction.emoji.identifier)
            if (!role_id) { return }
            if (!tree?.GetNode(greets)) { console.log("Error: not prior greet msgs"); return }
            if (!tree?.GetNode(greets)?.GetNode(reaction.message.id)) { console.log("Error: not a greet msg"); return }
            member.roles.remove(role_id.Get() as string)
        })
    })

    bot.on("guildMemberAdd", (member) => {
        console.log(member.guild.name)
        let tree = Disk.Get().GetJsonTreeRoot().GetNode(member.guild.name)!!.GetNode(members_key)
        tree?.CreateChild(member.id, null)
        GreetNewMember(member)
        Disk.Get().Save()
    })

    bot.on("guildMemberRemove", member => {
        ForgetMember(member)
    })

}

if (LoginInfo["debug-mode"]) {
    if (LoginInfo["debug-token"] !== "") {
        bot.login(LoginInfo["debug-token"])
    }
    else {
        console.log("Couldn't start bot, reeeeeeeeeeeeeeeeeeeeeee!?!?!")
    }
}
else {
    bot.login(LoginInfo["ready-token"])
}