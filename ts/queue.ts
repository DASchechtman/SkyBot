export class Queue<T> {
    private m_queue: Array<T>

    public constructor() {
        this.m_queue = []
    }

    public Enqueue(data: T) {
        this.m_queue.push(data)
    }

    public Dequeue() {
        const del_item = this.m_queue[0]
        this.m_queue.shift()
        return del_item
    }

    public Front() {
        if (this.m_queue.length === 0) { return undefined }
        return this.m_queue[0]
    }

    public Back() {
        if (this.m_queue.length === 0) { return undefined }
        return this.m_queue[this.m_queue.length-1]
    }

    public Size() {
        return this.m_queue.length
    }

    public Clear() {
        while (this.Size() > 0) {
            this.Dequeue()
        }
    }
}