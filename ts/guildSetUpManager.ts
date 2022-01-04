import { GuildMember } from "discord.js";
import { InputPipe } from "./inputPipe";
import { CreatePipe } from "./miscFuncs";
import { Queue } from "./queue";

export class SetUpManager {
    private static manager: SetUpManager | null = null
    private m_guilds: Map<string, Queue<InputPipe>>
    private m_other_guild_membs: Map<string, Queue<InputPipe>>

    public static Get() {
        if(this.manager === null) {
            this.manager = new SetUpManager()
        }
        return this.manager
    }

    private constructor() {
        this.m_guilds = new Map()
        this.m_other_guild_membs = new Map()
    }

    public Add(key: GuildMember) {
        const queue = new Queue<InputPipe>()

        if (!this.m_guilds.has(key.id)) {
            this.m_guilds.set(key.id, queue)
        }
        const pipe = CreatePipe()
        queue.Enqueue(pipe)

        if (!this.m_other_guild_membs.has(key.guild.id)) {
            this.m_other_guild_membs.set(key.guild.id, queue)
        }
    }

    public Delete(key: GuildMember) {
        this.m_guilds.delete(key.id)
        this.m_other_guild_membs.delete(key.guild.id)
    }

    public GetIncompletePipe(key: string) {
        let pipe = undefined
        if (this.m_guilds.has(key)) {
            const queue = this.m_guilds.get(key)!!
            if (queue.Front()?.IsComplete()) {
                queue.Dequeue()
                pipe = queue.Front()

                if(queue.Size() === 0) {
                    this.m_guilds.delete(key)
                }
            }
            else {
                pipe = queue.Front()
            }
        }
        return pipe
    }

    public Has(key: string) {
        return this.m_guilds.has(key)
    }

    public ServerNotReady(server_id: string) {
        return this.m_other_guild_membs.has(server_id) && !this.m_other_guild_membs.get(server_id)?.Front()?.IsComplete()
    }

}