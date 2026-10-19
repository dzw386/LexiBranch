import { create } from 'zustand'
import {
  addChild as addChildToTree,
  addMetadata as addMetadataToTree,
  createEmptyTree,
  createNode,
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
  viewMode: LayoutMode
  selectNode: (nodeId: string | null) => void
  setViewMode: (viewMode: LayoutMode) => void
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
  viewMode: 'cladogram',

  selectNode: (nodeId) => set({ selectedNodeId: nodeId }),

  setViewMode: (viewMode) => set({ viewMode }),

  undo: () =>
    set((state) => {
      const transition = undoTreeChange(state.history, state.tree)

      if (transition === null) {
        return state
      }

      return {
        ...transition,
        selectedNodeId:
          state.selectedNodeId !== null &&
          Object.hasOwn(transition.tree.nodes, state.selectedNodeId)
            ? state.selectedNodeId
            : null,
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
        selectedNodeId:
          state.selectedNodeId !== null &&
          Object.hasOwn(transition.tree.nodes, state.selectedNodeId)
            ? state.selectedNodeId
            : null,
        pendingMoveNodeId: null,
      }
    }),

  newTree: (rootLabel) => {
    const tree = createEmptyTree()

    set((state) => ({
      ...updateTreeHistory(state, setLabelInTree(tree, tree.rootId, rootLabel)),
      selectedNodeId: null,
      pendingMoveNodeId: null,
    }))
  },

  importTree: (tree) =>
    set((state) => ({
      ...updateTreeHistory(state, tree),
      selectedNodeId: null,
      pendingMoveNodeId: null,
    })),

  addChild: (parentId, options = {}) =>
    set((state) => {
      const tree = addChildToTree(state.tree, parentId, options)
      const childIds = tree.nodes[parentId]?.childIds

      return {
        ...updateTreeHistory(state, tree),
        selectedNodeId: childIds?.at(-1),
      }
    }),

  removeSubtree: (nodeId) =>
    set((state) => {
      const parentId = state.tree.nodes[nodeId]?.parentId ?? null
      const tree = removeSubtreeFromTree(state.tree, nodeId)
      const pendingMoveNodeId =
        state.pendingMoveNodeId === nodeId ? null : state.pendingMoveNodeId

      return {
        ...updateTreeHistory(state, tree),
        selectedNodeId: parentId,
        pendingMoveNodeId,
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
      }
    }),
}))
