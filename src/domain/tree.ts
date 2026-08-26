import type { MetadataValue, PhyloTree, TreeNodeData } from './types'

export interface CreateNodeOptions {
  id?: string
  parentId?: string | null
  label?: string
  branchLength?: number | null
  metadata?: Record<string, MetadataValue>
}

export type TreeOperationErrorCode = 'cycle'

export class TreeOperationError extends Error {
  readonly code: TreeOperationErrorCode

  constructor(code: TreeOperationErrorCode, message: string) {
    super(message)
    this.name = 'TreeOperationError'
    this.code = code
  }
}

function validateBranchLength(branchLength: number | null): void {
  if (
    branchLength !== null &&
    (!Number.isFinite(branchLength) || branchLength < 0)
  ) {
    throw new RangeError(
      'Branch length must be a finite number greater than or equal to 0.',
    )
  }
}

export function createNode({
  id = globalThis.crypto.randomUUID(),
  parentId = null,
  label = '',
  branchLength = null,
  metadata = {},
}: CreateNodeOptions = {}): TreeNodeData {
  validateBranchLength(branchLength)

  return {
    id,
    parentId,
    childIds: [],
    label,
    branchLength,
    metadata: { ...metadata },
  }
}

export function createEmptyTree(): PhyloTree {
  const root = createNode()

  return {
    rootId: root.id,
    nodes: { [root.id]: root },
  }
}

function getNode(tree: PhyloTree, nodeId: string): TreeNodeData {
  const node = tree.nodes[nodeId]

  if (node === undefined) {
    throw new Error(`Node "${nodeId}" does not exist.`)
  }

  return node
}

export function addChild(
  tree: PhyloTree,
  parentId: string,
  options: Omit<CreateNodeOptions, 'parentId'> = {},
): PhyloTree {
  const parent = getNode(tree, parentId)
  const child = createNode({ ...options, parentId })

  if (tree.nodes[child.id] !== undefined) {
    throw new Error(`A node with id "${child.id}" already exists.`)
  }

  return {
    ...tree,
    nodes: {
      ...tree.nodes,
      [parentId]: {
        ...parent,
        childIds: [...parent.childIds, child.id],
      },
      [child.id]: child,
    },
  }
}

export function removeSubtree(tree: PhyloTree, nodeId: string): PhyloTree {
  const node = getNode(tree, nodeId)

  if (nodeId === tree.rootId) {
    throw new Error('The root node cannot be removed.')
  }

  if (node.parentId === null) {
    throw new Error('Only the root node may have no parent.')
  }

  const parent = getNode(tree, node.parentId)

  if (!parent.childIds.includes(nodeId)) {
    throw new Error(`Node "${nodeId}" is not a child of its parent.`)
  }

  const subtreeIds = new Set<string>()

  function collectSubtree(currentId: string): void {
    if (
      currentId === tree.rootId ||
      currentId === parent.id ||
      subtreeIds.has(currentId)
    ) {
      return
    }

    const currentNode = getNode(tree, currentId)
    subtreeIds.add(currentId)

    for (const childId of currentNode.childIds) {
      collectSubtree(childId)
    }
  }

  collectSubtree(nodeId)

  const nodes = {
    ...tree.nodes,
    [parent.id]: {
      ...parent,
      childIds: parent.childIds.filter((childId) => childId !== nodeId),
    },
  }

  for (const subtreeId of subtreeIds) {
    delete nodes[subtreeId]
  }

  return { ...tree, nodes }
}

function isInSubtree(
  tree: PhyloTree,
  subtreeRootId: string,
  nodeId: string,
): boolean {
  const pending = [subtreeRootId]
  const visited = new Set<string>()

  while (pending.length > 0) {
    const currentId = pending.pop()

    if (currentId === undefined || visited.has(currentId)) {
      continue
    }

    if (currentId === nodeId) {
      return true
    }

    visited.add(currentId)
    pending.push(...getNode(tree, currentId).childIds)
  }

  return false
}

export function moveSubtree(
  tree: PhyloTree,
  nodeId: string,
  newParentId: string,
): PhyloTree {
  const node = getNode(tree, nodeId)

  if (nodeId === tree.rootId) {
    throw new Error('The root node cannot be moved.')
  }

  if (node.parentId === null) {
    throw new Error('Only the root node may have no parent.')
  }

  const newParent = getNode(tree, newParentId)

  if (isInSubtree(tree, nodeId, newParentId)) {
    throw new TreeOperationError(
      'cycle',
      `Moving node "${nodeId}" under "${newParentId}" would create a cycle.`,
    )
  }

  const oldParent = getNode(tree, node.parentId)

  if (!oldParent.childIds.includes(nodeId)) {
    throw new Error(`Node "${nodeId}" is not a child of its parent.`)
  }

  if (oldParent.id === newParent.id) {
    return { ...tree, nodes: { ...tree.nodes } }
  }

  return {
    ...tree,
    nodes: {
      ...tree.nodes,
      [nodeId]: { ...node, parentId: newParentId },
      [oldParent.id]: {
        ...oldParent,
        childIds: oldParent.childIds.filter((childId) => childId !== nodeId),
      },
      [newParent.id]: {
        ...newParent,
        childIds: [...newParent.childIds, nodeId],
      },
    },
  }
}

export type ReorderDirection = 'up' | 'down'

export function reorderChild(
  tree: PhyloTree,
  parentId: string,
  childId: string,
  direction: ReorderDirection,
): PhyloTree {
  if (direction !== 'up' && direction !== 'down') {
    throw new Error('Reorder direction must be "up" or "down".')
  }

  const parent = getNode(tree, parentId)
  const child = getNode(tree, childId)

  if (child.parentId !== parentId || !parent.childIds.includes(childId)) {
    throw new Error(`Node "${childId}" is not a child of parent "${parentId}".`)
  }

  const childIndex = parent.childIds.indexOf(childId)
  const offset = direction === 'up' ? -1 : 1
  const targetIndex = childIndex + offset

  if (targetIndex < 0 || targetIndex >= parent.childIds.length) {
    return { ...tree, nodes: { ...tree.nodes } }
  }

  const childIds = [...parent.childIds]
  childIds.splice(childIndex, 1)
  childIds.splice(targetIndex, 0, childId)

  return {
    ...tree,
    nodes: {
      ...tree.nodes,
      [parentId]: { ...parent, childIds },
    },
  }
}

export function setLabel(
  tree: PhyloTree,
  nodeId: string,
  label: string,
): PhyloTree {
  const node = getNode(tree, nodeId)

  return {
    ...tree,
    nodes: {
      ...tree.nodes,
      [nodeId]: { ...node, label },
    },
  }
}

export function setBranchLength(
  tree: PhyloTree,
  nodeId: string,
  branchLength: number | null,
): PhyloTree {
  const node = getNode(tree, nodeId)

  if (nodeId === tree.rootId) {
    throw new Error('The root node cannot have a branch length.')
  }

  validateBranchLength(branchLength)

  return {
    ...tree,
    nodes: {
      ...tree.nodes,
      [nodeId]: { ...node, branchLength },
    },
  }
}
