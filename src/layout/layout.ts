import type { Edge, Node } from '@xyflow/react'
import type { MetadataValue, PhyloTree } from '../domain/types'

export interface NestedTreeNode {
  id: string
  label: string
  branchLength?: number | null
  metadata?: Record<string, MetadataValue>
  children?: NestedTreeNode[]
}

export interface LayoutOptions {
  horizontalGap?: number
  verticalSpacing?: number
  nodeWidths?: Record<string, number>
}

export type PhyloNodeData = {
  label: string
  metadata: Record<string, MetadataValue>
}

export type PhyloEdgeData = {
  branchLength: number | null
  branchLabelX: number
}

export type PhyloFlowNode = Node<PhyloNodeData, 'phylo'>
export type PhyloFlowEdge = Edge<PhyloEdgeData, 'phylo'>

export interface FlowLayout {
  nodes: PhyloFlowNode[]
  edges: PhyloFlowEdge[]
}

const DEFAULT_HORIZONTAL_GAP = 96
const DEFAULT_VERTICAL_SPACING = 120
const DEFAULT_NODE_WIDTH = 144

export function layoutTree(
  tree: NestedTreeNode,
  options: LayoutOptions = {},
): FlowLayout {
  const horizontalGap = options.horizontalGap ?? DEFAULT_HORIZONTAL_GAP
  const verticalSpacing = options.verticalSpacing ?? DEFAULT_VERTICAL_SPACING
  const nodeWidths = options.nodeWidths ?? {}
  const maxWidthByDepth: number[] = []

  function measureWidths(node: NestedTreeNode, depth: number): void {
    const width = nodeWidths[node.id] ?? DEFAULT_NODE_WIDTH
    maxWidthByDepth[depth] = Math.max(maxWidthByDepth[depth] ?? 0, width)

    for (const child of node.children ?? []) {
      measureWidths(child, depth + 1)
    }
  }

  measureWidths(tree, 0)

  const xByDepth: number[] = [0]
  for (let depth = 1; depth <= maxWidthByDepth.length; depth += 1) {
    xByDepth[depth] =
      xByDepth[depth - 1] +
      (maxWidthByDepth[depth - 1] ?? DEFAULT_NODE_WIDTH) +
      horizontalGap
  }

  const nodes: Array<PhyloFlowNode | undefined> = []
  const edges: PhyloFlowEdge[] = []
  let leafIndex = 0

  function visit(treeNode: NestedTreeNode, depth: number): number {
    const children = treeNode.children ?? []
    const nodeIndex = nodes.length
    const parentX = xByDepth[depth] ?? 0
    const parentRight =
      parentX + (nodeWidths[treeNode.id] ?? DEFAULT_NODE_WIDTH)

    nodes.push(undefined)
    for (const child of children) {
      edges.push({
        id: `${treeNode.id}-${child.id}`,
        source: treeNode.id,
        target: child.id,
        type: 'phylo',
        data: {
          branchLength: child.branchLength ?? null,
          branchLabelX: (parentRight + (xByDepth[depth + 1] ?? 0)) / 2,
        },
      })
    }

    const childPositions = children.map((child) => visit(child, depth + 1))
    const y =
      childPositions.length === 0
        ? leafIndex++ * verticalSpacing
        : (childPositions[0] + childPositions[childPositions.length - 1]) / 2

    nodes[nodeIndex] = {
      id: treeNode.id,
      position: { x: parentX, y },
      type: 'phylo',
      data: {
        label: treeNode.label,
        metadata: { ...treeNode.metadata },
      },
      sourcePosition: 'left' as PhyloFlowNode['sourcePosition'],
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

export function layoutPhyloTree(
  tree: PhyloTree,
  options: LayoutOptions = {},
): FlowLayout {
  function toNestedTree(nodeId: string): NestedTreeNode {
    const node = tree.nodes[nodeId]

    if (node === undefined) {
      throw new Error(`Node "${nodeId}" does not exist.`)
    }

    return {
      id: node.id,
      label: node.label,
      branchLength: node.branchLength,
      metadata: { ...node.metadata },
      children: node.childIds.map(toNestedTree),
    }
  }

  return layoutTree(toNestedTree(tree.rootId), options)
}
