import { Client, Guild, GuildMember, Intents, Message, OAuth2Guild, PartialGuildMember, PartialUser, User } from "discord.js";
import { EMOJI_TEXT, GREET_MSGS_MAP, GREET_CHAT_ID, MEMBERS_KEY, NOMAD_ID, EMOJI_SETUP_MSG_ID, ROLE_KEY, ROLE_MAP, EMOJI_ROLE_ID, TEST_SERVER_ID } from "./consts";
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
    const greet_channel = tree?.GetNode(GREET_CHAT_ID)

    if (!greet_channel || greet_channel.Type() !== NodeTypes.STR_TYPE) { return }

    if (!tree?.GetNode(GREET_MSGS_MAP)) {
        tree?.CreateChild(GREET_MSGS_MAP, new Map())
    }

    GetManagerData(member.guild.channels, greet_channel.Get() as string).then(async (channels) => {
        const greet_chan = channels.get(greet_channel.Get() as string)

        if (!greet_chan?.isText()) { return }

        let greeting = `Hello <@${member.id}>, and welcome aboard. Please react to this message to assign yourself roles.\n`
        const emoji_id_to_role_id_map = Disk.Get().GetJsonTreeRoot().GetNode(member.guild.name)?.GetNode(ROLE_MAP)

        if (!emoji_id_to_role_id_map) { console.log("couldn't get roles on greet"); return }

        const roles = await GetManagerData(member.guild.roles)

        const vals = emoji_id_to_role_id_map.GetAllVals()
        const keys = emoji_id_to_role_id_map.GetAllKeys()
        let index = 1
        for (let i of vals) {
            const emoji = i.GetNode(EMOJI_TEXT)?.Get()
            const emoji_role = i.GetNode(EMOJI_ROLE_ID)?.Get()
            greeting += `${emoji} -> ${roles.get(emoji_role as string)?.name}\n`
            index++
        }

        let msg = await greet_chan.send(greeting)

        keys.forEach((key) => { msg.react(key) })
        tree?.GetNode(GREET_MSGS_MAP)?.CreateChild(msg.id, null)
        Disk.Get().Save()
    })
}

function ForgetMember(member: GuildMember | PartialGuildMember) {
    let tree = Disk.Get().GetJsonTreeRoot().GetNode(member.guild.name)?.GetNode(MEMBERS_KEY)
    if (!tree) { console.log("Error: couldn't find members list"); return }
    tree.DeleteChild(member.id)
    Disk.Get().Save()
}

function TriggerMemberAdd(guild: Guild) {
    if (guild instanceof Guild) {
        console.log("reg guild")
        GetManagerData(guild.members, NOMAD_ID).then(members => {
            const member = members.get('320737111500128256')
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
                tree_node = tree_node.CreateChild(club.name, new Map())!!.CreateChild(MEMBERS_KEY, new Map())!!
            }
            else {
                tree_node = tree_node.GetNode(club.name)!!.GetNode(MEMBERS_KEY)!!
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
                guild_input_pipes.Add(members.get(NOMAD_ID)!!)
                guild_input_pipes.GetIncompletePipe(NOMAD_ID)?.Run(server)
            }
            if (server.id === '927137186502041600') {
                TriggerMemberAdd(server)
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
            .CreateChild(MEMBERS_KEY, new Map())!!

        console.log("adding new guild", guild.name)

        GetManagerData(guild.members, NOMAD_ID).then(members => {
            const member = members.get(NOMAD_ID)

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
            guild_input_pipes.GetIncompletePipe(NOMAD_ID)?.Run(guild)
        })
    })

    bot.on("guildDelete", (guild) => {
        Disk.Get().GetJsonTreeRoot().DeleteChild(guild.name)
        GetManagerData(guild.members, NOMAD_ID).then(members => {
            const member = members.get(NOMAD_ID)
            if (member) {
                SetUpManager.Get().Delete(member)
            }
        })
        Disk.Get().Save()
    })

    bot.on("messageCreate", (message) => {
        const from_bot_in_reg_server = message.author.bot && message.guild?.id !== TEST_SERVER_ID
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
        const input_pipe = guild_input_pipes.GetIncompletePipe(NOMAD_ID)
        const emoji_id_to_role_id_map = json_guild_root?.GetNode(ROLE_MAP)

        if (input_pipe && !input_pipe.IsComplete()) {

            const roles_list = json_guild_root?.GetNode(ROLE_KEY)
            const react_msg_id = json_guild_root?.GetNode(EMOJI_SETUP_MSG_ID)

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

                if (first_user_id !== NOMAD_ID) {
                    reaction.remove()
                    console.log("Error: not the right person to create reactions")
                    return
                }

                if (roles_list.Type() !== NodeTypes.ARRAY_TYPE) { console.log("Error: roles not found"); return }

                const HasItems = () => { return roles_list.ArraySize() > 0 }

                if (HasItems()) {
                    const role_id = json_guild_root.GetNode(ROLE_KEY)?.GetAt(0)?.Get()
                    if (role_id === undefined) { return }
                    emoji_id_to_role_id_map.CreateChild(reaction.emoji.identifier, new Map())
                    const emoji = emoji_id_to_role_id_map.GetNode(reaction.emoji.identifier)
                    emoji?.CreateChild(EMOJI_TEXT, reaction.emoji.toString())
                    emoji?.CreateChild(EMOJI_ROLE_ID, role_id as string)
                    json_guild_root.GetNode(ROLE_KEY)?.RemoveAt(0)
                }

                if (!HasItems()) {
                    const members = await reaction.message.guild!!.members.fetch()
                    input_pipe.MakeComplete()

                    if (members && members.get(NOMAD_ID)) {
                        const member = members.get(NOMAD_ID)!!
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
            const role_id = emoji_id_to_role_id_map?.GetNode(reaction.emoji.identifier)?.GetNode(EMOJI_ROLE_ID)

            if (!role_id) { console.log("cant add role"); return }
            else if (role_id.Type() !== NodeTypes.STR_TYPE) { console.log("incorrect type for reaction"); return }
            else if (!guild_member) { console.log("member doesnt exist"); return }
            else if (!json_guild_root?.GetNode(GREET_MSGS_MAP)) { console.log("Error: not prior greet msgs"); return }
            else if (!json_guild_root?.GetNode(GREET_MSGS_MAP)?.GetNode(reaction.message.id)) { console.log("Error: not a greet msg"); return }

            guild_member?.roles.add(role_id.Get() as string)
        })
    })

    bot.on("messageReactionRemove", (reaction, user) => {
        if (!reaction.message.guild) { return }
        if (user.bot) { return }
        if (SetUpManager.Get().ServerNotReady(reaction.message.guild.id)) { return }

        const tree = Disk.Get().GetJsonTreeRoot()!!.GetNode(reaction.message.guild.name)
        let emoji_roles = tree?.GetNode(ROLE_MAP)

        if (!emoji_roles) { return }

        GetManagerData(reaction.message.guild.members, user.id).then(members => {
            const member = members.get(user.id)!!
            const role_id = emoji_roles?.GetNode(reaction.emoji.identifier)?.GetNode(EMOJI_ROLE_ID)
            if (!role_id) { return }
            if (!tree?.GetNode(GREET_MSGS_MAP)) { console.log("Error: not prior greet msgs"); return }
            if (!tree?.GetNode(GREET_MSGS_MAP)?.GetNode(reaction.message.id)) { console.log("Error: not a greet msg"); return }
           
            member.roles.remove(role_id.Get() as string)
        })
    })

    bot.on("guildMemberAdd", (member) => {
        console.log(member.guild.name)
        let tree = Disk.Get().GetJsonTreeRoot().GetNode(member.guild.name)!!.GetNode(MEMBERS_KEY)
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