import type { MetadataValue, PhyloTree, TreeNodeData } from './types'

export interface CreateNodeOptions {
  id?: string
  parentId?: string | null
  label?: string
  branchLength?: number | null
  metadata?: Record<string, MetadataValue>
}

export function createNode({
  id = globalThis.crypto.randomUUID(),
  parentId = null,
  label = '',
  branchLength = null,
  metadata = {},
}: CreateNodeOptions = {}): TreeNodeData {
  if (
    branchLength !== null &&
    (!Number.isFinite(branchLength) || branchLength < 0)
  ) {
    throw new RangeError(
      'Branch length must be a finite number greater than or equal to 0.',
    )
  }

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
