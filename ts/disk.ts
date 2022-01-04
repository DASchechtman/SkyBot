import fs from 'fs'
import path from 'path'
import { JsonArray, JsonTreeNode, NodeTypes } from './jsonTree'

export class Disk {
    private static m_disk: Disk | null = null
    private m_tree_root: JsonTreeNode
    private m_file_path: string

    public static Get(): Disk {
        if (this.m_disk === null) {
            this.m_disk = new Disk()
        }
        return this.m_disk
    }

    private constructor() {
        this.m_tree_root = new JsonTreeNode(NodeTypes.ROOT_TYPE)
        this.m_file_path = path.resolve(__dirname, '../guild_records.json')
        const tree = JSON.parse(fs.readFileSync(this.m_file_path, 'utf-8'))
        this.CreateTree(tree, this.m_tree_root)
        console.log("done building tree")
    }

    private CreateArray(val: Array<any>): Array<JsonTreeNode> {
        const ret_array: JsonArray = new Array()

        val.forEach((item) => {
            let node: JsonTreeNode
            let type: NodeTypes = NodeTypes.NULL_TYPE

            if (typeof item === 'number') { type = NodeTypes.NUM_TYPE }
            else if (typeof item === 'string') { type = NodeTypes.STR_TYPE }
            else if (typeof item === 'boolean') { type = NodeTypes.BOOL_TYPE }
            else if (item === null) { type = NodeTypes.NULL_TYPE }
            else if (item instanceof Array) { type = NodeTypes.ARRAY_TYPE }
            else { type = NodeTypes.ROOT_TYPE }

            switch (type) {
                case NodeTypes.ARRAY_TYPE: {
                    node = new JsonTreeNode(NodeTypes.ARRAY_TYPE)
                    node.Set(this.CreateArray(item))
                    ret_array.push(node)
                    break
                }
                case NodeTypes.ROOT_TYPE: {
                    node = new JsonTreeNode(NodeTypes.ROOT_TYPE)
                    this.CreateTree(item, node)
                    ret_array.push(node)
                    break
                }
                default: {
                    node = new JsonTreeNode(type)
                    node.Set(item)
                    ret_array.push(node)
                }
            }
        })

        return ret_array
    }

    private CreateTree(tree_root: any, json_tree_root: JsonTreeNode) {
        for (let obj of Object.entries(tree_root)) {
            const key: string = obj[0]
            const val: unknown = obj[1]
            let node: JsonTreeNode
            
            if (typeof val === 'number') {
                node = new JsonTreeNode(NodeTypes.NUM_TYPE)
                node.Set(val)
            }
            else if (typeof val === 'string') {
                node = new JsonTreeNode(NodeTypes.STR_TYPE)
                node.Set(val)
            }
            else if (typeof val === 'boolean') {
                node = new JsonTreeNode(NodeTypes.BOOL_TYPE)
                node.Set(val)
            }
            else if (val === null) {
                node = new JsonTreeNode(NodeTypes.NULL_TYPE)
                node.Set(null)
            }
            else if (val instanceof Array) {
                node = new JsonTreeNode(NodeTypes.ARRAY_TYPE)
                node.Set(this.CreateArray(val))
            }
            else {
                node = new JsonTreeNode(NodeTypes.ROOT_TYPE)
                this.CreateTree(val, node)
            }

            json_tree_root.AddChild(key, node)
        }
    }

    public Save(): void {
        let tree = this.m_tree_root.toString()
        fs.writeFileSync(this.m_file_path, tree)
    }

    public GetJsonTreeRoot(): JsonTreeNode {
        return this.m_tree_root
    }
}