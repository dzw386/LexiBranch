import { describe, expect, it } from 'vitest'
import { addChild, createEmptyTree } from '../domain/tree'
import type { PhyloTree } from '../domain/types'
import { ANALYSIS_MODULES } from './registry'

function createTree(): PhyloTree {
  let tree = createEmptyTree()
  const rootId = tree.rootId

  tree = addChild(tree, rootId, {
    id: 'branch',
    branchLength: 0.5,
  })
  tree = addChild(tree, 'branch', {
    id: 'leaf',
    branchLength: 1.5,
  })

  return tree
}

describe('ANALYSIS_MODULES', () => {
  it('registers the tree statistics module', () => {
    const moduleIds = ANALYSIS_MODULES.map((module) => module.id)

    expect(moduleIds).toContain('tree-stats')
    expect(new Set(moduleIds).size).toBe(moduleIds.length)
  })

  it('runs the registered module against a tree snapshot', () => {
    const treeStats = ANALYSIS_MODULES.find(
      (module) => module.id === 'tree-stats',
    )

    expect(treeStats?.run({ tree: createTree() })).toEqual({
      nodeCount: 3,
      maxDepth: 2,
      averageBranchLength: 1,
    })
  })

  it('provides a panel for the tree statistics module', () => {
    const treeStats = ANALYSIS_MODULES.find(
      (module) => module.id === 'tree-stats',
    )

    expect(treeStats?.Panel).toBeDefined()
  })
})
