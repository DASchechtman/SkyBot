"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SetUpManager = void 0;
const miscFuncs_1 = require("./miscFuncs");
const queue_1 = require("./queue");
class SetUpManager {
    constructor() {
        this.m_guilds = new Map();
        this.m_other_guild_membs = new Map();
    }
    static Get() {
        if (this.manager === null) {
            this.manager = new SetUpManager();
        }
        return this.manager;
    }
    Add(key) {
        const queue = new queue_1.Queue();
        if (!this.m_guilds.has(key.id)) {
            this.m_guilds.set(key.id, queue);
        }
        const pipe = (0, miscFuncs_1.CreatePipe)();
        queue.Enqueue(pipe);
        if (!this.m_other_guild_membs.has(key.guild.id)) {
            this.m_other_guild_membs.set(key.guild.id, queue);
        }
    }
    Delete(key) {
        this.m_guilds.delete(key.id);
        this.m_other_guild_membs.delete(key.guild.id);
    }
    GetIncompletePipe(key) {
        var _a;
        let pipe = undefined;
        if (this.m_guilds.has(key)) {
            const queue = this.m_guilds.get(key);
            if ((_a = queue.Front()) === null || _a === void 0 ? void 0 : _a.IsComplete()) {
                queue.Dequeue();
                pipe = queue.Front();
                if (queue.Size() === 0) {
                    this.m_guilds.delete(key);
                }
            }
            else {
                pipe = queue.Front();
            }
        }
        return pipe;
    }
    Has(key) {
        return this.m_guilds.has(key);
    }
    ServerNotReady(server_id) {
        var _a, _b;
        return this.m_other_guild_membs.has(server_id) && !((_b = (_a = this.m_other_guild_membs.get(server_id)) === null || _a === void 0 ? void 0 : _a.Front()) === null || _b === void 0 ? void 0 : _b.IsComplete());
    }
}
exports.SetUpManager = SetUpManager;
SetUpManager.manager = null;
//# sourceMappingURL=guildSetUpManager.js.map