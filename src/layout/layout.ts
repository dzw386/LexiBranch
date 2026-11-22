import type { Edge, Node } from '@xyflow/react'
import type { MetadataValue, PhyloTree } from '../domain/types'

export interface NestedTreeNode {
  id: string
  label: string
  branchLength?: number | null
  metadata?: Record<string, MetadataValue>
  children?: NestedTreeNode[]
}

export type LayoutMode = 'cladogram' | 'phylogram'

export interface LayoutOptions {
  mode?: LayoutMode
  horizontalGap?: number
  verticalSpacing?: number
  nodeWidths?: Record<string, number>
  collapsedIds?: ReadonlySet<string>
}

export type PhyloNodeData = {
  label: string
  metadata: Record<string, MetadataValue>
  collapsed?: boolean
  hiddenDescendantCount?: number
  hasChildren?: boolean
  highlighted?: boolean
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
const PHYLOGRAM_TARGET_WIDTH = 1200
const PHYLOGRAM_FALLBACK_SCALE = 240
const MISSING_BRANCH_LENGTH = 1
const MIN_PHYLOGRAM_BRANCH = 24

function countDescendants(children: readonly NestedTreeNode[]): number {
  let count = 0
  const pending = [...children]

  while (pending.length > 0) {
    const current = pending.pop()

    if (current === undefined) {
      continue
    }

    count += 1
    pending.push(...(current.children ?? []))
  }

  return count
}

export function layoutTree(
  tree: NestedTreeNode,
  options: LayoutOptions = {},
): FlowLayout {
  const mode = options.mode ?? 'cladogram'
  const horizontalGap = options.horizontalGap ?? DEFAULT_HORIZONTAL_GAP
  const verticalSpacing = options.verticalSpacing ?? DEFAULT_VERTICAL_SPACING
  const nodeWidths = options.nodeWidths ?? {}
  const collapsedIds = options.collapsedIds ?? new Set<string>()
  const maxWidthByDepth: number[] = []
  const yById = new Map<string, number>()
  let maxCumulative = 0
  let leafIndex = 0

  function measure(
    node: NestedTreeNode,
    depth: number,
    cumulative: number,
  ): number {
    maxWidthByDepth[depth] = Math.max(
      maxWidthByDepth[depth] ?? 0,
      nodeWidths[node.id] ?? DEFAULT_NODE_WIDTH,
    )
    maxCumulative = Math.max(maxCumulative, cumulative)

    const children = collapsedIds.has(node.id) ? [] : (node.children ?? [])
    const childYs = children.map((child) =>
      measure(
        child,
        depth + 1,
        cumulative + (child.branchLength ?? MISSING_BRANCH_LENGTH),
      ),
    )
    const y =
      childYs.length === 0
        ? leafIndex++ * verticalSpacing
        : (childYs[0] + childYs[childYs.length - 1]) / 2

    yById.set(node.id, y)
    return y
  }

  measure(tree, 0, 0)

  const phylogramScale =
    maxCumulative > 0
      ? PHYLOGRAM_TARGET_WIDTH / maxCumulative
      : PHYLOGRAM_FALLBACK_SCALE

  function childX(
    parent: NestedTreeNode,
    child: NestedTreeNode,
    depth: number,
    parentX: number,
  ): number {
    if (mode === 'phylogram') {
      const parentWidth = nodeWidths[parent.id] ?? DEFAULT_NODE_WIDTH
      const sharesParentRow = yById.get(child.id) === yById.get(parent.id)
      const floor = sharesParentRow
        ? parentWidth + MIN_PHYLOGRAM_BRANCH
        : MIN_PHYLOGRAM_BRANCH

      return (
        parentX +
        Math.max(
          (child.branchLength ?? MISSING_BRANCH_LENGTH) * phylogramScale,
          floor,
        )
      )
    }

    return (
      parentX + (maxWidthByDepth[depth] ?? DEFAULT_NODE_WIDTH) + horizontalGap
    )
  }

  const nodes: PhyloFlowNode[] = []
  const edges: PhyloFlowEdge[] = []

  function visit(node: NestedTreeNode, depth: number, x: number): void {
    const allChildren = node.children ?? []
    const isCollapsed = allChildren.length > 0 && collapsedIds.has(node.id)
    const children = isCollapsed ? [] : allChildren
    const parentRight = x + (nodeWidths[node.id] ?? DEFAULT_NODE_WIDTH)

    nodes.push({
      id: node.id,
      position: { x, y: yById.get(node.id) ?? 0 },
      type: 'phylo',
      data: {
        label: node.label,
        metadata: { ...node.metadata },
        collapsed: isCollapsed,
        hiddenDescendantCount: isCollapsed ? countDescendants(allChildren) : 0,
        hasChildren: allChildren.length > 0,
      },
      sourcePosition: 'left' as PhyloFlowNode['sourcePosition'],
      targetPosition: 'left' as PhyloFlowNode['targetPosition'],
    })

    const childPositions = children.map((child) => ({
      child,
      x: childX(node, child, depth, x),
    }))

    for (const { child, x: childPositionX } of childPositions) {
      edges.push({
        id: `${node.id}-${child.id}`,
        source: node.id,
        target: child.id,
        type: 'phylo',
        data: {
          branchLength: child.branchLength ?? null,
          branchLabelX: (parentRight + childPositionX) / 2,
        },
      })
    }

    for (const { child, x: childPositionX } of childPositions) {
      visit(child, depth + 1, childPositionX)
    }
  }

  visit(tree, 0, 0)

  return { nodes, edges }
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
