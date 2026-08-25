import { describe, expect, it } from 'vitest'
import {
  addChild,
  createEmptyTree,
  createNode,
  removeSubtree,
  setBranchLength,
  setLabel,
} from './tree'

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

function createTreeWithSubtree() {
  const root = createNode({ id: 'root', label: 'Root' })
  const branch = createNode({
    id: 'branch',
    parentId: root.id,
    label: 'Branch',
  })
  const leaf = createNode({ id: 'leaf', parentId: branch.id, label: 'Leaf' })
  const sibling = createNode({
    id: 'sibling',
    parentId: root.id,
    label: 'Sibling',
  })

  return {
    rootId: root.id,
    nodes: {
      [root.id]: { ...root, childIds: [branch.id, sibling.id] },
      [branch.id]: { ...branch, childIds: [leaf.id] },
      [leaf.id]: leaf,
      [sibling.id]: sibling,
    },
  }
}

describe('addChild', () => {
  it('adds a configured child and preserves the input tree', () => {
    const tree = createEmptyTree()
    const original = structuredClone(tree)
    const metadata = { iso: 'eng', extinct: false }

    const result = addChild(tree, tree.rootId, {
      id: 'english',
      label: 'English',
      branchLength: 1.5,
      metadata,
    })

    expect(result.nodes[tree.rootId]?.childIds).toEqual(['english'])
    expect(result.nodes.english).toEqual({
      id: 'english',
      parentId: tree.rootId,
      childIds: [],
      label: 'English',
      branchLength: 1.5,
      metadata,
    })
    expect(result).not.toBe(tree)
    expect(result.nodes[tree.rootId]).not.toBe(tree.nodes[tree.rootId])
    expect(tree).toEqual(original)

    metadata.iso = 'changed'
    expect(result.nodes.english?.metadata.iso).toBe('eng')
  })

  it('appends children in order', () => {
    const tree = createEmptyTree()
    const first = addChild(tree, tree.rootId, { id: 'first' })
    const result = addChild(first, tree.rootId, { id: 'second' })

    expect(result.nodes[tree.rootId]?.childIds).toEqual(['first', 'second'])
  })

  it('adds a child to a non-root parent', () => {
    const tree = createTreeWithSubtree()

    const result = addChild(tree, 'branch', { id: 'nested', label: 'Nested' })

    expect(result.nodes.branch?.childIds).toEqual(['leaf', 'nested'])
    expect(result.nodes.nested?.parentId).toBe('branch')
    expect(result.nodes.root?.childIds).toEqual(['branch', 'sibling'])
  })

  it('rejects invalid branch lengths', () => {
    const tree = createEmptyTree()

    for (const branchLength of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() =>
        addChild(tree, tree.rootId, {
          id: `invalid-${branchLength}`,
          branchLength,
        }),
      ).toThrow(RangeError)
    }
  })

  it('rejects an unknown parent and duplicate id', () => {
    const tree = createEmptyTree()

    expect(() => addChild(tree, 'missing')).toThrow('does not exist')

    const withChild = addChild(tree, tree.rootId, { id: 'child' })
    expect(() => addChild(withChild, tree.rootId, { id: 'child' })).toThrow(
      'already exists',
    )
  })
})

describe('removeSubtree', () => {
  it("removes the root's last child without removing the root", () => {
    const tree = createEmptyTree()
    const withChild = addChild(tree, tree.rootId, { id: 'child' })
    const original = structuredClone(withChild)

    const result = removeSubtree(withChild, 'child')

    expect(result).toEqual(tree)
    expect(withChild).toEqual(original)
    expect(result.nodes[tree.rootId]).not.toBe(withChild.nodes[tree.rootId])
  })

  it('removes an internal node and all of its descendants', () => {
    const tree = createTreeWithSubtree()
    const original = structuredClone(tree)

    const result = removeSubtree(tree, 'branch')

    expect(result).toEqual({
      rootId: 'root',
      nodes: {
        root: expect.objectContaining({ childIds: ['sibling'] }),
        sibling: tree.nodes.sibling,
      },
    })
    expect(tree).toEqual(original)
  })

  it('keeps the parent when a corrupt subtree points back to it', () => {
    const tree = createTreeWithSubtree()
    const corruptTree = {
      ...tree,
      nodes: {
        ...tree.nodes,
        branch: { ...tree.nodes.branch, childIds: ['leaf', 'root'] },
      },
    }
    const original = structuredClone(corruptTree)

    const result = removeSubtree(corruptTree, 'branch')

    expect(result.nodes.root?.childIds).toEqual(['sibling'])
    expect(result.nodes).not.toHaveProperty('branch')
    expect(result.nodes).not.toHaveProperty('leaf')
    expect(corruptTree).toEqual(original)
  })

  it('rejects removing the root or a missing node', () => {
    const tree = createTreeWithSubtree()

    expect(() => removeSubtree(tree, tree.rootId)).toThrow('cannot be removed')
    expect(() => removeSubtree(tree, 'missing')).toThrow('does not exist')
  })
})

describe('setLabel', () => {
  it('renames a node without mutating the input', () => {
    const tree = createTreeWithSubtree()
    const original = structuredClone(tree)

    const result = setLabel(tree, 'leaf', 'Updated leaf')

    expect(result.nodes.leaf?.label).toBe('Updated leaf')
    expect(result.nodes.leaf).not.toBe(tree.nodes.leaf)
    expect(tree).toEqual(original)
  })

  it('rejects an unknown node', () => {
    expect(() => setLabel(createEmptyTree(), 'missing', 'Label')).toThrow(
      'does not exist',
    )
  })
})

describe('setBranchLength', () => {
  it('sets valid lengths, including zero and null, without mutation', () => {
    const tree = createTreeWithSubtree()
    const original = structuredClone(tree)

    const withLength = setBranchLength(tree, 'leaf', 0)
    const result = setBranchLength(withLength, 'leaf', null)

    expect(withLength.nodes.leaf?.branchLength).toBe(0)
    expect(result.nodes.leaf?.branchLength).toBeNull()
    expect(tree).toEqual(original)
  })

  it('rejects branch lengths on the root', () => {
    const tree = createEmptyTree()

    expect(() => setBranchLength(tree, tree.rootId, 1)).toThrow(
      'root node cannot have a branch length',
    )
    expect(() => setBranchLength(tree, tree.rootId, null)).toThrow(
      'root node cannot have a branch length',
    )
  })

  it('rejects negative and non-finite lengths', () => {
    const tree = createTreeWithSubtree()

    expect(() => setBranchLength(tree, 'leaf', -1)).toThrow(RangeError)
    expect(() => setBranchLength(tree, 'leaf', Number.NaN)).toThrow(RangeError)
    expect(() =>
      setBranchLength(tree, 'leaf', Number.POSITIVE_INFINITY),
    ).toThrow(RangeError)
  })

  it('rejects an unknown node', () => {
    expect(() => setBranchLength(createEmptyTree(), 'missing', 1)).toThrow(
      'does not exist',
    )
  })
})
