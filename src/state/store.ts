import { create } from 'zustand'
import {
  addChild as addChildToTree,
  createNode,
  moveSubtree as moveSubtreeInTree,
  removeSubtree as removeSubtreeFromTree,
  reorderChild as reorderChildInTree,
  setBranchLength as setBranchLengthInTree,
  setLabel as setLabelInTree,
  type CreateNodeOptions,
  type ReorderDirection,
} from '../domain/tree'
import type { PhyloTree } from '../domain/types'

export type AddChildOptions = Omit<CreateNodeOptions, 'parentId'>

export interface TreeStore {
  tree: PhyloTree
  selectedNodeId: string | null
  selectNode: (nodeId: string | null) => void
  addChild: (parentId: string, options?: AddChildOptions) => void
  removeSubtree: (nodeId: string) => void
  setLabel: (nodeId: string, label: string) => void
  setBranchLength: (nodeId: string, branchLength: number | null) => void
  moveSubtree: (nodeId: string, newParentId: string) => void
  reorderChild: (
    parentId: string,
    childId: string,
    direction: ReorderDirection,
  ) => void
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

  selectNode: (nodeId) => set({ selectedNodeId: nodeId }),

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

      return { tree, selectedNodeId: parentId }
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
}))
