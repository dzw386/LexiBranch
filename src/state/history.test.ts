import { describe, expect, it } from 'vitest'
import { createEmptyTree, setLabel } from '../domain/tree'
import {
  createTreeHistory,
  MAX_HISTORY_LENGTH,
  recordTreeChange,
  redoTreeChange,
  undoTreeChange,
} from './history'

describe('tree history', () => {
  it('undoes and redoes snapshots in order', () => {
    const originalTree = createEmptyTree()
    const firstEdit = setLabel(originalTree, originalTree.rootId, 'First edit')
    const secondEdit = setLabel(firstEdit, firstEdit.rootId, 'Second edit')
    const firstHistory = recordTreeChange(
      createTreeHistory(),
      originalTree,
      firstEdit,
    )
    const secondHistory = recordTreeChange(firstHistory, firstEdit, secondEdit)

    const undoSecond = undoTreeChange(secondHistory, secondEdit)
    expect(undoSecond?.tree).toBe(firstEdit)
    expect(undoSecond?.history).toEqual({
      past: [originalTree],
      future: [secondEdit],
    })

    const undoFirst = undoTreeChange(undoSecond!.history, undoSecond!.tree)
    expect(undoFirst?.tree).toBe(originalTree)

    const redoFirst = redoTreeChange(undoFirst!.history, undoFirst!.tree)
    expect(redoFirst?.tree).toBe(firstEdit)

    const redoSecond = redoTreeChange(redoFirst!.history, redoFirst!.tree)
    expect(redoSecond?.tree).toBe(secondEdit)
  })

  it('clears redo snapshots after recording a new edit', () => {
    const originalTree = createEmptyTree()
    const firstEdit = setLabel(originalTree, originalTree.rootId, 'First edit')
    const history = recordTreeChange(
      createTreeHistory(),
      originalTree,
      firstEdit,
    )
    const undone = undoTreeChange(history, firstEdit)
    const alternateEdit = setLabel(
      originalTree,
      originalTree.rootId,
      'Other edit',
    )
    const branchedHistory = recordTreeChange(
      undone!.history,
      undone!.tree,
      alternateEdit,
    )

    expect(branchedHistory.future).toEqual([])
    expect(redoTreeChange(branchedHistory, alternateEdit)).toBeNull()
  })

  it('limits the undo stack to the most recent fifty snapshots', () => {
    let tree = createEmptyTree()
    let history = createTreeHistory()

    for (let index = 1; index <= MAX_HISTORY_LENGTH + 1; index += 1) {
      const nextTree = setLabel(tree, tree.rootId, `Edit ${index}`)
      history = recordTreeChange(history, tree, nextTree)
      tree = nextTree
    }

    expect(history.past).toHaveLength(MAX_HISTORY_LENGTH)

    for (let index = 0; index < MAX_HISTORY_LENGTH; index += 1) {
      const transition = undoTreeChange(history, tree)
      expect(transition).not.toBeNull()
      tree = transition!.tree
      history = transition!.history
    }

    expect(tree.nodes[tree.rootId]?.label).toBe('Edit 1')
    expect(undoTreeChange(history, tree)).toBeNull()
  })
})
