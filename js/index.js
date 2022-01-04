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
var _a;
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
        'GUILD_MEMBER',
        'USER'
    ]
});
(_a = bot.user) === null || _a === void 0 ? void 0 : _a.id;
let index = 0;
function GreetNewMember(member) {
    const tree = disk_1.Disk.Get().GetJsonTreeRoot().GetNode(member.guild.name);
    const greet_channel = tree === null || tree === void 0 ? void 0 : tree.GetNode(consts_1.GREET_CHAT_ID);
    if (!greet_channel || greet_channel.Type() !== jsonTree_1.NodeTypes.STR_TYPE) {
        return;
    }
    if (!(tree === null || tree === void 0 ? void 0 : tree.GetNode(consts_1.GREET_MSGS_MAP))) {
        tree === null || tree === void 0 ? void 0 : tree.CreateChild(consts_1.GREET_MSGS_MAP, new Map());
    }
    (0, miscFuncs_1.GetManagerData)(member.guild.channels, greet_channel.Get()).then((channels) => __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e;
        const greet_chan = channels.get(greet_channel.Get());
        if (!(greet_chan === null || greet_chan === void 0 ? void 0 : greet_chan.isText())) {
            return;
        }
        let greeting = `Hello <@${member.id}>, and welcome aboard. Please react to this message to assign yourself roles.\n`;
        const emoji_id_to_role_id_map = (_a = disk_1.Disk.Get().GetJsonTreeRoot().GetNode(member.guild.name)) === null || _a === void 0 ? void 0 : _a.GetNode(consts_1.ROLE_MAP);
        if (!emoji_id_to_role_id_map) {
            console.log("couldn't get roles on greet");
            return;
        }
        const roles = yield (0, miscFuncs_1.GetManagerData)(member.guild.roles);
        const vals = emoji_id_to_role_id_map.GetAllVals();
        const keys = emoji_id_to_role_id_map.GetAllKeys();
        let index = 1;
        for (let i of vals) {
            const emoji = (_b = i.GetNode(consts_1.EMOJI_TEXT)) === null || _b === void 0 ? void 0 : _b.Get();
            const emoji_role = (_c = i.GetNode(consts_1.EMOJI_ROLE_ID)) === null || _c === void 0 ? void 0 : _c.Get();
            greeting += `${emoji} -> ${(_d = roles.get(emoji_role)) === null || _d === void 0 ? void 0 : _d.name}\n`;
            index++;
        }
        let msg = yield greet_chan.send(greeting);
        keys.forEach((key) => { msg.react(key); });
        (_e = tree === null || tree === void 0 ? void 0 : tree.GetNode(consts_1.GREET_MSGS_MAP)) === null || _e === void 0 ? void 0 : _e.CreateChild(msg.id, null);
        disk_1.Disk.Get().Save();
    }));
}
function ForgetMember(member) {
    var _a;
    let tree = (_a = disk_1.Disk.Get().GetJsonTreeRoot().GetNode(member.guild.name)) === null || _a === void 0 ? void 0 : _a.GetNode(consts_1.MEMBERS_KEY);
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
        (0, miscFuncs_1.GetManagerData)(guild.members, consts_1.NOMAD_ID).then(members => {
            const member = members.get('320737111500128256');
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
            let tree_node = disk_1.Disk.Get().GetJsonTreeRoot();
            const saved_guild = tree_node.HasNode(club.name);
            if (!saved_guild) {
                tree_node = tree_node.CreateChild(club.name, new Map()).CreateChild(consts_1.MEMBERS_KEY, new Map());
            }
            else {
                tree_node = tree_node.GetNode(club.name).GetNode(consts_1.MEMBERS_KEY);
            }
            const server = yield club.fetch();
            const members = yield server.members.fetch();
            members.forEach((member) => {
                const has_member = tree_node.HasNode(member.id);
                if (saved_guild && !has_member) {
                    GreetNewMember(member);
                }
                if (!has_member) {
                    tree_node.CreateChild(member.id, null);
                }
            });
            disk_1.Disk.Get().Save();
            if (!saved_guild) {
                guild_input_pipes.Add(members.get(consts_1.NOMAD_ID));
                (_a = guild_input_pipes.GetIncompletePipe(consts_1.NOMAD_ID)) === null || _a === void 0 ? void 0 : _a.Run(server);
            }
            if (server.id === '927137186502041600') {
                TriggerMemberAdd(server);
            }
        }));
        addListeners();
    });
});
const addListeners = () => {
    console.log("adding listeners");
    bot.on("guildCreate", (guild) => {
        let tree = disk_1.Disk.Get().GetJsonTreeRoot()
            .CreateChild(guild.name, new Map())
            .CreateChild(consts_1.MEMBERS_KEY, new Map());
        console.log("adding new guild", guild.name);
        (0, miscFuncs_1.GetManagerData)(guild.members, consts_1.NOMAD_ID).then(members => {
            var _a;
            const member = members.get(consts_1.NOMAD_ID);
            if (!member) {
                const err_msg = "Error: Bot owner not in the guild, not recording members";
                console.log(err_msg);
                disk_1.Disk.Get().GetJsonTreeRoot().DeleteChild(guild.name);
                disk_1.Disk.Get().Save();
                return;
            }
            guild_input_pipes.Add(member);
            members.forEach((member) => {
                tree === null || tree === void 0 ? void 0 : tree.CreateChild(member.id, null);
            });
            disk_1.Disk.Get().Save();
            (_a = guild_input_pipes.GetIncompletePipe(consts_1.NOMAD_ID)) === null || _a === void 0 ? void 0 : _a.Run(guild);
        });
    });
    bot.on("guildDelete", (guild) => {
        disk_1.Disk.Get().GetJsonTreeRoot().DeleteChild(guild.name);
        (0, miscFuncs_1.GetManagerData)(guild.members, consts_1.NOMAD_ID).then(members => {
            const member = members.get(consts_1.NOMAD_ID);
            if (member) {
                guildSetUpManager_1.SetUpManager.Get().Delete(member);
            }
        });
        disk_1.Disk.Get().Save();
    });
    bot.on("messageCreate", (message) => {
        var _a, _b;
        const from_bot_in_reg_server = message.author.bot && ((_a = message.guild) === null || _a === void 0 ? void 0 : _a.id) !== consts_1.TEST_SERVER_ID;
        const from_bot_in_test_server = message.author.id === ((_b = bot.user) === null || _b === void 0 ? void 0 : _b.id);
        if (from_bot_in_reg_server || from_bot_in_test_server) {
            return;
        }
        if (guild_input_pipes.Has(message.author.id)) {
            const pipe = guild_input_pipes.GetIncompletePipe(message.author.id);
            pipe === null || pipe === void 0 ? void 0 : pipe.Run(message);
            return;
        }
        else if (!message.guild || guildSetUpManager_1.SetUpManager.Get().ServerNotReady(message.guild.id)) {
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
        const json_guild_root = disk_1.Disk.Get().GetJsonTreeRoot().GetNode(reaction.message.guild.name);
        const input_pipe = guild_input_pipes.GetIncompletePipe(consts_1.NOMAD_ID);
        const emoji_id_to_role_id_map = json_guild_root === null || json_guild_root === void 0 ? void 0 : json_guild_root.GetNode(consts_1.ROLE_MAP);
        if (input_pipe && !input_pipe.IsComplete()) {
            const roles_list = json_guild_root === null || json_guild_root === void 0 ? void 0 : json_guild_root.GetNode(consts_1.ROLE_KEY);
            const react_msg_id = json_guild_root === null || json_guild_root === void 0 ? void 0 : json_guild_root.GetNode(consts_1.EMOJI_SETUP_MSG_ID);
            if (!json_guild_root
                || !roles_list
                || !emoji_id_to_role_id_map
                || !react_msg_id) {
                console.log("Error: required data not present for reaction");
                return;
            }
            const message_id = react_msg_id.Get();
            if (reaction.message.id !== message_id) {
                console.log("Error: not correct msg for init react setup");
                return;
            }
            const MapEmojiIdToRoleId = function (react_user) {
                var _a, _b, _c;
                return __awaiter(this, void 0, void 0, function* () {
                    const first_user_id = react_user.id;
                    if (first_user_id !== consts_1.NOMAD_ID) {
                        reaction.remove();
                        console.log("Error: not the right person to create reactions");
                        return;
                    }
                    if (roles_list.Type() !== jsonTree_1.NodeTypes.ARRAY_TYPE) {
                        console.log("Error: roles not found");
                        return;
                    }
                    const HasItems = () => { return roles_list.ArraySize() > 0; };
                    if (HasItems()) {
                        const role_id = (_b = (_a = json_guild_root.GetNode(consts_1.ROLE_KEY)) === null || _a === void 0 ? void 0 : _a.GetAt(0)) === null || _b === void 0 ? void 0 : _b.Get();
                        if (role_id === undefined) {
                            return;
                        }
                        emoji_id_to_role_id_map.CreateChild(reaction.emoji.identifier, new Map());
                        const emoji = emoji_id_to_role_id_map.GetNode(reaction.emoji.identifier);
                        emoji === null || emoji === void 0 ? void 0 : emoji.CreateChild(consts_1.EMOJI_TEXT, reaction.emoji.toString());
                        emoji === null || emoji === void 0 ? void 0 : emoji.CreateChild(consts_1.EMOJI_ROLE_ID, role_id);
                        (_c = json_guild_root.GetNode(consts_1.ROLE_KEY)) === null || _c === void 0 ? void 0 : _c.RemoveAt(0);
                    }
                    if (!HasItems()) {
                        const members = yield reaction.message.guild.members.fetch();
                        input_pipe.MakeComplete();
                        if (members && members.get(consts_1.NOMAD_ID)) {
                            const member = members.get(consts_1.NOMAD_ID);
                            guildSetUpManager_1.SetUpManager.Get().Delete(member);
                            member.send("Thank you. Setup all done");
                        }
                    }
                    disk_1.Disk.Get().Save();
                });
            };
            MapEmojiIdToRoleId(user);
            return;
        }
        (0, miscFuncs_1.GetManagerData)(reaction.message.guild.members).then(members => {
            var _a, _b;
            const guild_member = members.get(user.id);
            const role_id = (_a = emoji_id_to_role_id_map === null || emoji_id_to_role_id_map === void 0 ? void 0 : emoji_id_to_role_id_map.GetNode(reaction.emoji.identifier)) === null || _a === void 0 ? void 0 : _a.GetNode(consts_1.EMOJI_ROLE_ID);
            if (!role_id) {
                console.log("cant add role");
                return;
            }
            else if (role_id.Type() !== jsonTree_1.NodeTypes.STR_TYPE) {
                console.log("incorrect type for reaction");
                return;
            }
            else if (!guild_member) {
                console.log("member doesnt exist");
                return;
            }
            else if (!(json_guild_root === null || json_guild_root === void 0 ? void 0 : json_guild_root.GetNode(consts_1.GREET_MSGS_MAP))) {
                console.log("Error: not prior greet msgs");
                return;
            }
            else if (!((_b = json_guild_root === null || json_guild_root === void 0 ? void 0 : json_guild_root.GetNode(consts_1.GREET_MSGS_MAP)) === null || _b === void 0 ? void 0 : _b.GetNode(reaction.message.id))) {
                console.log("Error: not a greet msg");
                return;
            }
            guild_member === null || guild_member === void 0 ? void 0 : guild_member.roles.add(role_id.Get());
        });
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
        let emoji_roles = tree === null || tree === void 0 ? void 0 : tree.GetNode(consts_1.ROLE_MAP);
        if (!emoji_roles) {
            return;
        }
        (0, miscFuncs_1.GetManagerData)(reaction.message.guild.members, user.id).then(members => {
            var _a, _b;
            const member = members.get(user.id);
            const role_id = (_a = emoji_roles === null || emoji_roles === void 0 ? void 0 : emoji_roles.GetNode(reaction.emoji.identifier)) === null || _a === void 0 ? void 0 : _a.GetNode(consts_1.EMOJI_ROLE_ID);
            if (!role_id) {
                return;
            }
            if (!(tree === null || tree === void 0 ? void 0 : tree.GetNode(consts_1.GREET_MSGS_MAP))) {
                console.log("Error: not prior greet msgs");
                return;
            }
            if (!((_b = tree === null || tree === void 0 ? void 0 : tree.GetNode(consts_1.GREET_MSGS_MAP)) === null || _b === void 0 ? void 0 : _b.GetNode(reaction.message.id))) {
                console.log("Error: not a greet msg");
                return;
            }
            member.roles.remove(role_id.Get());
        });
    });
    bot.on("guildMemberAdd", (member) => {
        console.log(member.guild.name);
        let tree = disk_1.Disk.Get().GetJsonTreeRoot().GetNode(member.guild.name).GetNode(consts_1.MEMBERS_KEY);
        tree === null || tree === void 0 ? void 0 : tree.CreateChild(member.id, null);
        GreetNewMember(member);
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