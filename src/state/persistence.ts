import packageJson from '../../package.json'
import type { PhyloTree, TreeNodeData } from '../domain/types'

export const SAVED_PROJECT_STORAGE_KEY = 'lexibranch-project'
export const AUTOSAVE_DELAY_MS = 500

function getLocalStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return window.localStorage
  } catch {
    return null
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isMetadataValue(value: unknown): boolean {
  return (
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
  )
}

function isTreeNodeData(value: unknown, id: string): value is TreeNodeData {
  if (!isRecord(value) || !isRecord(value.metadata)) {
    return false
  }

  return (
    value.id === id &&
    (value.parentId === null || typeof value.parentId === 'string') &&
    Array.isArray(value.childIds) &&
    value.childIds.every((childId) => typeof childId === 'string') &&
    typeof value.label === 'string' &&
    (value.branchLength === null ||
      (typeof value.branchLength === 'number' &&
        Number.isFinite(value.branchLength) &&
        value.branchLength >= 0)) &&
    Object.values(value.metadata).every(isMetadataValue)
  )
}

function isPhyloTree(value: unknown): value is PhyloTree {
  if (
    !isRecord(value) ||
    typeof value.rootId !== 'string' ||
    !isRecord(value.nodes) ||
    !Object.hasOwn(value.nodes, value.rootId)
  ) {
    return false
  }

  const entries = Object.entries(value.nodes)
  if (entries.length === 0) {
    return false
  }

  for (const [id, node] of entries) {
    if (!isTreeNodeData(node, id)) {
      return false
    }
  }

  const root = value.nodes[value.rootId]
  if (!isTreeNodeData(root, value.rootId)) {
    return false
  }
  if (root.parentId !== null || root.branchLength !== null) {
    return false
  }

  const visited = new Set<string>()
  const pending = [value.rootId]

  while (pending.length > 0) {
    const currentId = pending.pop()
    if (currentId === undefined || visited.has(currentId)) {
      return false
    }
    visited.add(currentId)

    const currentNode = value.nodes[currentId]
    if (!isTreeNodeData(currentNode, currentId)) {
      return false
    }

    const childIds = new Set<string>()
    for (const childId of currentNode.childIds) {
      const childNode = value.nodes[childId]
      if (
        childIds.has(childId) ||
        !Object.hasOwn(value.nodes, childId) ||
        !isTreeNodeData(childNode, childId) ||
        childNode.parentId !== currentId
      ) {
        return false
      }

      childIds.add(childId)
      pending.push(childId)
    }
  }

  return visited.size === entries.length
}

export function loadSavedTree(
  storage: Storage | null = getLocalStorage(),
): PhyloTree | null {
  if (storage === null) {
    return null
  }

  try {
    const serializedProject = storage.getItem(SAVED_PROJECT_STORAGE_KEY)
    if (serializedProject === null) {
      return null
    }

    const project: unknown = JSON.parse(serializedProject)
    if (
      !isRecord(project) ||
      typeof project.appVersion !== 'string' ||
      !isPhyloTree(project.tree)
    ) {
      return null
    }

    return project.tree
  } catch {
    return null
  }
}

export function saveTree(
  tree: PhyloTree,
  storage: Storage | null = getLocalStorage(),
): void {
  if (storage === null) {
    return
  }

  try {
    storage.setItem(
      SAVED_PROJECT_STORAGE_KEY,
      JSON.stringify({ appVersion: packageJson.version, tree }),
    )
  } catch {
    // Autosave is best-effort when browser storage is unavailable or full.
  }
}
