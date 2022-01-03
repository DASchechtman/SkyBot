"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Disk = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const jsonTree_1 = require("./jsonTree");
class Disk {
    constructor() {
        this.m_tree_root = new jsonTree_1.JsonTreeNode(jsonTree_1.NodeTypes.ROOT_TYPE);
        this.m_file_path = path_1.default.resolve(__dirname, '../guild_records.json');
        const tree = JSON.parse(fs_1.default.readFileSync(this.m_file_path, 'utf-8'));
        this.ReadTree(tree, this.m_tree_root);
        console.log("done building tree");
    }
    static Get() {
        if (this.m_disk === null) {
            this.m_disk = new Disk();
        }
        return this.m_disk;
    }
    CreateArray(val) {
        const ret_array = new Array();
        val.forEach((item) => {
            let node;
            if (item instanceof Array) {
                node = new jsonTree_1.JsonTreeNode(jsonTree_1.NodeTypes.ARRAY_TYPE);
                node.Set(this.CreateArray(item));
                ret_array.push(node);
            }
            else if (typeof item === 'number') {
                node = new jsonTree_1.JsonTreeNode(jsonTree_1.NodeTypes.NUM_TYPE);
                node.Set(val);
                ret_array.push(node);
            }
            else if (typeof item === 'string') {
                node = new jsonTree_1.JsonTreeNode(jsonTree_1.NodeTypes.STR_TYPE);
                node.Set(val);
                ret_array.push(node);
            }
            else if (typeof item === 'boolean') {
                node = new jsonTree_1.JsonTreeNode(jsonTree_1.NodeTypes.BOOL_TYPE);
                node.Set(val);
                ret_array.push(node);
            }
            else if (item === null) {
                node = new jsonTree_1.JsonTreeNode(jsonTree_1.NodeTypes.NULL_TYPE);
                node.Set(null);
                ret_array.push(node);
            }
            else {
                node = new jsonTree_1.JsonTreeNode(jsonTree_1.NodeTypes.ROOT_TYPE);
                this.ReadTree(item, node);
                ret_array.push(node);
            }
        });
        return ret_array;
    }
    ReadTree(tree, json_tree) {
        for (let obj of Object.entries(tree)) {
            const key = obj[0];
            const val = obj[1];
            let node;
            if (val instanceof Array) {
                node = new jsonTree_1.JsonTreeNode(jsonTree_1.NodeTypes.ARRAY_TYPE);
                node.Set(this.CreateArray(val));
            }
            else if (typeof val === 'number') {
                node = new jsonTree_1.JsonTreeNode(jsonTree_1.NodeTypes.NUM_TYPE);
                node.Set(val);
            }
            else if (typeof val === 'string') {
                node = new jsonTree_1.JsonTreeNode(jsonTree_1.NodeTypes.STR_TYPE);
                node.Set(val);
            }
            else if (typeof val === 'boolean') {
                node = new jsonTree_1.JsonTreeNode(jsonTree_1.NodeTypes.BOOL_TYPE);
                node.Set(val);
            }
            else if (val === null) {
                node = new jsonTree_1.JsonTreeNode(jsonTree_1.NodeTypes.NULL_TYPE);
                node.Set(null);
            }
            else {
                node = new jsonTree_1.JsonTreeNode(jsonTree_1.NodeTypes.ROOT_TYPE);
                this.ReadTree(val, node);
            }
            json_tree.AddChild(key, node);
        }
    }
    Save() {
        let tree = this.m_tree_root.toString();
        fs_1.default.writeFileSync(this.m_file_path, tree);
    }
    GetJsonTreeRoot() {
        return this.m_tree_root;
    }
}
exports.Disk = Disk;
Disk.m_disk = null;
//# sourceMappingURL=disk.js.map