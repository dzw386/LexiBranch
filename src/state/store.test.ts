import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  addChild,
  createEmptyTree,
  createNode,
  MetadataOperationError,
  TreeOperationError,
} from '../domain/tree'
import { getInitialTree, useTreeStore } from './store'
import { saveTree } from './persistence'

function resetStore(): void {
  useTreeStore.setState({
    tree: createEmptyTree(),
    selectedNodeId: null,
    pendingMoveNodeId: null,
    viewMode: 'cladogram',
  })
}

describe('useTreeStore', () => {
  beforeEach(resetStore)
  afterEach(resetStore)

  it('performs domain operations and selects the affected node', () => {
    const store = useTreeStore.getState()
    const rootId = store.tree.rootId

    store.setLabel(rootId, 'Root')
    expect(useTreeStore.getState().selectedNodeId).toBe(rootId)

    store.addChild(rootId, { id: 'branch', label: 'Branch' })
    expect(useTreeStore.getState().selectedNodeId).toBe('branch')

    store.addChild('branch', { id: 'leaf', label: 'Leaf' })
    store.setBranchLength('leaf', 1.5)
    expect(useTreeStore.getState().tree.nodes.leaf?.branchLength).toBe(1.5)
    expect(useTreeStore.getState().selectedNodeId).toBe('leaf')

    store.startMoveSubtree('leaf')
    store.completeMoveSubtree(rootId)
    expect(useTreeStore.getState().tree.nodes[rootId]?.childIds).toEqual([
      'branch',
      'leaf',
    ])
    expect(useTreeStore.getState().selectedNodeId).toBe('leaf')

    store.reorderChild(rootId, 'leaf', 'up')
    expect(useTreeStore.getState().tree.nodes[rootId]?.childIds).toEqual([
      'leaf',
      'branch',
    ])
    expect(useTreeStore.getState().selectedNodeId).toBe('leaf')

    store.removeSubtree('leaf')
    expect(useTreeStore.getState().tree.nodes[rootId]?.childIds).toEqual([
      'branch',
    ])
    expect(useTreeStore.getState().selectedNodeId).toBe(rootId)
  })

  it('keeps state unchanged when a domain operation fails', () => {
    const store = useTreeStore.getState()
    const rootId = store.tree.rootId

    store.addChild(rootId, { id: 'branch' })
    store.addChild('branch', { id: 'leaf' })
    const before = useTreeStore.getState()

    expect(() => store.removeSubtree(rootId)).toThrow(
      'The root node cannot be removed.',
    )

    expect(useTreeStore.getState().tree).toBe(before.tree)
    expect(useTreeStore.getState().selectedNodeId).toBe(before.selectedNodeId)
  })

  it('tracks explicit selection changes', () => {
    const store = useTreeStore.getState()

    expect(store.selectedNodeId).toBeNull()
    store.selectNode('custom-selection')

    expect(useTreeStore.getState().selectedNodeId).toBe('custom-selection')
    store.selectNode(null)
    expect(useTreeStore.getState().selectedNodeId).toBeNull()
  })

  it('switches the view mode', () => {
    expect(useTreeStore.getState().viewMode).toBe('cladogram')

    useTreeStore.getState().setViewMode('phylogram')
    expect(useTreeStore.getState().viewMode).toBe('phylogram')

    useTreeStore.getState().setViewMode('cladogram')
    expect(useTreeStore.getState().viewMode).toBe('cladogram')
  })

  it('starts a blank tree and clears transient node state', () => {
    const store = useTreeStore.getState()
    const rootId = store.tree.rootId
    store.addChild(rootId, { id: 'branch', label: 'Branch' })
    store.startMoveSubtree('branch')

    useTreeStore.getState().newTree('New node')

    const state = useTreeStore.getState()
    expect(Object.keys(state.tree.nodes)).toHaveLength(1)
    expect(state.tree.nodes[state.tree.rootId]).toMatchObject({
      label: 'New node',
      parentId: null,
      childIds: [],
      branchLength: null,
    })
    expect(state.selectedNodeId).toBeNull()
    expect(state.pendingMoveNodeId).toBeNull()
  })

  it('uses a valid saved project as the initial tree', () => {
    const root = createEmptyTree()
    const savedTree = addChild(root, root.rootId, {
      id: 'saved-language',
      label: 'Saved language',
    })
    saveTree(savedTree)

    expect(getInitialTree()).toEqual(savedTree)
  })

  it('replaces the current tree on import and clears transient node state', () => {
    const store = useTreeStore.getState()
    const currentRootId = store.tree.rootId
    store.addChild(currentRootId, { id: 'branch' })
    store.selectNode('branch')
    store.startMoveSubtree('branch')

    const importedRoot = createNode({ id: 'imported-root', label: 'Imported' })
    const importedTree = {
      rootId: importedRoot.id,
      nodes: { [importedRoot.id]: importedRoot },
    }
    store.importTree(importedTree)

    expect(useTreeStore.getState().tree).toBe(importedTree)
    expect(useTreeStore.getState().selectedNodeId).toBeNull()
    expect(useTreeStore.getState().pendingMoveNodeId).toBeNull()
    expect(useTreeStore.getState().viewMode).toBe('cladogram')
  })

  it('tracks a pending move and completes it against a chosen parent', () => {
    const store = useTreeStore.getState()
    const rootId = store.tree.rootId

    store.addChild(rootId, { id: 'branch' })
    store.addChild(rootId, { id: 'target' })
    store.addChild('branch', { id: 'leaf' })

    store.startMoveSubtree('leaf')
    expect(useTreeStore.getState().pendingMoveNodeId).toBe('leaf')

    store.cancelMoveSubtree()
    expect(useTreeStore.getState().pendingMoveNodeId).toBeNull()
    expect(useTreeStore.getState().tree.nodes.branch?.childIds).toEqual([
      'leaf',
    ])

    store.startMoveSubtree('leaf')
    store.completeMoveSubtree('target')

    const state = useTreeStore.getState()
    expect(state.pendingMoveNodeId).toBeNull()
    expect(state.selectedNodeId).toBe('leaf')
    expect(state.tree.nodes.target?.childIds).toEqual(['leaf'])
    expect(state.tree.nodes.branch?.childIds).toEqual([])
  })

  it('keeps the pending move intact when completing it fails', () => {
    const store = useTreeStore.getState()
    const rootId = store.tree.rootId

    store.addChild(rootId, { id: 'branch' })
    store.addChild('branch', { id: 'leaf' })
    const before = useTreeStore.getState()

    store.startMoveSubtree('branch')

    expect(() => store.completeMoveSubtree('leaf')).toThrow(TreeOperationError)
    expect(useTreeStore.getState().tree).toBe(before.tree)
    expect(useTreeStore.getState().pendingMoveNodeId).toBe('branch')
  })

  it('ignores completing a move that was never started', () => {
    const store = useTreeStore.getState()
    const before = useTreeStore.getState()

    store.completeMoveSubtree(before.tree.rootId)

    expect(useTreeStore.getState().tree).toBe(before.tree)
    expect(useTreeStore.getState().pendingMoveNodeId).toBeNull()
  })

  it('clears the pending move when its node is removed', () => {
    const store = useTreeStore.getState()
    const rootId = store.tree.rootId

    store.addChild(rootId, { id: 'branch' })
    store.startMoveSubtree('branch')

    store.removeSubtree('branch')

    expect(useTreeStore.getState().pendingMoveNodeId).toBeNull()
  })

  it('round-trips typed metadata through the store', () => {
    const store = useTreeStore.getState()
    const rootId = store.tree.rootId

    store.addMetadata(rootId, 'iso', 'lxx')
    store.addMetadata(rootId, 'confidence', 0.98)
    store.addMetadata(rootId, 'attested', false)

    expect(useTreeStore.getState().tree.nodes[rootId]?.metadata).toEqual({
      iso: 'lxx',
      confidence: 0.98,
      attested: false,
    })

    store.updateMetadata(rootId, 'iso', 'languageCode', 'lxx')
    store.removeMetadata(rootId, 'attested')

    expect(useTreeStore.getState().tree.nodes[rootId]?.metadata).toEqual({
      languageCode: 'lxx',
      confidence: 0.98,
    })
    expect(useTreeStore.getState().selectedNodeId).toBe(rootId)
  })

  it('rejects duplicate metadata keys without changing the tree', () => {
    const store = useTreeStore.getState()
    const rootId = store.tree.rootId

    store.addMetadata(rootId, 'iso', 'lxx')
    const before = useTreeStore.getState().tree

    expect(() => store.addMetadata(rootId, 'iso', 'pl')).toThrow(
      MetadataOperationError,
    )
    expect(useTreeStore.getState().tree).toBe(before)
  })
})
