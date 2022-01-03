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
function CreateListMessage(func, omit_res, id_func, array, init_msg) {
    let ret_message = init_msg;
    let indexes = [];
    let index = 1;
    for (let i of array) {
        if (omit_res(i[1])) {
            continue;
        }
        ret_message += `${index}.) ${func(i[1])}\n`;
        indexes.push({
            i: index - 1,
            id: id_func(i[1])
        });
        index++;
    }
    return [ret_message, indexes];
}
function AskRolesToRemove(guild) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const roles = yield GetManagerData(guild.roles);
        let res = CreateListMessage((item) => { return item.name; }, (item) => { return item.managed || `${item}` === "@everyone"; }, (item) => { return item.id; }, roles, "Please pick the roles you wish to exclude.\n");
        yield ((_a = (yield GetManagerData(guild.members, consts_1.nomad_id)).get(consts_1.nomad_id)) === null || _a === void 0 ? void 0 : _a.send(res[0]));
        return res[1];
    });
}
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
function GetServerRolesAndAskForExcluded(message, queue) {
    var _a, _b, _c;
    return __awaiter(this, void 0, void 0, function* () {
        if (message.author.id !== consts_1.nomad_id) {
            return false;
        }
        const args = message.content.split(' ');
        const guild_name = queue.Front();
        let guild = yield GetManagerData(message.author.client.guilds);
        const was_cached = guild.at(0) instanceof discord_js_1.Guild;
        const json_node = disk_1.Disk.Get().GetJsonTreeRoot().GetNode(guild_name);
        (_a = json_node === null || json_node === void 0 ? void 0 : json_node.GetNode(consts_1.greet_chat_key)) === null || _a === void 0 ? void 0 : _a.Set(args[0]);
        (_b = json_node === null || json_node === void 0 ? void 0 : json_node.GetNode(consts_1.server_owner_key)) === null || _b === void 0 ? void 0 : _b.Set(args[1]);
        disk_1.Disk.Get().Save();
        const RecordRoles = (guild) => __awaiter(this, void 0, void 0, function* () {
            var _d;
            for (let entry of yield AskRolesToRemove(guild)) {
                (_d = json_node === null || json_node === void 0 ? void 0 : json_node.GetNode(consts_1.role_key)) === null || _d === void 0 ? void 0 : _d.SetAt(entry.i, entry.id);
            }
        });
        if (was_cached) {
            guild = guild;
            const server = guild.find(s => s.name === guild_name);
            if (server) {
                RecordRoles(server);
            }
            return Boolean(server);
        }
        guild = guild;
        const server = yield ((_c = guild.find(s => s.name === guild_name)) === null || _c === void 0 ? void 0 : _c.fetch());
        if (server) {
            RecordRoles(server);
        }
        return Boolean(server);
    });
}
function ExcludeRolesAndAskForReactsOnMsg(message, queue) {
    var _a, _b, _c;
    return __awaiter(this, void 0, void 0, function* () {
        const guild_name = queue.Front();
        const tree = disk_1.Disk.Get().GetJsonTreeRoot().GetNode(guild_name);
        let rk = consts_1.role_key;
        let roles = tree === null || tree === void 0 ? void 0 : tree.GetNode(rk);
        if (!roles) {
            return false;
        }
        console.log("sending react msg");
        const indexes = message.content.split(' ');
        for (let str of indexes) {
            let num = Number.parseInt(str);
            if (Number.isNaN(num)) {
                continue;
            }
            (_a = tree === null || tree === void 0 ? void 0 : tree.GetNode(consts_1.role_key)) === null || _a === void 0 ? void 0 : _a.SetAt(num - 1, null);
        }
        (_b = tree === null || tree === void 0 ? void 0 : tree.GetNode(consts_1.role_key)) === null || _b === void 0 ? void 0 : _b.Filter(item => item.Type() !== jsonTree_1.NodeTypes.NULL_TYPE);
        disk_1.Disk.Get().Save();
        const members = yield GetManagerData(message.author.client.guilds, g => g.name === guild_name);
        if (members.at(0) instanceof discord_js_1.Guild) {
            const server = members.find(s => s.name === guild_name);
            if (server) {
                SendInitReactionMsg(server);
                return Boolean(server);
            }
        }
        const server = yield ((_c = members.find(s => s.name === guild_name)) === null || _c === void 0 ? void 0 : _c.fetch());
        if (server) {
            SendInitReactionMsg(server);
        }
        return Boolean(server);
    });
}
function CreatePipe() {
    const pipe = new inputPipe_1.InputPipe();
    pipe.MakeStartOfPipe(RequestGreetChatAndUserId);
    pipe.AddToPipe(GetServerRolesAndAskForExcluded);
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