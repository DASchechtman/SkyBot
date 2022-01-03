"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JsonTreeNode = exports.NodeTypes = void 0;
var NodeTypes;
(function (NodeTypes) {
    NodeTypes[NodeTypes["ROOT_TYPE"] = 0] = "ROOT_TYPE";
    NodeTypes[NodeTypes["STR_TYPE"] = 1] = "STR_TYPE";
    NodeTypes[NodeTypes["NUM_TYPE"] = 2] = "NUM_TYPE";
    NodeTypes[NodeTypes["BOOL_TYPE"] = 3] = "BOOL_TYPE";
    NodeTypes[NodeTypes["ARRAY_TYPE"] = 4] = "ARRAY_TYPE";
    NodeTypes[NodeTypes["NULL_TYPE"] = 5] = "NULL_TYPE";
})(NodeTypes = exports.NodeTypes || (exports.NodeTypes = {}));
class JsonTreeNode {
    constructor(type) {
        this.m_data = null;
        this.m_type = type;
        switch (this.m_type) {
            case NodeTypes.ROOT_TYPE: {
                this.m_data = new Map();
                break;
            }
            case NodeTypes.ARRAY_TYPE: {
                this.m_data = new Array();
                break;
            }
            case NodeTypes.BOOL_TYPE: {
                this.m_data = false;
                break;
            }
            case NodeTypes.NUM_TYPE: {
                this.m_data = 0;
                break;
            }
            case NodeTypes.STR_TYPE: {
                this.m_data = "";
                break;
            }
        }
    }
    ReplaceLastChar(str, rep_char) {
        let char_arr = str.split('');
        if (char_arr.length === 1) {
            char_arr.push(rep_char);
        }
        else {
            char_arr[char_arr.length - 1] = rep_char;
        }
        return char_arr.join('');
    }
    GetDataType(data) {
        let type = undefined;
        if (typeof data === 'string') {
            type = NodeTypes.STR_TYPE;
        }
        else if (typeof data === 'number') {
            type = NodeTypes.NUM_TYPE;
        }
        else if (typeof data === 'boolean') {
            type = NodeTypes.BOOL_TYPE;
        }
        else if (data === null) {
            type = NodeTypes.NULL_TYPE;
        }
        else if (data instanceof Array) {
            type = NodeTypes.ARRAY_TYPE;
        }
        else if (data instanceof Map) {
            type = NodeTypes.ROOT_TYPE;
        }
        return type;
    }
    Type() {
        return this.m_type;
    }
    Get() {
        switch (this.m_type) {
            case NodeTypes.BOOL_TYPE: {
                return this.m_data;
            }
            case NodeTypes.NUM_TYPE: {
                return this.m_data;
            }
            case NodeTypes.STR_TYPE: {
                return this.m_data;
            }
            case NodeTypes.NULL_TYPE: {
                return null;
            }
            default: {
                return undefined;
            }
        }
    }
    Set(new_data) {
        const data_type = this.GetDataType(new_data);
        if (data_type && data_type === this.m_type) {
            this.m_data = new_data;
            return true;
        }
        return false;
    }
    SetAt(index, data) {
        let type = this.GetDataType(data);
        if (type === undefined) {
            type = NodeTypes.NULL_TYPE;
            data = null;
        }
        const node = new JsonTreeNode(type);
        node.Set(data);
        if (this.m_type === NodeTypes.ARRAY_TYPE) {
            this.m_data[index] = node;
        }
    }
    GetAt(index) {
        let ret = undefined;
        if (this.m_type === NodeTypes.ARRAY_TYPE) {
            ret = this.m_data[index];
        }
        return ret;
    }
    ArraySize() {
        let size = -1;
        if (this.m_type === NodeTypes.ARRAY_TYPE) {
            size = this.m_data.length;
        }
        return size;
    }
    GetAllKeys() {
        const keys = [];
        if (this.m_type === NodeTypes.ROOT_TYPE) {
            for (let entry of this.m_data) {
                keys.push(entry[0]);
            }
        }
        return keys;
    }
    GetAllVals() {
        const vals = [];
        if (this.m_type === NodeTypes.ROOT_TYPE) {
            for (let entry of this.m_data) {
                vals.push(entry[1]);
            }
        }
        return vals;
    }
    RemoveAt(index) {
        if (this.m_type === NodeTypes.ARRAY_TYPE) {
            this.m_data.splice(index, 1);
        }
    }
    PushTo(data) {
        let type = this.GetDataType(data);
        if (type === undefined) {
            type = NodeTypes.NULL_TYPE;
            data = null;
        }
        if (this.m_type === NodeTypes.ARRAY_TYPE) {
            const node = new JsonTreeNode(type);
            node.Set(data);
            this.m_data.push(node);
        }
    }
    Filter(func) {
        if (this.m_type === NodeTypes.ARRAY_TYPE) {
            this.m_data = this.m_data.filter((item) => { return func(item); });
        }
    }
    Find(func) {
        let ret = undefined;
        if (this.m_type === NodeTypes.ARRAY_TYPE) {
            ret = this.m_data.find(func);
        }
        return ret;
    }
    GetNode(node_name) {
        let child_node = undefined;
        if (this.m_type === NodeTypes.ROOT_TYPE) {
            let children = this.m_data;
            if (children.has(node_name)) {
                child_node = children.get(node_name);
            }
        }
        return child_node;
    }
    AddChild(child_name, child) {
        if (this.m_type === NodeTypes.ROOT_TYPE) {
            this.m_data.set(child_name, child);
            return true;
        }
        return false;
    }
    CreateChild(child_name, data) {
        let new_child;
        if (this.m_type !== NodeTypes.ROOT_TYPE) {
            return undefined;
        }
        if (data instanceof Map) {
            new_child = new JsonTreeNode(NodeTypes.ROOT_TYPE);
            data.forEach((val, key) => {
                new_child.AddChild(key, val);
            });
        }
        else if (data instanceof Array) {
            new_child = new JsonTreeNode(NodeTypes.ARRAY_TYPE);
            new_child.Set(data);
        }
        else if (typeof data === 'number') {
            new_child = new JsonTreeNode(NodeTypes.NUM_TYPE);
            new_child.Set(data);
        }
        else if (typeof data === 'string') {
            new_child = new JsonTreeNode(NodeTypes.STR_TYPE);
            new_child.Set(data);
        }
        else if (typeof data === "boolean") {
            new_child = new JsonTreeNode(NodeTypes.BOOL_TYPE);
            new_child.Set(data);
        }
        else {
            new_child = new JsonTreeNode(NodeTypes.NULL_TYPE);
            new_child.Set(null);
        }
        this.m_data.set(child_name, new_child);
        return new_child;
    }
    DeleteChild(child_name) {
        if (this.m_type === NodeTypes.ROOT_TYPE) {
            const children = this.m_data;
            return children.delete(child_name);
        }
        return false;
    }
    HasNode(node_name) {
        return this.GetNode(node_name) !== undefined;
    }
    toString() {
        let str_representation = "";
        switch (this.m_type) {
            case NodeTypes.ARRAY_TYPE: {
                str_representation += '[';
                for (let i = 0; i < this.m_data.length; i++) {
                    let node = this.m_data[0];
                    if (node === null) {
                        node = "null";
                    }
                    str_representation += `${node},`;
                }
                str_representation = this.ReplaceLastChar(str_representation, ']');
                break;
            }
            case NodeTypes.ROOT_TYPE: {
                str_representation += '{';
                this.m_data.forEach((node, key) => {
                    str_representation += `"${key}":${node.toString()},`;
                });
                str_representation = this.ReplaceLastChar(str_representation, '}');
                break;
            }
            case NodeTypes.NULL_TYPE: {
                str_representation = "null";
                break;
            }
            case NodeTypes.STR_TYPE: {
                if (this.m_data.length === 0) {
                    return '\"\"';
                }
                else {
                    return `"${this.m_data}"`;
                }
            }
            default: {
                str_representation = this.m_data.toString();
            }
        }
        return str_representation;
    }
}
exports.JsonTreeNode = JsonTreeNode;
//# sourceMappingURL=jsonTree.js.map