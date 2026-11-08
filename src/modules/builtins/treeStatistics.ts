import type { PhyloTree } from '../../domain/types'

export interface TreeStatistics {
  nodeCount: number
  maxDepth: number
  averageBranchLength: number | null
}

function computeMaxDepth(tree: PhyloTree): number {
  let maxDepth = 0
  const visited = new Set<string>()
  const pending = [{ id: tree.rootId, depth: 0 }]

  while (pending.length > 0) {
    const current = pending.pop()

    if (current === undefined || visited.has(current.id)) {
      continue
    }

    visited.add(current.id)
    maxDepth = Math.max(maxDepth, current.depth)

    const node = tree.nodes[current.id]

    if (node === undefined) {
      continue
    }

    for (const childId of node.childIds) {
      pending.push({ id: childId, depth: current.depth + 1 })
    }
  }

  return maxDepth
}

export function computeTreeStatistics(tree: PhyloTree): TreeStatistics {
  const nodes = Object.values(tree.nodes)
  const branchLengths = nodes
    .map((node) => node.branchLength)
    .filter((branchLength): branchLength is number => branchLength !== null)

  return {
    nodeCount: nodes.length,
    maxDepth: computeMaxDepth(tree),
    averageBranchLength:
      branchLengths.length === 0
        ? null
        : branchLengths.reduce((sum, branchLength) => sum + branchLength, 0) /
          branchLengths.length,
  }
}
