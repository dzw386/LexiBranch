import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  addChild,
  createEmptyTree,
  createNode,
  MetadataOperationError,
  TreeOperationError,
} from '../domain/tree'
import { createInitialTree, getInitialTree, useTreeStore } from './store'
import { saveTree } from './persistence'
import { createTreeHistory } from './history'

function resetStore(): void {
  useTreeStore.setState({
    tree: createEmptyTree(),
    history: createTreeHistory(),
    selectedNodeId: null,
    pendingMoveNodeId: null,
    collapsedNodeIds: [],
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

  it('undoes and redoes every tree edit, including imports and deletions', () => {
    useTreeStore.setState({
      tree: createInitialTree(),
      history: createTreeHistory(),
    })
    const rootId = useTreeStore.getState().tree.rootId

    function expectUndoRedo(edit: () => void): void {
      const previousTree = useTreeStore.getState().tree
      edit()
      const editedTree = useTreeStore.getState().tree

      expect(editedTree).not.toBe(previousTree)

      useTreeStore.getState().undo()
      expect(useTreeStore.getState().tree).toBe(previousTree)

      useTreeStore.getState().redo()
      expect(useTreeStore.getState().tree).toBe(editedTree)
    }

    expectUndoRedo(() =>
      useTreeStore.getState().setLabel('germanic', 'North Germanic'),
    )
    expectUndoRedo(() =>
      useTreeStore.getState().setBranchLength('germanic', 0.9),
    )
    expectUndoRedo(() =>
      useTreeStore.getState().addMetadata('germanic', 'iso', 'gm'),
    )
    expectUndoRedo(() =>
      useTreeStore
        .getState()
        .updateMetadata('germanic', 'branch', 'group', 'West'),
    )
    expectUndoRedo(() =>
      useTreeStore.getState().removeMetadata('germanic', 'group'),
    )
    expectUndoRedo(() =>
      useTreeStore.getState().addChild(rootId, {
        id: 'history-child',
        label: 'History child',
      }),
    )
    expectUndoRedo(() => {
      useTreeStore.getState().startMoveSubtree('history-child')
      useTreeStore.getState().completeMoveSubtree('slavic')
    })
    expectUndoRedo(() =>
      useTreeStore.getState().reorderChild(rootId, 'slavic', 'up'),
    )
    expectUndoRedo(() => useTreeStore.getState().removeSubtree('history-child'))

    const importedRoot = createNode({ id: 'imported-root', label: 'Imported' })
    expectUndoRedo(() =>
      useTreeStore.getState().importTree({
        rootId: importedRoot.id,
        nodes: { [importedRoot.id]: importedRoot },
      }),
    )
    expectUndoRedo(() => useTreeStore.getState().newTree('New tree'))
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

  it('toggles subtree collapse as view state without touching the tree or history', () => {
    const store = useTreeStore.getState()
    const rootId = store.tree.rootId

    store.addChild(rootId, { id: 'branch' })
    store.addChild('branch', { id: 'leaf' })
    store.selectNode('leaf')

    const before = useTreeStore.getState()

    store.toggleSubtreeCollapsed('branch')

    let state = useTreeStore.getState()
    expect(state.collapsedNodeIds).toEqual(['branch'])
    expect(state.tree).toBe(before.tree)
    expect(state.history).toBe(before.history)
    expect(state.selectedNodeId).toBe('branch')

    store.toggleSubtreeCollapsed('branch')

    state = useTreeStore.getState()
    expect(state.collapsedNodeIds).toEqual([])
    expect(state.selectedNodeId).toBe('branch')
  })

  it('ignores collapse attempts on leaves, unknown nodes, and during a move', () => {
    const store = useTreeStore.getState()
    const rootId = store.tree.rootId

    store.addChild(rootId, { id: 'leaf' })
    store.addChild(rootId, { id: 'branch' })

    store.toggleSubtreeCollapsed('leaf')
    store.toggleSubtreeCollapsed('missing')
    expect(useTreeStore.getState().collapsedNodeIds).toEqual([])

    store.startMoveSubtree('leaf')
    store.toggleSubtreeCollapsed('branch')
    expect(useTreeStore.getState().collapsedNodeIds).toEqual([])
  })

  it('expands a collapsed parent when a child is added or moved under it', () => {
    const store = useTreeStore.getState()
    const rootId = store.tree.rootId

    store.addChild(rootId, { id: 'branch' })
    store.addChild(rootId, { id: 'target' })
    store.addChild('target', { id: 'target-leaf' })
    store.addChild('branch', { id: 'leaf' })
    store.toggleSubtreeCollapsed('branch')
    store.toggleSubtreeCollapsed('target')

    store.addChild('branch', { id: 'new-leaf' })
    expect(useTreeStore.getState().collapsedNodeIds).toEqual(['target'])

    store.startMoveSubtree('new-leaf')
    store.completeMoveSubtree('target')
    expect(useTreeStore.getState().collapsedNodeIds).toEqual([])
  })

  it('prunes collapsed nodes when their subtree is removed', () => {
    const store = useTreeStore.getState()
    const rootId = store.tree.rootId

    store.addChild(rootId, { id: 'branch' })
    store.addChild('branch', { id: 'leaf' })
    store.addChild('leaf', { id: 'subleaf' })
    store.toggleSubtreeCollapsed('leaf')
    store.toggleSubtreeCollapsed('branch')
    expect(useTreeStore.getState().collapsedNodeIds).toEqual(['leaf', 'branch'])

    store.removeSubtree('branch')

    expect(useTreeStore.getState().collapsedNodeIds).toEqual([])
  })

  it('clears collapsed nodes when starting a new tree or importing', () => {
    const store = useTreeStore.getState()
    const rootId = store.tree.rootId

    store.addChild(rootId, { id: 'branch' })
    store.addChild('branch', { id: 'leaf' })
    store.toggleSubtreeCollapsed('branch')
    store.newTree('New tree')
    expect(useTreeStore.getState().collapsedNodeIds).toEqual([])

    const newRootId = useTreeStore.getState().tree.rootId
    store.addChild(newRootId, { id: 'new-branch' })
    store.addChild('new-branch', { id: 'new-leaf' })
    store.toggleSubtreeCollapsed('new-branch')
    expect(useTreeStore.getState().collapsedNodeIds).toEqual(['new-branch'])

    const importedRoot = createNode({ id: 'imported-root' })
    store.importTree({
      rootId: importedRoot.id,
      nodes: { [importedRoot.id]: importedRoot },
    })
    expect(useTreeStore.getState().collapsedNodeIds).toEqual([])
  })

  it('drops collapsed ids that disappear while undoing or redoing', () => {
    const store = useTreeStore.getState()
    const rootId = store.tree.rootId

    store.addChild(rootId, { id: 'branch' })
    store.addChild('branch', { id: 'leaf' })
    store.toggleSubtreeCollapsed('branch')
    expect(useTreeStore.getState().collapsedNodeIds).toEqual(['branch'])

    store.undo()
    store.undo()

    expect(useTreeStore.getState().tree.nodes.branch).toBeUndefined()
    expect(useTreeStore.getState().collapsedNodeIds).toEqual([])

    store.redo()
    store.redo()

    expect(useTreeStore.getState().tree.nodes.branch).toBeDefined()
    expect(useTreeStore.getState().collapsedNodeIds).toEqual([])
  })

  it('un-collapses a node that loses its last child through undo', () => {
    const store = useTreeStore.getState()
    const rootId = store.tree.rootId

    store.addChild(rootId, { id: 'branch' })
    store.addChild('branch', { id: 'leaf' })
    store.toggleSubtreeCollapsed('branch')
    expect(useTreeStore.getState().collapsedNodeIds).toEqual(['branch'])

    store.undo()

    const state = useTreeStore.getState()
    expect(state.tree.nodes.branch).toBeDefined()
    expect(state.tree.nodes.branch?.childIds).toEqual([])
    expect(state.collapsedNodeIds).toEqual([])
  })

  it('selects a collapsed ancestor when undo hides the selected node', () => {
    const store = useTreeStore.getState()
    const rootId = store.tree.rootId

    store.addChild(rootId, { id: 'branch' })
    store.addChild('branch', { id: 'c1' })
    store.addChild('branch', { id: 'c2' })
    store.startMoveSubtree('c1')
    store.completeMoveSubtree(rootId)
    store.toggleSubtreeCollapsed('branch')
    store.selectNode('c1')

    store.undo()

    const state = useTreeStore.getState()
    expect(state.tree.nodes.c1?.parentId).toBe('branch')
    expect(state.collapsedNodeIds).toEqual(['branch'])
    expect(state.selectedNodeId).toBe('branch')
  })

  it('selects the outermost collapsed ancestor when undo hides the selected node', () => {
    const store = useTreeStore.getState()
    const rootId = store.tree.rootId

    store.addChild(rootId, { id: 'branch' })
    store.addChild('branch', { id: 'subbranch' })
    store.addChild('subbranch', { id: 'leaf' })
    store.addChild('subbranch', { id: 'other-leaf' })
    store.startMoveSubtree('leaf')
    store.completeMoveSubtree(rootId)
    store.toggleSubtreeCollapsed('subbranch')
    store.toggleSubtreeCollapsed('branch')
    store.selectNode('leaf')

    store.undo()

    const state = useTreeStore.getState()
    expect(state.tree.nodes.leaf?.parentId).toBe('subbranch')
    expect(state.collapsedNodeIds).toEqual(['subbranch', 'branch'])
    expect(state.selectedNodeId).toBe('branch')
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
