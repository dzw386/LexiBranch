import { create } from 'zustand'
import {
  addChild as addChildToTree,
  addMetadata as addMetadataToTree,
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

export type AddChildOptions = Omit<CreateNodeOptions, 'parentId'>

export interface TreeStore {
  tree: PhyloTree
  selectedNodeId: string | null
  pendingMoveNodeId: string | null
  viewMode: LayoutMode
  selectNode: (nodeId: string | null) => void
  setViewMode: (viewMode: LayoutMode) => void
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
  moveSubtree: (nodeId: string, newParentId: string) => void
  reorderChild: (
    parentId: string,
    childId: string,
    direction: ReorderDirection,
  ) => void
  startMoveSubtree: (nodeId: string) => void
  cancelMoveSubtree: () => void
  completeMoveSubtree: (newParentId: string) => void
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

export const useTreeStore = create<TreeStore>((set) => ({
  tree: createInitialTree(),
  selectedNodeId: null,
  pendingMoveNodeId: null,
  viewMode: 'cladogram',

  selectNode: (nodeId) => set({ selectedNodeId: nodeId }),

  setViewMode: (viewMode) => set({ viewMode }),

  addChild: (parentId, options = {}) =>
    set((state) => {
      const tree = addChildToTree(state.tree, parentId, options)
      const childIds = tree.nodes[parentId]?.childIds

      return {
        tree,
        selectedNodeId: childIds?.at(-1),
      }
    }),

  removeSubtree: (nodeId) =>
    set((state) => {
      const parentId = state.tree.nodes[nodeId]?.parentId ?? null
      const tree = removeSubtreeFromTree(state.tree, nodeId)
      const pendingMoveNodeId =
        state.pendingMoveNodeId === nodeId ? null : state.pendingMoveNodeId

      return { tree, selectedNodeId: parentId, pendingMoveNodeId }
    }),

  setLabel: (nodeId, label) =>
    set((state) => ({
      tree: setLabelInTree(state.tree, nodeId, label),
      selectedNodeId: nodeId,
    })),

  setBranchLength: (nodeId, branchLength) =>
    set((state) => ({
      tree: setBranchLengthInTree(state.tree, nodeId, branchLength),
      selectedNodeId: nodeId,
    })),

  addMetadata: (nodeId, key, value) =>
    set((state) => ({
      tree: addMetadataToTree(state.tree, nodeId, key, value),
      selectedNodeId: nodeId,
    })),

  updateMetadata: (nodeId, previousKey, key, value) =>
    set((state) => ({
      tree: updateMetadataInTree(state.tree, nodeId, previousKey, key, value),
      selectedNodeId: nodeId,
    })),

  removeMetadata: (nodeId, key) =>
    set((state) => ({
      tree: removeMetadataFromTree(state.tree, nodeId, key),
      selectedNodeId: nodeId,
    })),

  moveSubtree: (nodeId, newParentId) =>
    set((state) => ({
      tree: moveSubtreeInTree(state.tree, nodeId, newParentId),
      selectedNodeId: nodeId,
    })),

  reorderChild: (parentId, childId, direction) =>
    set((state) => ({
      tree: reorderChildInTree(state.tree, parentId, childId, direction),
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
        tree: moveSubtreeInTree(
          state.tree,
          state.pendingMoveNodeId,
          newParentId,
        ),
        selectedNodeId: state.pendingMoveNodeId,
        pendingMoveNodeId: null,
      }
    }),
}))
