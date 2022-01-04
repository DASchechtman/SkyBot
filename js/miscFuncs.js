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
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetManagerData = exports.CreatePipe = void 0;
const discord_js_1 = require("discord.js");
const consts_1 = require("./consts");
const disk_1 = require("./disk");
const jsonTree_1 = require("./jsonTree");
const inputPipe_1 = require("./inputPipe");
function SendInitReactionMsg(guild) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const channels = yield GetManagerData(guild.channels);
        const tree = disk_1.Disk.Get().GetJsonTreeRoot().GetNode(guild.name);
        const greet_id = (_a = tree === null || tree === void 0 ? void 0 : tree.GetNode(consts_1.greet_chat_key)) === null || _a === void 0 ? void 0 : _a.Get();
        if (typeof greet_id !== 'string') {
            return false;
        }
        const channel = channels.get(greet_id);
        if (!(channel === null || channel === void 0 ? void 0 : channel.isText())) {
            return false;
        }
        const roles = tree === null || tree === void 0 ? void 0 : tree.GetNode(consts_1.role_key);
        let instructions = `<@${consts_1.nomad_id}>, Please react to this message to associate the roles with emojis.\n`;
        let index = 1;
        for (let i = 0; roles && i < roles.ArraySize(); i++) {
            const role_id = roles.GetAt(i);
            if (!role_id) {
                continue;
            }
            const role = guild.roles.cache.get(role_id.Get());
            instructions += `${index}.) ${role === null || role === void 0 ? void 0 : role.name}\n`;
            index++;
        }
        const message = yield channel.send(instructions);
        tree === null || tree === void 0 ? void 0 : tree.CreateChild(consts_1.react_setup_msg, message.id);
        disk_1.Disk.Get().Save();
        GetManagerData(guild.members, consts_1.nomad_id).then((members) => {
            var _a;
            (_a = members.get(consts_1.nomad_id)) === null || _a === void 0 ? void 0 : _a.send("please check the server");
        });
        return true;
    });
}
function RequestGreetChatAndUserId(guild, queue) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const members = yield GetManagerData(guild.members);
        const nomad = members.get(consts_1.nomad_id);
        queue.Enqueue(guild.name);
        console.log('requesting info');
        if (!nomad) {
            (_a = guild.members.cache.get(guild.ownerId)) === null || _a === void 0 ? void 0 : _a.send("Sorry, you need to add me to your server in order for my bot to work");
            return false;
        }
        else {
            nomad.send("Please send the id of the greet channel, and owner of server here in that order");
            const tree = disk_1.Disk.Get().GetJsonTreeRoot().GetNode(guild.name);
            tree === null || tree === void 0 ? void 0 : tree.CreateChild(consts_1.greet_chat_key, "");
            tree === null || tree === void 0 ? void 0 : tree.CreateChild(consts_1.server_owner_key, "");
            tree === null || tree === void 0 ? void 0 : tree.CreateChild(consts_1.role_key, new Array());
            tree === null || tree === void 0 ? void 0 : tree.CreateChild(consts_1.role_map, new Map());
            disk_1.Disk.Get().Save();
        }
        disk_1.Disk.Get().Save();
        return true;
    });
}
function GetServerRoles(message, queue) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
        if (queue.Size() === 0) {
            return new jsonTree_1.JsonTreeNode(jsonTree_1.NodeTypes.NULL_TYPE);
        }
        const group = yield GetManagerData(message.author.client.guilds);
        const guild_name = queue.Front();
        let server = undefined;
        if (group.at(0) instanceof discord_js_1.Guild) {
            server = group.get(guild_name);
        }
        else {
            server = yield ((_a = group.get(guild_name)) === null || _a === void 0 ? void 0 : _a.fetch());
        }
        if (!server) {
            return new jsonTree_1.JsonTreeNode(jsonTree_1.NodeTypes.NULL_TYPE);
        }
        const roles = yield GetManagerData(server.roles);
        const roles_list = (_b = disk_1.Disk.Get().GetJsonTreeRoot().GetNode(guild_name)) === null || _b === void 0 ? void 0 : _b.GetNode(consts_1.role_key);
        for (let role of roles) {
            if (role[1].managed || role[1].toString() === '@everyone') {
                continue;
            }
            roles_list === null || roles_list === void 0 ? void 0 : roles_list.PushTo(role[1].id);
            roles_list === null || roles_list === void 0 ? void 0 : roles_list.PushTo(role[1].name);
        }
        return roles_list ? roles_list : new jsonTree_1.JsonTreeNode(jsonTree_1.NodeTypes.NULL_TYPE);
    });
}
function AskForRolesToNotOffer(node, message) {
    var _a;
    if (node.Type() !== jsonTree_1.NodeTypes.ARRAY_TYPE) {
        return false;
    }
    let instructions = "Please pick the roles you wish to exclude.\n";
    let index = 1;
    for (let i = 0; i < node.ArraySize(); i += 2) {
        const name_index = i + 1;
        instructions += `${index}.) ${(_a = node.GetAt(name_index)) === null || _a === void 0 ? void 0 : _a.Get()}\n`;
        node.SetAt(name_index, null);
        index++;
    }
    node.Filter(item => item.Type() !== jsonTree_1.NodeTypes.NULL_TYPE);
    message.channel.send(instructions);
    return true;
}
function GetServerRolesAndAskForRolesToNotOffer(message, queue) {
    return __awaiter(this, void 0, void 0, function* () {
        if (message.author.id !== consts_1.nomad_id) {
            return false;
        }
        const roles_list = yield GetServerRoles(message, queue);
        const ret = AskForRolesToNotOffer(roles_list, message);
        disk_1.Disk.Get().Save();
        return ret;
    });
}
function ExcludeRoles(message, guild_name) {
    const json_guild_root = disk_1.Disk.Get().GetJsonTreeRoot().GetNode(guild_name);
    const roles_list = json_guild_root === null || json_guild_root === void 0 ? void 0 : json_guild_root.GetNode(consts_1.role_key);
    const role_indexes = message.content.split(' ');
    for (let str_index of role_indexes) {
        const num = Number.parseInt(str_index);
        if (Number.isNaN(num)) {
            continue;
        }
        roles_list === null || roles_list === void 0 ? void 0 : roles_list.SetAt(num - 1, null);
    }
    roles_list === null || roles_list === void 0 ? void 0 : roles_list.Filter(item => item.Type() != jsonTree_1.NodeTypes.NULL_TYPE);
}
function AskForReactionOnMsg(message, guild_name) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const members = yield GetManagerData(message.author.client.guilds, g => g.name === guild_name);
        if (members.at(0) instanceof discord_js_1.Guild) {
            const server = members.find(s => s.name === guild_name);
            if (server) {
                SendInitReactionMsg(server);
            }
            return Boolean(server);
        }
        const server = yield ((_a = members.find(s => s.name === guild_name)) === null || _a === void 0 ? void 0 : _a.fetch());
        if (server) {
            SendInitReactionMsg(server);
        }
    });
}
function ExcludeRolesAndAskForReactsOnMsg(message, queue) {
    return __awaiter(this, void 0, void 0, function* () {
        const guild_name = queue.Front();
        ExcludeRoles(message, guild_name);
        AskForReactionOnMsg(message, guild_name);
        disk_1.Disk.Get().Save();
        return true;
    });
}
function CreatePipe() {
    const pipe = new inputPipe_1.InputPipe();
    pipe.MakeStartOfPipe(RequestGreetChatAndUserId);
    pipe.AddToPipe(GetServerRolesAndAskForRolesToNotOffer);
    pipe.AddToPipe(ExcludeRolesAndAskForReactsOnMsg);
    return pipe;
}
exports.CreatePipe = CreatePipe;
function GetManagerData(mamager, key = undefined) {
    const err_msg = "Error: promise unable to be";
    let promise;
    if (key === undefined) {
        const promise = mamager.fetch();
        promise.catch(() => {
            console.log(err_msg);
        });
        return promise;
    }
    let data = typeof key === 'string' ? mamager.cache.get(key) : mamager.cache.find(key);
    if (data) {
        promise = new Promise((resolve) => {
            resolve(mamager.cache);
        });
    }
    else {
        promise = mamager.fetch();
        promise.catch(() => {
            console.log(err_msg);
        });
    }
    return promise;
}
exports.GetManagerData = GetManagerData;
//# sourceMappingURL=miscFuncs.js.map