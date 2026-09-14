import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  createEmptyTree,
  MetadataOperationError,
  TreeOperationError,
} from '../domain/tree'
import { useTreeStore } from './store'

function resetStore(): void {
  useTreeStore.setState({
    tree: createEmptyTree(),
    selectedNodeId: null,
    pendingMoveNodeId: null,
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

    store.moveSubtree('leaf', rootId)
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

    expect(() => store.moveSubtree('branch', 'leaf')).toThrow(
      TreeOperationError,
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
