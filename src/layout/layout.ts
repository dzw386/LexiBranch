import type { Edge, Node } from '@xyflow/react'
import type { MetadataValue } from '../domain/types'

export interface NestedTreeNode {
  id: string
  label: string
  branchLength?: number | null
  metadata?: Record<string, MetadataValue>
  children?: NestedTreeNode[]
}

export interface LayoutOptions {
  horizontalSpacing?: number
  verticalSpacing?: number
}

export type PhyloNodeData = {
  label: string
  metadata: Record<string, MetadataValue>
}

export type PhyloEdgeData = {
  branchLength: number | null
}

export type PhyloFlowNode = Node<PhyloNodeData, 'phylo'>
export type PhyloFlowEdge = Edge<PhyloEdgeData, 'phylo'>

export interface FlowLayout {
  nodes: PhyloFlowNode[]
  edges: PhyloFlowEdge[]
}

const DEFAULT_HORIZONTAL_SPACING = 240
const DEFAULT_VERTICAL_SPACING = 100

export function layoutTree(
  tree: NestedTreeNode,
  options: LayoutOptions = {},
): FlowLayout {
  const horizontalSpacing =
    options.horizontalSpacing ?? DEFAULT_HORIZONTAL_SPACING
  const verticalSpacing = options.verticalSpacing ?? DEFAULT_VERTICAL_SPACING
  const nodes: Array<PhyloFlowNode | undefined> = []
  const edges: PhyloFlowEdge[] = []
  let leafIndex = 0

  function visit(treeNode: NestedTreeNode, depth: number): number {
    const children = treeNode.children ?? []
    const nodeIndex = nodes.length

    nodes.push(undefined)
    for (const child of children) {
      edges.push({
        id: `${treeNode.id}-${child.id}`,
        source: treeNode.id,
        target: child.id,
        type: 'phylo',
        data: { branchLength: child.branchLength ?? null },
      })
    }

    const childPositions = children.map((child) => visit(child, depth + 1))
    const y =
      childPositions.length === 0
        ? leafIndex++ * verticalSpacing
        : (childPositions[0] + childPositions[childPositions.length - 1]) / 2

    nodes[nodeIndex] = {
      id: treeNode.id,
      position: { x: depth * horizontalSpacing, y },
      type: 'phylo',
      data: {
        label: treeNode.label,
        metadata: { ...treeNode.metadata },
      },
      sourcePosition: 'right' as PhyloFlowNode['sourcePosition'],
      targetPosition: 'left' as PhyloFlowNode['targetPosition'],
    }

    return y
  }

  visit(tree, 0)

  return {
    nodes: nodes.filter((node): node is PhyloFlowNode => node !== undefined),
    edges,
  }
}
