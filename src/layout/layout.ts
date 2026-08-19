import type { Edge, Node } from '@xyflow/react'

export interface NestedTreeNode {
  id: string
  label: string
  children?: NestedTreeNode[]
}

export interface LayoutOptions {
  horizontalSpacing?: number
  verticalSpacing?: number
}

export interface FlowLayout {
  nodes: Node[]
  edges: Edge[]
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
  const nodes: Array<Node | undefined> = []
  const edges: Edge[] = []
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
        type: 'step',
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
      data: { label: treeNode.label },
      sourcePosition: 'right' as Node['sourcePosition'],
      targetPosition: 'left' as Node['targetPosition'],
    }

    return y
  }

  visit(tree, 0)

  return {
    nodes: nodes.filter((node): node is Node => node !== undefined),
    edges,
  }
}
