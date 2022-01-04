import { Guild, Message } from "discord.js"
import { Queue } from "./queue"

type InputPipeFunc<T> = ((data: T, queue: Queue<string>) => Promise<boolean>)

export class InputPipe {
    private m_pipe: Array<InputPipeFunc<Message> | InputPipeFunc<Guild>>
    private m_data_store: Queue<string>
    private m_cur_func: number
    private m_start_was_made: boolean
    private m_setup_complete: boolean

    constructor() {
        this.m_pipe = new Array()
        this.m_cur_func = 0
        this.m_start_was_made = false
        this.m_setup_complete = false
        this.m_data_store = new Queue()
    }

    public MakeComplete() {
        this.m_setup_complete = true
    }

    public IsComplete(): boolean {
        return this.m_setup_complete && this.AtEndOfPipe()
    }

    public AtEndOfPipe(): boolean {
        return this.m_cur_func === this.m_pipe.length
    }

    public MakeStartOfPipe(func: InputPipeFunc<Guild> ) {
        if (this.m_pipe.length === 0) {
            this.m_pipe.push(func)
            this.m_start_was_made = true
        }
    }

    public AddToPipe(func: InputPipeFunc<Message>) {
        if (this.m_start_was_made) {
            this.m_pipe.push(func)
        }
    }

    public async Run(input: Message | Guild) {
        if (this.AtEndOfPipe()) {
            return
        }

        const incorrect_setup = this.m_cur_func >= this.m_pipe.length
        const bad_arg_for_first_func = this.m_cur_func === 0 && input instanceof Message
        const bad_arg_for_rest_funcs = this.m_cur_func > 0 && input instanceof Guild
        
        if (incorrect_setup) {
            throw new Error("Input Pipe was not set up correctly")
        }
        else if (bad_arg_for_first_func || bad_arg_for_rest_funcs) {
            return
        }
        

        let get_next_func: boolean
        let func = this.m_pipe[this.m_cur_func]
        if (this.m_cur_func === 0) {
            get_next_func = await (func as InputPipeFunc<Guild>)(input as Guild, this.m_data_store);
        }
        else {
            get_next_func = await (func as InputPipeFunc<Message>)(input as Message, this.m_data_store);
        }

        if (get_next_func) {
            this.m_cur_func++
        }
    }
}