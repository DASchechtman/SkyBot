"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const consts_1 = require("./consts");
const disk_1 = require("./disk");
const guildSetUpManager_1 = require("./guildSetUpManager");
const jsonTree_1 = require("./jsonTree");
const miscFuncs_1 = require("./miscFuncs");
const token_json_1 = __importDefault(require("./token.json"));
const bot = new discord_js_1.Client({
    intents: [
        discord_js_1.Intents.FLAGS.GUILDS,
        discord_js_1.Intents.FLAGS.GUILD_MESSAGES,
        discord_js_1.Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
        discord_js_1.Intents.FLAGS.GUILD_MEMBERS,
        discord_js_1.Intents.FLAGS.DIRECT_MESSAGES,
    ],
    partials: [
        'CHANNEL',
        'MESSAGE',
        'REACTION',
        'GUILD_MEMBER'
    ]
});
let index = 0;
function Greet(member) {
    var _a;
    const tree = disk_1.Disk.Get().GetJsonTreeRoot().GetNode(member.guild.name);
    const greet_channel = (_a = tree === null || tree === void 0 ? void 0 : tree.GetNode(consts_1.greet_chat_key)) === null || _a === void 0 ? void 0 : _a.Get();
    if (!greet_channel) {
        return;
    }
    if (!(tree === null || tree === void 0 ? void 0 : tree.GetNode(consts_1.greets))) {
        tree === null || tree === void 0 ? void 0 : tree.CreateChild(consts_1.greets, new Map());
    }
    (0, miscFuncs_1.GetManagerData)(member.guild.channels, greet_channel).then((channels) => {
        const greet_chan = channels.get(greet_channel);
        if (greet_chan === null || greet_chan === void 0 ? void 0 : greet_chan.isText()) {
            let greeting = `Hello <@${member.id}>, and welcome aboard. Please react to this message to assign yourself roles.\n`;
            greeting += "Each emoji gives you a role in the order they appear in the list below:\n";
            (0, miscFuncs_1.GetManagerData)(member.guild.roles).then(roles => {
                var _a, _b;
                const emoji_roles = (_a = disk_1.Disk.Get().GetJsonTreeRoot().GetNode(member.guild.name)) === null || _a === void 0 ? void 0 : _a.GetNode(consts_1.role_map);
                if (!emoji_roles) {
                    console.log("couldn't get roles on greet");
                    return;
                }
                const vals = emoji_roles.GetAllVals();
                const keys = emoji_roles.GetAllKeys();
                let index = 1;
                for (let i of vals) {
                    greeting += `${index}.) ${(_b = roles.get(i.Get())) === null || _b === void 0 ? void 0 : _b.name}\n`;
                    index++;
                }
                greet_chan.send(greeting).then(msg => {
                    var _a;
                    keys.forEach((key) => {
                        msg.react(key);
                    });
                    (_a = tree === null || tree === void 0 ? void 0 : tree.GetNode(consts_1.greets)) === null || _a === void 0 ? void 0 : _a.CreateChild(msg.id, null);
                    disk_1.Disk.Get().Save();
                });
            });
        }
    });
}
function ForgetMember(member) {
    var _a;
    let tree = (_a = disk_1.Disk.Get().GetJsonTreeRoot().GetNode(member.guild.name)) === null || _a === void 0 ? void 0 : _a.GetNode(consts_1.members_key);
    if (!tree) {
        console.log("Error: couldn't find members list");
        return;
    }
    tree.DeleteChild(member.id);
    disk_1.Disk.Get().Save();
}
function TriggerMemberAdd(guild) {
    if (guild instanceof discord_js_1.Guild) {
        console.log("reg guild");
        (0, miscFuncs_1.GetManagerData)(guild.members, consts_1.nomad_id).then(members => {
            const member = members.get('511313073215111179');
            if (member) {
                bot.emit("guildMemberAdd", member);
            }
        });
    }
}
const guild_input_pipes = guildSetUpManager_1.SetUpManager.Get();
bot.once("ready", (client) => {
    console.log("online");
    client.guilds.fetch().then(guilds => {
        guilds.forEach((club) => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            // check each member of guild to see if there are any unrecorded members
            let tree_node = disk_1.Disk.Get().GetJsonTreeRoot();
            const saved_guild = tree_node.HasNode(club.name);
            if (!saved_guild) {
                tree_node = tree_node.CreateChild(club.name, new Map()).CreateChild(consts_1.members_key, new Map());
            }
            else {
                tree_node = tree_node.GetNode(club.name).GetNode(consts_1.members_key);
            }
            const server = yield club.fetch();
            const members = yield server.members.fetch();
            members.forEach((member) => {
                const has_member = tree_node.HasNode(member.id);
                if (saved_guild && !has_member) {
                    Greet(member);
                }
                if (!has_member) {
                    tree_node.CreateChild(member.id, null);
                }
            });
            disk_1.Disk.Get().Save();
            if (!saved_guild) {
                guild_input_pipes.Add(members.get(consts_1.nomad_id));
                (_a = guild_input_pipes.GetIncompletePipe(consts_1.nomad_id)) === null || _a === void 0 ? void 0 : _a.Run(server);
            }
        }));
        addListeners();
    });
});
const addListeners = () => {
    console.log("adding listeners");
    bot.on("guildCreate", (guild) => {
        // start the instruction process somewhere
        let tree = disk_1.Disk.Get().GetJsonTreeRoot()
            .CreateChild(guild.name, new Map())
            .CreateChild(consts_1.members_key, new Map());
        console.log("adding new guild", guild.name);
        (0, miscFuncs_1.GetManagerData)(guild.members, consts_1.nomad_id).then(members => {
            var _a;
            const member = members.get(consts_1.nomad_id);
            guild_input_pipes.Add(member);
            members.forEach((member) => {
                tree === null || tree === void 0 ? void 0 : tree.CreateChild(member.id, null);
            });
            disk_1.Disk.Get().Save();
            console.log(member);
            (_a = guild_input_pipes.GetIncompletePipe(consts_1.nomad_id)) === null || _a === void 0 ? void 0 : _a.Run(guild);
        });
    });
    bot.on("guildDelete", (guild) => {
        disk_1.Disk.Get().GetJsonTreeRoot().DeleteChild(guild.name);
        (0, miscFuncs_1.GetManagerData)(guild.members, consts_1.nomad_id).then(members => {
            const member = members.get(consts_1.nomad_id);
            if (member) {
                guildSetUpManager_1.SetUpManager.Get().Delete(member);
            }
        });
        disk_1.Disk.Get().Save();
    });
    bot.on("messageCreate", (message) => {
        var _a, _b;
        if (message.author.bot && ((_a = message.guild) === null || _a === void 0 ? void 0 : _a.id) !== consts_1.test_server_id) {
            return;
        }
        else if (message.author.id === '778225437671161856') {
            return;
        }
        if (guild_input_pipes.Has(message.author.id)) {
            const pipe = guild_input_pipes.GetIncompletePipe(message.author.id);
            console.log("running pipe");
            if (pipe) {
                //pipe?.Run(message)
                return;
            }
        }
        else if (!message.guild || guildSetUpManager_1.SetUpManager.Get().ServerNotReady(message.guild.id)) {
            let guild_name = (_b = message.guild) === null || _b === void 0 ? void 0 : _b.name;
            if (message.guild === undefined) {
                guild_name = "undefined";
            }
            console.log(`server not ready ${index}`, guild_name);
            index++;
            return;
        }
        if (message.content[0] !== '+') {
            console.log("ignoring message");
            return;
        }
        console.log(`processing ${index}`);
        index++;
    });
    bot.on("messageReactionAdd", (reaction, user) => {
        if (user.bot) {
            console.log("bot trying to react");
            return;
        }
        if (!reaction.message.guild) {
            console.log("Error: no guild attact to message reaction");
            return;
        }
        const tree = disk_1.Disk.Get().GetJsonTreeRoot().GetNode(reaction.message.guild.name);
        const saved_roles = tree === null || tree === void 0 ? void 0 : tree.GetNode(consts_1.role_key);
        const emoji_to_role = tree === null || tree === void 0 ? void 0 : tree.GetNode(consts_1.role_map);
        const react_msg = tree === null || tree === void 0 ? void 0 : tree.GetNode(consts_1.react_setup_msg);
        const input_pipe = guild_input_pipes.GetIncompletePipe(consts_1.nomad_id);
        if (input_pipe && !input_pipe.IsComplete()) {
            if (!tree || !saved_roles || !emoji_to_role || !react_msg) {
                console.log("Error: required data not present for reaction");
                return;
            }
            const message_id = react_msg.Get();
            if (reaction.message.id !== message_id) {
                console.log("Error: not correct msg for init react setup");
                return;
            }
            (0, miscFuncs_1.GetManagerData)(reaction.users, consts_1.nomad_id).then(users => {
                var _a, _b, _c, _d, _e;
                const first_user_id = (_a = users.at(0)) === null || _a === void 0 ? void 0 : _a.id;
                if (first_user_id !== consts_1.nomad_id) {
                    reaction.remove();
                    console.log("Error: not the right person to create reactions");
                    return;
                }
                if (saved_roles.Type() !== jsonTree_1.NodeTypes.ARRAY_TYPE) {
                    console.log("Error: roles not found");
                    return;
                }
                if (saved_roles && saved_roles.ArraySize() > 0) {
                    const role_id = (_c = (_b = tree.GetNode(consts_1.role_key)) === null || _b === void 0 ? void 0 : _b.GetAt(0)) === null || _c === void 0 ? void 0 : _c.Get();
                    if (role_id === undefined) {
                        return;
                    }
                    emoji_to_role.CreateChild(reaction.emoji.identifier, role_id);
                    (_d = tree.GetNode(consts_1.role_key)) === null || _d === void 0 ? void 0 : _d.RemoveAt(0);
                }
                if (tree.GetNode(consts_1.role_key) && !((_e = tree.GetNode(consts_1.role_key)) === null || _e === void 0 ? void 0 : _e.GetAt(0))) {
                    input_pipe.MakeComplete();
                    (0, miscFuncs_1.GetManagerData)(reaction.message.guild.members, consts_1.nomad_id).then(members => {
                        const member = members.get(consts_1.nomad_id);
                        if (member) {
                            guildSetUpManager_1.SetUpManager.Get().Delete(member);
                        }
                        member === null || member === void 0 ? void 0 : member.send("Thank you. Setup all done");
                    });
                }
                disk_1.Disk.Get().Save();
            });
            return;
        }
        reaction.message.guild.fetch().then(guild => {
            (0, miscFuncs_1.GetManagerData)(reaction.users).then(users => {
                var _a;
                if (!emoji_to_role) {
                    console.log("cant load emoji for reaction");
                    return;
                }
                const last_user = user;
                const guild_member = guild.members.cache.get(last_user.id);
                const role_id = emoji_to_role.GetNode(reaction.emoji.identifier);
                if (!role_id) {
                    console.log("cant add role");
                    return;
                }
                if (!guild_member) {
                    console.log("member doesnt exist");
                    return;
                }
                if (!last_user) {
                    console.log("user doenst exist");
                    return;
                }
                if (!(tree === null || tree === void 0 ? void 0 : tree.GetNode(consts_1.greets))) {
                    console.log("Error: not prior greet msgs");
                    return;
                }
                if (!((_a = tree === null || tree === void 0 ? void 0 : tree.GetNode(consts_1.greets)) === null || _a === void 0 ? void 0 : _a.GetNode(reaction.message.id))) {
                    console.log("Error: not a greet msg");
                    return;
                }
                guild_member === null || guild_member === void 0 ? void 0 : guild_member.roles.add(role_id.Get());
            });
        }).catch(() => { console.log("reaction error"); });
    });
    bot.on("messageReactionRemove", (reaction, user) => {
        if (!reaction.message.guild) {
            return;
        }
        if (user.bot) {
            return;
        }
        if (guildSetUpManager_1.SetUpManager.Get().ServerNotReady(reaction.message.guild.id)) {
            return;
        }
        const tree = disk_1.Disk.Get().GetJsonTreeRoot().GetNode(reaction.message.guild.name);
        let emoji_roles = tree === null || tree === void 0 ? void 0 : tree.GetNode(consts_1.role_map);
        if (!emoji_roles) {
            return;
        }
        (0, miscFuncs_1.GetManagerData)(reaction.message.guild.members, user.id).then(members => {
            var _a;
            const member = members.get(user.id);
            const role_id = emoji_roles === null || emoji_roles === void 0 ? void 0 : emoji_roles.GetNode(reaction.emoji.identifier);
            if (!role_id) {
                return;
            }
            if (!(tree === null || tree === void 0 ? void 0 : tree.GetNode(consts_1.greets))) {
                console.log("Error: not prior greet msgs");
                return;
            }
            if (!((_a = tree === null || tree === void 0 ? void 0 : tree.GetNode(consts_1.greets)) === null || _a === void 0 ? void 0 : _a.GetNode(reaction.message.id))) {
                console.log("Error: not a greet msg");
                return;
            }
            member.roles.remove(role_id.Get());
        });
    });
    bot.on("guildMemberAdd", (member) => {
        console.log(member.guild.name);
        let tree = disk_1.Disk.Get().GetJsonTreeRoot().GetNode(member.guild.name).GetNode(consts_1.members_key);
        tree === null || tree === void 0 ? void 0 : tree.CreateChild(member.id, null);
        Greet(member);
        disk_1.Disk.Get().Save();
    });
    bot.on("guildMemberRemove", member => {
        ForgetMember(member);
    });
};
if (token_json_1.default["debug-mode"]) {
    if (token_json_1.default["debug-token"] !== "") {
        bot.login(token_json_1.default["debug-token"]);
    }
    else {
        console.log("Couldn't start bot, reeeeeeeeeeeeeeeeeeeeeee!?!?!");
    }
}
else {
    bot.login(token_json_1.default["ready-token"]);
}
//# sourceMappingURL=index.js.map