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
exports.InputPipe = void 0;
const discord_js_1 = require("discord.js");
const queue_1 = require("./queue");
class InputPipe {
    constructor() {
        this.m_pipe = new Array();
        this.m_cur_func = 0;
        this.m_start_was_made = false;
        this.m_setup_complete = false;
        this.m_data_store = new queue_1.Queue();
    }
    MakeComplete() {
        this.m_setup_complete = true;
    }
    IsComplete() {
        return this.m_setup_complete && this.AtEndOfPipe();
    }
    AtEndOfPipe() {
        return this.m_cur_func === this.m_pipe.length;
    }
    MakeStartOfPipe(func) {
        if (this.m_pipe.length === 0) {
            this.m_pipe.push(func);
            this.m_start_was_made = true;
        }
    }
    AddToPipe(func) {
        if (this.m_start_was_made) {
            this.m_pipe.push(func);
        }
    }
    Run(input) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.AtEndOfPipe()) {
                return;
            }
            if (this.m_cur_func >= this.m_pipe.length) {
                throw new Error("Input Pipe was not set up correctly");
            }
            else if (this.m_cur_func === 0 && input instanceof discord_js_1.Message) {
                return;
            }
            else if (this.m_cur_func > 0 && input instanceof discord_js_1.Guild) {
                return;
            }
            console.log(this.m_cur_func);
            let res;
            let func = this.m_pipe[this.m_cur_func];
            if (this.m_cur_func === 0) {
                res = yield func(input, this.m_data_store);
            }
            else {
                res = yield func(input, this.m_data_store);
            }
            if (res) {
                this.m_cur_func++;
            }
        });
    }
}
exports.InputPipe = InputPipe;
//# sourceMappingURL=inputPipe.js.map