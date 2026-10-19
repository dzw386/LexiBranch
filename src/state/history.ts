import type { PhyloTree } from '../domain/types'

export const MAX_HISTORY_LENGTH = 50

export interface TreeHistory {
  past: PhyloTree[]
  future: PhyloTree[]
}

export interface TreeHistoryTransition {
  tree: PhyloTree
  history: TreeHistory
}

export function createTreeHistory(): TreeHistory {
  return { past: [], future: [] }
}

export function recordTreeChange(
  history: TreeHistory,
  currentTree: PhyloTree,
  nextTree: PhyloTree,
): TreeHistory {
  if (currentTree === nextTree) {
    return history
  }

  return {
    past: [...history.past, currentTree].slice(-MAX_HISTORY_LENGTH),
    future: [],
  }
}

export function undoTreeChange(
  history: TreeHistory,
  currentTree: PhyloTree,
): TreeHistoryTransition | null {
  const previousTree = history.past.at(-1)

  if (previousTree === undefined) {
    return null
  }

  return {
    tree: previousTree,
    history: {
      past: history.past.slice(0, -1),
      future: [...history.future, currentTree].slice(-MAX_HISTORY_LENGTH),
    },
  }
}

export function redoTreeChange(
  history: TreeHistory,
  currentTree: PhyloTree,
): TreeHistoryTransition | null {
  const nextTree = history.future.at(-1)

  if (nextTree === undefined) {
    return null
  }

  return {
    tree: nextTree,
    history: {
      past: [...history.past, currentTree].slice(-MAX_HISTORY_LENGTH),
      future: history.future.slice(0, -1),
    },
  }
}
