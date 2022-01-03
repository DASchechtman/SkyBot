"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Queue = void 0;
class Queue {
    constructor() {
        this.m_queue = [];
    }
    Enqueue(data) {
        this.m_queue.push(data);
    }
    Dequeue() {
        const del_item = this.m_queue[0];
        this.m_queue.shift();
        return del_item;
    }
    Front() {
        if (this.m_queue.length === 0) {
            return undefined;
        }
        return this.m_queue[0];
    }
    Back() {
        if (this.m_queue.length === 0) {
            return undefined;
        }
        return this.m_queue[this.m_queue.length - 1];
    }
    Size() {
        return this.m_queue.length;
    }
    Clear() {
        while (this.Size() > 0) {
            this.Dequeue();
        }
    }
}
exports.Queue = Queue;
//# sourceMappingURL=queue.js.map