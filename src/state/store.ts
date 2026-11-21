import { create } from 'zustand'
import {
  addChild as addChildToTree,
  addMetadata as addMetadataToTree,
  createEmptyTree,
  createNode,
  getSubtreeIds,
  moveSubtree as moveSubtreeInTree,
  removeMetadata as removeMetadataFromTree,
  removeSubtree as removeSubtreeFromTree,
  reorderChild as reorderChildInTree,
  setBranchLength as setBranchLengthInTree,
  setLabel as setLabelInTree,
  updateMetadata as updateMetadataInTree,
  type CreateNodeOptions,
  type ReorderDirection,
} from '../domain/tree'
import type { MetadataValue, PhyloTree } from '../domain/types'
import type { LayoutMode } from '../layout/layout'
import {
  createTreeHistory,
  recordTreeChange,
  redoTreeChange,
  undoTreeChange,
  type TreeHistory,
} from './history'
import { loadSavedTree } from './persistence'

export type AddChildOptions = Omit<CreateNodeOptions, 'parentId'>

export interface TreeStore {
  tree: PhyloTree
  history: TreeHistory
  selectedNodeId: string | null
  pendingMoveNodeId: string | null
  collapsedNodeIds: string[]
  viewMode: LayoutMode
  selectNode: (nodeId: string | null) => void
  setViewMode: (viewMode: LayoutMode) => void
  toggleSubtreeCollapsed: (nodeId: string) => void
  undo: () => void
  redo: () => void
  newTree: (rootLabel: string) => void
  importTree: (tree: PhyloTree) => void
  addChild: (parentId: string, options?: AddChildOptions) => void
  removeSubtree: (nodeId: string) => void
  setLabel: (nodeId: string, label: string) => void
  setBranchLength: (nodeId: string, branchLength: number | null) => void
  addMetadata: (nodeId: string, key: string, value: MetadataValue) => void
  updateMetadata: (
    nodeId: string,
    previousKey: string,
    key: string,
    value: MetadataValue,
  ) => void
  removeMetadata: (nodeId: string, key: string) => void
  reorderChild: (
    parentId: string,
    childId: string,
    direction: ReorderDirection,
  ) => void
  startMoveSubtree: (nodeId: string) => void
  cancelMoveSubtree: () => void
  completeMoveSubtree: (newParentId: string) => void
}

function updateTreeHistory(
  state: TreeStore,
  tree: PhyloTree,
): Pick<TreeStore, 'tree' | 'history'> {
  return {
    tree,
    history: recordTreeChange(state.history, state.tree, tree),
  }
}

function findCollapsedAncestor(
  tree: PhyloTree,
  collapsedNodeIds: readonly string[],
  nodeId: string,
): string | null {
  const collapsedIds = new Set(collapsedNodeIds)
  let currentId: string | null = nodeId
  let collapsedAncestorId: string | null = null

  while (currentId !== null) {
    if (collapsedIds.has(currentId)) {
      collapsedAncestorId = currentId
    }

    currentId = tree.nodes[currentId]?.parentId ?? null
  }

  return collapsedAncestorId
}

function normalizeCollapsedState(
  tree: PhyloTree,
  selectedNodeId: string | null,
  collapsedNodeIds: readonly string[],
): Pick<TreeStore, 'selectedNodeId' | 'collapsedNodeIds'> {
  const validCollapsedNodeIds = collapsedNodeIds.filter(
    (nodeId) => (tree.nodes[nodeId]?.childIds.length ?? 0) > 0,
  )
  const nextSelectedNodeId =
    selectedNodeId !== null && Object.hasOwn(tree.nodes, selectedNodeId)
      ? (findCollapsedAncestor(tree, validCollapsedNodeIds, selectedNodeId) ??
        selectedNodeId)
      : null

  return {
    selectedNodeId: nextSelectedNodeId,
    collapsedNodeIds: validCollapsedNodeIds,
  }
}

export function createInitialTree(): PhyloTree {
  const root = createNode({ id: 'proto-language', label: 'Proto-language' })
  let tree: PhyloTree = {
    rootId: root.id,
    nodes: { [root.id]: root },
  }

  tree = addChildToTree(tree, root.id, {
    id: 'germanic',
    label: 'Germanic',
    branchLength: 0.8,
    metadata: { branch: 'West Germanic' },
  })
  tree = addChildToTree(tree, 'germanic', {
    id: 'english',
    label: 'English',
    branchLength: 0.4,
  })
  tree = addChildToTree(tree, 'germanic', {
    id: 'german',
    label: 'German',
    branchLength: 0.4,
  })
  tree = addChildToTree(tree, root.id, {
    id: 'slavic',
    label: 'Slavic',
    branchLength: 0.8,
  })
  tree = addChildToTree(tree, 'slavic', {
    id: 'polish',
    label: 'Polish',
    branchLength: 0.4,
  })
  tree = addChildToTree(tree, 'slavic', {
    id: 'russian',
    label: 'Russian',
    branchLength: 0.4,
  })

  return tree
}

export function getInitialTree(): PhyloTree {
  return loadSavedTree() ?? createInitialTree()
}

export const useTreeStore = create<TreeStore>((set) => ({
  tree: getInitialTree(),
  history: createTreeHistory(),
  selectedNodeId: null,
  pendingMoveNodeId: null,
  collapsedNodeIds: [],
  viewMode: 'cladogram',

  selectNode: (nodeId) => set({ selectedNodeId: nodeId }),

  setViewMode: (viewMode) => set({ viewMode }),

  toggleSubtreeCollapsed: (nodeId) =>
    set((state) => {
      if (state.pendingMoveNodeId !== null) {
        return state
      }

      const node = state.tree.nodes[nodeId]

      if (node === undefined) {
        return state
      }

      if (state.collapsedNodeIds.includes(nodeId)) {
        return {
          collapsedNodeIds: state.collapsedNodeIds.filter(
            (collapsedId) => collapsedId !== nodeId,
          ),
        }
      }

      if (node.childIds.length === 0) {
        return state
      }

      const hiddenIds = new Set(getSubtreeIds(state.tree, nodeId))

      return {
        collapsedNodeIds: [...state.collapsedNodeIds, nodeId],
        selectedNodeId:
          state.selectedNodeId !== null &&
          state.selectedNodeId !== nodeId &&
          hiddenIds.has(state.selectedNodeId)
            ? nodeId
            : state.selectedNodeId,
      }
    }),

  undo: () =>
    set((state) => {
      const transition = undoTreeChange(state.history, state.tree)

      if (transition === null) {
        return state
      }

      return {
        ...transition,
        ...normalizeCollapsedState(
          transition.tree,
          state.selectedNodeId,
          state.collapsedNodeIds,
        ),
        pendingMoveNodeId: null,
      }
    }),

  redo: () =>
    set((state) => {
      const transition = redoTreeChange(state.history, state.tree)

      if (transition === null) {
        return state
      }

      return {
        ...transition,
        ...normalizeCollapsedState(
          transition.tree,
          state.selectedNodeId,
          state.collapsedNodeIds,
        ),
        pendingMoveNodeId: null,
      }
    }),

  newTree: (rootLabel) => {
    const tree = createEmptyTree()

    set((state) => ({
      ...updateTreeHistory(state, setLabelInTree(tree, tree.rootId, rootLabel)),
      selectedNodeId: null,
      pendingMoveNodeId: null,
      collapsedNodeIds: [],
    }))
  },

  importTree: (tree) =>
    set((state) => ({
      ...updateTreeHistory(state, tree),
      selectedNodeId: null,
      pendingMoveNodeId: null,
      collapsedNodeIds: [],
    })),

  addChild: (parentId, options = {}) =>
    set((state) => {
      const tree = addChildToTree(state.tree, parentId, options)
      const childIds = tree.nodes[parentId]?.childIds

      return {
        ...updateTreeHistory(state, tree),
        selectedNodeId: childIds?.at(-1),
        collapsedNodeIds: state.collapsedNodeIds.filter(
          (nodeId) => nodeId !== parentId,
        ),
      }
    }),

  removeSubtree: (nodeId) =>
    set((state) => {
      const parentId = state.tree.nodes[nodeId]?.parentId ?? null
      const removedIds = new Set(getSubtreeIds(state.tree, nodeId))
      const tree = removeSubtreeFromTree(state.tree, nodeId)
      const pendingMoveNodeId =
        state.pendingMoveNodeId === nodeId ? null : state.pendingMoveNodeId

      return {
        ...updateTreeHistory(state, tree),
        selectedNodeId: parentId,
        pendingMoveNodeId,
        collapsedNodeIds: state.collapsedNodeIds.filter(
          (collapsedId) => !removedIds.has(collapsedId),
        ),
      }
    }),

  setLabel: (nodeId, label) =>
    set((state) => ({
      ...updateTreeHistory(state, setLabelInTree(state.tree, nodeId, label)),
      selectedNodeId: nodeId,
    })),

  setBranchLength: (nodeId, branchLength) =>
    set((state) => ({
      ...updateTreeHistory(
        state,
        setBranchLengthInTree(state.tree, nodeId, branchLength),
      ),
      selectedNodeId: nodeId,
    })),

  addMetadata: (nodeId, key, value) =>
    set((state) => ({
      ...updateTreeHistory(
        state,
        addMetadataToTree(state.tree, nodeId, key, value),
      ),
      selectedNodeId: nodeId,
    })),

  updateMetadata: (nodeId, previousKey, key, value) =>
    set((state) => ({
      ...updateTreeHistory(
        state,
        updateMetadataInTree(state.tree, nodeId, previousKey, key, value),
      ),
      selectedNodeId: nodeId,
    })),

  removeMetadata: (nodeId, key) =>
    set((state) => ({
      ...updateTreeHistory(
        state,
        removeMetadataFromTree(state.tree, nodeId, key),
      ),
      selectedNodeId: nodeId,
    })),

  reorderChild: (parentId, childId, direction) =>
    set((state) => ({
      ...updateTreeHistory(
        state,
        reorderChildInTree(state.tree, parentId, childId, direction),
      ),
      selectedNodeId: childId,
    })),

  startMoveSubtree: (nodeId) => set({ pendingMoveNodeId: nodeId }),

  cancelMoveSubtree: () => set({ pendingMoveNodeId: null }),

  completeMoveSubtree: (newParentId) =>
    set((state) => {
      if (state.pendingMoveNodeId === null) {
        return state
      }

      return {
        ...updateTreeHistory(
          state,
          moveSubtreeInTree(state.tree, state.pendingMoveNodeId, newParentId),
        ),
        selectedNodeId: state.pendingMoveNodeId,
        pendingMoveNodeId: null,
        collapsedNodeIds: state.collapsedNodeIds.filter(
          (nodeId) => nodeId !== newParentId,
        ),
      }
    }),
}))
