export class Queue<T> {
    private m_queue: Array<T>
    private m_front: number
    private m_back: () => number

    public constructor() {
        this.m_queue = []
        this.m_front = 0
        this.m_back = () => this.m_queue.length - 1
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
        return this.m_queue[this.m_front]
    }

    public Back() {
        if (this.m_queue.length === 0) { return undefined }
        return this.m_queue[this.m_back()]
    }

    public Size() {
        return this.m_queue.length
    }

    public Clear() {
        this.m_queue.splice(0)
    }
}