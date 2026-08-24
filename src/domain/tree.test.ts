import { describe, expect, it } from 'vitest'
import { createEmptyTree, createNode } from './tree'

describe('createNode', () => {
  it('creates a detached leaf with valid defaults', () => {
    const node = createNode()

    expect(node.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    )
    expect(node).toMatchObject({
      parentId: null,
      childIds: [],
      label: '',
      branchLength: null,
      metadata: {},
    })
  })

  it('generates unique ids and independent mutable fields', () => {
    const first = createNode()
    const second = createNode()

    first.childIds.push('child')
    first.metadata.language = 'English'

    expect(first.id).not.toBe(second.id)
    expect(second.childIds).toEqual([])
    expect(second.metadata).toEqual({})
  })

  it('accepts custom node data without sharing metadata', () => {
    const metadata = { iso: 'eng', extinct: false }
    const node = createNode({
      id: 'english',
      parentId: 'germanic',
      label: 'English',
      branchLength: 1.5,
      metadata,
    })

    expect(node).toEqual({
      id: 'english',
      parentId: 'germanic',
      childIds: [],
      label: 'English',
      branchLength: 1.5,
      metadata,
    })

    metadata.iso = 'changed'
    expect(node.metadata.iso).toBe('eng')
  })

  it('rejects invalid branch lengths', () => {
    expect(() => createNode({ branchLength: -1 })).toThrow(RangeError)
    expect(() => createNode({ branchLength: Number.NaN })).toThrow(RangeError)
    expect(() =>
      createNode({ branchLength: Number.POSITIVE_INFINITY }),
    ).toThrow(RangeError)
  })
})

describe('createEmptyTree', () => {
  it('creates a single blank root node', () => {
    const tree = createEmptyTree()
    const root = tree.nodes[tree.rootId]

    expect(Object.keys(tree.nodes)).toEqual([tree.rootId])
    expect(root).toEqual({
      id: tree.rootId,
      parentId: null,
      childIds: [],
      label: '',
      branchLength: null,
      metadata: {},
    })
  })

  it('creates independent trees', () => {
    const first = createEmptyTree()
    const second = createEmptyTree()

    first.nodes[first.rootId].label = 'Root'

    expect(first.rootId).not.toBe(second.rootId)
    expect(second.nodes[second.rootId].label).toBe('')
  })
})
