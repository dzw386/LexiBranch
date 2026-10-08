import { describe, expect, it } from 'vitest'
import type { PhyloTree } from '../domain/types'
import basicTree from './fixtures/basic.nwk?raw'
import commentsTree from './fixtures/comments.nwk?raw'
import invalidLength from './fixtures/invalid-length.nwk?raw'
import missingClose from './fixtures/missing-close.nwk?raw'
import nestedTree from './fixtures/nested.nwk?raw'
import quotedLabels from './fixtures/quoted-labels.nwk?raw'
import rootLength from './fixtures/root-length.nwk?raw'
import singleLeaf from './fixtures/single-leaf.nwk?raw'
import trailingContent from './fixtures/trailing-content.nwk?raw'
import unterminatedLabel from './fixtures/unterminated-label.nwk?raw'
import whitespaceTree from './fixtures/whitespace.nwk?raw'
import { parse, ParseError, parseNewickSyntax, serialize } from './newick'

interface TreeShape {
  label: string
  branchLength: number | null
  children: TreeShape[]
}

function getTreeShape(tree: PhyloTree, nodeId = tree.rootId): TreeShape {
  const node = tree.nodes[nodeId]

  if (node === undefined) {
    throw new Error(`Missing parsed node "${nodeId}"`)
  }

  return {
    label: node.label,
    branchLength: node.branchLength,
    children: node.childIds.map((childId) => getTreeShape(tree, childId)),
  }
}

interface ValidFixture {
  name: string
  source: string
  expected: TreeShape
}

const validFixtures: ValidFixture[] = [
  {
    name: 'basic tree',
    source: basicTree,
    expected: {
      label: 'Root',
      branchLength: null,
      children: [
        { label: 'A', branchLength: 0.1, children: [] },
        { label: 'B', branchLength: 0.2, children: [] },
      ],
    },
  },
  {
    name: 'nested tree',
    source: nestedTree,
    expected: {
      label: 'Indo-European',
      branchLength: null,
      children: [
        {
          label: 'Germanic',
          branchLength: 0.5,
          children: [
            { label: 'English', branchLength: 0.3, children: [] },
            { label: 'German', branchLength: 0.2, children: [] },
          ],
        },
        {
          label: 'West_Slavic',
          branchLength: 0.4,
          children: [
            { label: 'Polish', branchLength: 0.1, children: [] },
            { label: 'Czech', branchLength: 0.15, children: [] },
          ],
        },
      ],
    },
  },
  {
    name: 'quoted labels',
    source: quotedLabels,
    expected: {
      label: 'Root label',
      branchLength: null,
      children: [
        { label: 'New Zealand', branchLength: 0, children: [] },
        { label: "O'Brien", branchLength: 0.25, children: [] },
        {
          label: 'comma, and (parentheses)',
          branchLength: 1.5,
          children: [],
        },
      ],
    },
  },
  {
    name: 'whitespace and scientific branch lengths',
    source: whitespaceTree,
    expected: {
      label: 'Root',
      branchLength: null,
      children: [
        { label: 'Alpha', branchLength: 0, children: [] },
        { label: 'Beta gamma', branchLength: 0.0125, children: [] },
        { label: 'Gamma', branchLength: null, children: [] },
      ],
    },
  },
  {
    name: 'single leaf without a terminal semicolon',
    source: singleLeaf,
    expected: { label: 'Solo', branchLength: null, children: [] },
  },
  {
    name: 'comments fixture tree',
    source: commentsTree,
    expected: {
      label: 'Root',
      branchLength: null,
      children: [
        { label: 'Alpha', branchLength: 0.5, children: [] },
        { label: 'Beta', branchLength: null, children: [] },
      ],
    },
  },
]

describe('parse Newick fixtures', () => {
  it.each(validFixtures)('parses the $name fixture', ({ source, expected }) => {
    const tree = parse(source)

    expect(getTreeShape(tree)).toEqual(expected)
    expect(Object.keys(tree.nodes)).toHaveLength(validNodeCount(expected))

    for (const [id, node] of Object.entries(tree.nodes)) {
      expect(node.id).toBe(id)

      for (const childId of node.childIds) {
        expect(tree.nodes[childId]?.parentId).toBe(id)
      }
    }
  })
})

describe('serialize Newick', () => {
  it.each(validFixtures)('round-trips the $name fixture', ({ source }) => {
    const tree = parse(source)
    const serialized = serialize(tree)

    expect(serialized).toMatch(/;$/u)
    expect(getTreeShape(parse(serialized))).toEqual(getTreeShape(tree))
  })

  it('quotes empty labels and labels containing Newick delimiters', () => {
    const tree = parse("('label: [with]; O''Brien':1e-7);")
    const serialized = serialize(tree)

    expect(serialized).toBe("('label: [with]; O''Brien':1e-7)'';")
    expect(getTreeShape(parse(serialized))).toEqual(getTreeShape(tree))
  })

  it('round-trips an empty tree with a blank root label', () => {
    const tree: PhyloTree = {
      rootId: 'root',
      nodes: {
        root: {
          id: 'root',
          parentId: null,
          childIds: [],
          label: '',
          branchLength: null,
          metadata: {},
        },
      },
    }

    expect(serialize(tree)).toBe("'';")
    expect(getTreeShape(parse(serialize(tree)))).toEqual(getTreeShape(tree))
  })
})

function validNodeCount(shape: TreeShape): number {
  return (
    1 +
    shape.children.reduce((count, child) => count + validNodeCount(child), 0)
  )
}

describe('parseNewickSyntax', () => {
  it('preserves bracket comments on their associated nodes', () => {
    const syntax = parseNewickSyntax(commentsTree)
    const firstChild = syntax.children[0]

    expect(syntax.comments).toEqual(['tree comment', 'root note'])
    expect(firstChild?.comments).toEqual(['leaf note', '&&NHX:code=eng'])
  })
})

interface InvalidFixture {
  name: string
  source: string
  position: number
  message: string
}

const invalidFixtures: InvalidFixture[] = [
  {
    name: 'missing closing parenthesis',
    source: missingClose,
    position: missingClose.length,
    message: 'close this subtree',
  },
  {
    name: 'invalid branch length',
    source: invalidLength,
    position: invalidLength.indexOf('not-a-number'),
    message: 'Invalid branch length',
  },
  {
    name: 'unterminated quoted label',
    source: unterminatedLabel,
    position: unterminatedLabel.indexOf("'"),
    message: 'Unterminated quoted label',
  },
  {
    name: 'trailing content',
    source: trailingContent,
    position: trailingContent.indexOf('extra'),
    message: 'Unexpected content',
  },
  {
    name: 'root branch length',
    source: rootLength,
    position: rootLength.indexOf('1;'),
    message: 'root branch length',
  },
]

describe('malformed Newick input', () => {
  it.each(invalidFixtures)(
    'reports a typed error and position for $name',
    ({ source, position, message }) => {
      let thrownError: unknown

      try {
        parse(source)
      } catch (error) {
        thrownError = error
      }

      expect(thrownError).toBeInstanceOf(ParseError)
      expect(thrownError).toMatchObject({ position })
      expect(thrownError).toHaveProperty(
        'message',
        expect.stringContaining(message),
      )
    },
  )

  it('rejects an unterminated bracket comment with its opening position', () => {
    const source = '[unclosed comment'
    let thrownError: unknown

    try {
      parse(source)
    } catch (error) {
      thrownError = error
    }

    expect(thrownError).toBeInstanceOf(ParseError)
    expect(thrownError).toMatchObject({ position: 0 })
    expect(thrownError).toHaveProperty(
      'message',
      expect.stringContaining('Unterminated bracket comment'),
    )
  })
})
