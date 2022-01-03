import fs from 'fs'
import path from 'path'
import { JsonTreeNode, NodeTypes } from './jsonTree'

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
        this.ReadTree(tree, this.m_tree_root)
        console.log("done building tree")
    }

    private CreateArray(val: Array<any>): Array<JsonTreeNode> {
        const ret_array = new Array<JsonTreeNode>()

        val.forEach((item) => {
            let node: JsonTreeNode
            if (item instanceof Array) {
                node = new JsonTreeNode(NodeTypes.ARRAY_TYPE)
                node.Set(this.CreateArray(item))
                ret_array.push(node)
            }
            else if (typeof item === 'number') {
                node = new JsonTreeNode(NodeTypes.NUM_TYPE)
                node.Set(val)
                ret_array.push(node)
            }
            else if (typeof item === 'string') {
                node = new JsonTreeNode(NodeTypes.STR_TYPE)
                node.Set(val)
                ret_array.push(node)
            }
            else if (typeof item === 'boolean') {
                node = new JsonTreeNode(NodeTypes.BOOL_TYPE)
                node.Set(val)
                ret_array.push(node)
            }
            else if (item === null) {
                node = new JsonTreeNode(NodeTypes.NULL_TYPE)
                node.Set(null)
                ret_array.push(node)
            }
            else {
                node = new JsonTreeNode(NodeTypes.ROOT_TYPE)
                this.ReadTree(item, node)
                ret_array.push(node)
            }
        })

        return ret_array
    }

    private ReadTree(tree: any, json_tree: JsonTreeNode) {
        for(let obj of Object.entries(tree)) {
            const key: string = obj[0]
            const val: unknown = obj[1]
            let node: JsonTreeNode

            if (val instanceof Array) {
                node = new JsonTreeNode(NodeTypes.ARRAY_TYPE)
                node.Set(this.CreateArray(val))
            }
            else if (typeof val === 'number') {
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
            else {
                node = new JsonTreeNode(NodeTypes.ROOT_TYPE)
                this.ReadTree(val, node)
            }

            json_tree.AddChild(key, node)
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