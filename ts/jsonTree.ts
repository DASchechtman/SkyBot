export enum NodeTypes {ROOT_TYPE, STR_TYPE, NUM_TYPE, BOOL_TYPE, ARRAY_TYPE, NULL_TYPE}
export type JsonArray = Array<JsonTreeNode>
export type JsonMap = Map<string, JsonTreeNode>
export type JsonType = string | number | boolean | JsonArray | null | JsonMap

export class JsonTreeNode {
    private m_type: NodeTypes
    private m_data: any = null

    constructor(type: NodeTypes) {
        this.m_type = type

        switch(this.m_type) {
            case NodeTypes.ROOT_TYPE: {
                this.m_data = new Map<string, JsonTreeNode>()
                break
            }
            case NodeTypes.ARRAY_TYPE: {
                this.m_data = new Array<JsonTreeNode>()
                break
            }
            case NodeTypes.BOOL_TYPE: {
                this.m_data = false
                break
            }
            case NodeTypes.NUM_TYPE: {
                this.m_data = 0
                break
            }
            case NodeTypes.STR_TYPE: {
                this.m_data = ""
                break
            }
        }
    }

    private GetDataType(data: JsonType): NodeTypes | undefined {
        let type = undefined

        if(typeof data === 'string') {
            type = NodeTypes.STR_TYPE
        }
        else if (typeof data === 'number') {
            type = NodeTypes.NUM_TYPE
        }
        else if (typeof data === 'boolean') {
            type = NodeTypes.BOOL_TYPE
        }
        else if (data === null) {
            type = NodeTypes.NULL_TYPE
        }
        else if (data instanceof Array) {
            type = NodeTypes.ARRAY_TYPE
        }
        else if (data instanceof Map) {
            type = NodeTypes.ROOT_TYPE
        }

        return type
    }

    public Type(): NodeTypes {
        return this.m_type
    }

    public Get(): JsonType | undefined {
        switch(this.m_type) {
            case NodeTypes.BOOL_TYPE: {
                return this.m_data as boolean
            }
            case NodeTypes.NUM_TYPE: {
                return this.m_data as number
            }
            case NodeTypes.STR_TYPE: {
                return this.m_data as string
            }
            case NodeTypes.NULL_TYPE: {
                return null
            }
            default: {
                return undefined
            }
        }
    }

    public Set(new_data: JsonType): boolean {
        const data_type = this.GetDataType(new_data)
        if (data_type && data_type === this.m_type) {
            this.m_data = new_data
            return true
        }
        return false
    }

    public SetAt(index: number, data: JsonType) {
        let type = this.GetDataType(data)
        if (type === undefined) {
            type = NodeTypes.NULL_TYPE
            data = null
        }

        const node = new JsonTreeNode(type)
        node.Set(data)

        if (this.m_type === NodeTypes.ARRAY_TYPE) {
            (this.m_data as JsonArray)[index] = node
        }
    }

    public GetAt(index: number) {
        let ret = undefined
        if (this.m_type === NodeTypes.ARRAY_TYPE) {
            ret = (this.m_data as JsonArray)[index]
        }
        return ret
    }

    public ArraySize() {
        let size = -1
        if (this.m_type === NodeTypes.ARRAY_TYPE) {
            size = (this.m_data as JsonArray).length
        }
        return size
    }

    public GetAllKeys(): string[] {
        const keys: string[] = []
        if(this.m_type === NodeTypes.ROOT_TYPE) {
            for(let entry of (this.m_data as JsonMap)) {
                keys.push(entry[0])
            }
        }
        return keys
    }

    public GetAllVals(): JsonTreeNode[] {
        const vals: JsonTreeNode[] = []
        if (this.m_type === NodeTypes.ROOT_TYPE) {
            for(let entry of (this.m_data as JsonMap)) {
                vals.push(entry[1])
            }
        }
        return vals
    }

    public RemoveAt(index: number) {
        if (this.m_type === NodeTypes.ARRAY_TYPE) {
            (this.m_data as JsonArray).splice(index, 1)
        }
    }

    public PushTo(data: JsonType) {
        let type = this.GetDataType(data)
        if (type === undefined) {
            type = NodeTypes.NULL_TYPE
            data = null
        }

        if (this.m_type === NodeTypes.ARRAY_TYPE) {
            const node = new JsonTreeNode(type);
            node.Set(data);
            (this.m_data as JsonArray).push(node)
        }
    }

    public Filter(func: (item: JsonTreeNode) => boolean) {
        if (this.m_type === NodeTypes.ARRAY_TYPE) {
            this.m_data = (this.m_data as JsonArray).filter((item) => {return func(item)})
        }
    }

    public Find(func: (item: JsonTreeNode) => boolean) {
        let ret = undefined
        if (this.m_type === NodeTypes.ARRAY_TYPE) {
            ret = (this.m_data as JsonArray).find(func)
        }
        return ret
    }

    public GetNode(node_name: string): JsonTreeNode | undefined {
        let child_node: JsonTreeNode | undefined = undefined

        if (this.m_type === NodeTypes.ROOT_TYPE) {
            let children = this.m_data as Map<string, JsonTreeNode>
            if (children.has(node_name)) {
                child_node = children.get(node_name)!!
            }
        }

        return child_node
    }

    public AddChild(child_name: string, child: JsonTreeNode): boolean {
        if(this.m_type === NodeTypes.ROOT_TYPE) {
            (this.m_data as Map<string, JsonTreeNode>).set(child_name, child)
            return true
        }
        return false
    }

    public CreateChild(child_name: string, data: JsonType | Map<string, JsonTreeNode>): JsonTreeNode | undefined {
        let new_child: JsonTreeNode

        if (this.m_type !== NodeTypes.ROOT_TYPE) {
            return undefined
        }

        if (data instanceof Map) {
            new_child = new JsonTreeNode(NodeTypes.ROOT_TYPE)
            data.forEach((val, key) => {
                new_child.AddChild(key, val)
            })
        }
        else if (data instanceof Array) {
            new_child = new JsonTreeNode(NodeTypes.ARRAY_TYPE)
            new_child.Set(data)
        }
        else if (typeof data === 'number') {
            new_child = new JsonTreeNode(NodeTypes.NUM_TYPE)
            new_child.Set(data)
        }
        else if (typeof data === 'string') {
            new_child = new JsonTreeNode(NodeTypes.STR_TYPE)
            new_child.Set(data)
        }
        else if (typeof data === "boolean") {
            new_child = new JsonTreeNode(NodeTypes.BOOL_TYPE)
            new_child.Set(data)
        }
        else {
            new_child = new JsonTreeNode(NodeTypes.NULL_TYPE)
            new_child.Set(null)
        }

        (this.m_data as Map<string, JsonTreeNode>).set(child_name, new_child)
        return new_child
    }

    public DeleteChild(child_name: string): boolean {
        if(this.m_type === NodeTypes.ROOT_TYPE) {
            const children = (this.m_data as Map<string, JsonTreeNode>)
            return children.delete(child_name)
        }
        return false
    }

    public HasNode(node_name: string): boolean {
        return this.GetNode(node_name) !== undefined
    }

    public toString() {
        let str_representation = ""
        const container_chars: string[] = []
        let brackets = ""

        switch(this.m_type) {
            case NodeTypes.ARRAY_TYPE: {
                brackets = "[]"
                container_chars.push(brackets[0]);
                for(let i = 0; i < (this.m_data as Array<JsonTreeNode>).length; i++) {
                    let node = (this.m_data as Array<JsonType>)[0]
                    if (node === null) {
                        node = "null"
                    }

                    container_chars.push(node.toString(), ',')
                }
                
                if (container_chars.length > 1) {
                    const last_index = container_chars.length-1
                    container_chars[last_index] = brackets[1]
                }
                else {
                   container_chars.push(brackets[1])
                }

                str_representation = container_chars.join()
                break
            }
            case NodeTypes.ROOT_TYPE: {
                brackets = "{}"
                container_chars.push(brackets[0]);
                (this.m_data as Map<string, JsonTreeNode>).forEach((node, key) => {
                    container_chars.push(key, ':', node.toString(), ',')
                })

                if (container_chars.length > 1) {
                    const last_index = container_chars.length-1
                    container_chars[last_index] = brackets[1]
                }
                else {
                   container_chars.push(brackets[1])
                }

                str_representation = container_chars.join()
                break
            }
            case NodeTypes.NULL_TYPE: {
                str_representation = "null"
                break
            }
            case NodeTypes.STR_TYPE: {
                if ((this.m_data as string).length === 0) {
                    return '\"\"'
                }
                else {
                    return `"${this.m_data}"`
                }
            }
            default: {
                str_representation = this.m_data.toString()
            }
        }

        return str_representation
    }

}