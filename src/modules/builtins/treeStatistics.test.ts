import { describe, expect, it } from 'vitest'
import { addChild, createEmptyTree } from '../../domain/tree'
import type { PhyloTree } from '../../domain/types'
import { computeTreeStatistics } from './treeStatistics'

function createTree(): PhyloTree {
  let tree = createEmptyTree()
  const rootId = tree.rootId

  tree = addChild(tree, rootId, {
    id: 'branch',
    label: 'Branch',
    branchLength: 0.5,
  })
  tree = addChild(tree, 'branch', {
    id: 'leaf',
    label: 'Leaf',
    branchLength: 1.5,
  })
  tree = addChild(tree, rootId, {
    id: 'unweighted',
    label: 'Unweighted',
  })
  tree = addChild(tree, rootId, {
    id: 'short',
    label: 'Short',
    branchLength: 0.1,
  })

  return tree
}

describe('computeTreeStatistics', () => {
  it('reports zero depth and no average for a single-node tree', () => {
    expect(computeTreeStatistics(createEmptyTree())).toEqual({
      nodeCount: 1,
      maxDepth: 0,
      averageBranchLength: null,
    })
  })

  it('counts nodes, finds the deepest path, and averages defined lengths', () => {
    const statistics = computeTreeStatistics(createTree())

    expect(statistics.nodeCount).toBe(5)
    expect(statistics.maxDepth).toBe(2)
    expect(statistics.averageBranchLength).toBeCloseTo(0.7)
  })

  it('measures depth in edges from the root along the longest path', () => {
    let tree = createEmptyTree()
    const rootId = tree.rootId

    tree = addChild(tree, rootId, {
      id: 'one',
      branchLength: 1,
    })
    tree = addChild(tree, 'one', {
      id: 'two',
      branchLength: 2,
    })
    tree = addChild(tree, 'two', {
      id: 'three',
      branchLength: 3,
    })

    expect(computeTreeStatistics(tree)).toEqual({
      nodeCount: 4,
      maxDepth: 3,
      averageBranchLength: 2,
    })
  })

  it('returns a null average when no branch lengths are set', () => {
    let tree = createEmptyTree()
    const rootId = tree.rootId

    tree = addChild(tree, rootId, { id: 'a' })
    tree = addChild(tree, 'a', { id: 'b' })

    expect(computeTreeStatistics(tree)).toEqual({
      nodeCount: 3,
      maxDepth: 2,
      averageBranchLength: null,
    })
  })

  it('does not mutate the input tree', () => {
    const tree = createTree()
    const snapshot = structuredClone(tree)

    computeTreeStatistics(tree)

    expect(tree).toEqual(snapshot)
  })
})
