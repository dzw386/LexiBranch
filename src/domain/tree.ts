import type { MetadataValue, PhyloTree, TreeNodeData } from './types'

export interface CreateNodeOptions {
  id?: string
  parentId?: string | null
  label?: string
  branchLength?: number | null
  metadata?: Record<string, MetadataValue>
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
