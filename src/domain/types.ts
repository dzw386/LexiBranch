export type MetadataValue = string | number | boolean

export interface TreeNodeData {
  id: string
  parentId: string | null
  childIds: string[]
  label: string
  branchLength: number | null
  metadata: Record<string, MetadataValue>
}

export interface PhyloTree {
  rootId: string
  nodes: Record<string, TreeNodeData>
}
