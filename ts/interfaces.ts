import { Collection } from "discord.js";

export interface Manager<T, K> {
    fetch: () => Promise<T>
    cache: Collection<string, K>
}