import { describe, expect, it } from 'vitest'
import type { PhyloTree } from '../domain/types'
import languagesPhyloXml from './fixtures/languages.phyloxml?raw'
import malformedPhyloXml from './fixtures/malformed.phyloxml?raw'
import minimalPhyloXml from './fixtures/minimal.phyloxml?raw'
import { ParseError, parse } from './phyloxml'

interface PhyloXmlTreeShape {
  label: string
  branchLength: number | null
  metadata: Record<string, string | number | boolean>
  children: PhyloXmlTreeShape[]
}

function getTreeShape(
  tree: PhyloTree,
  nodeId = tree.rootId,
): PhyloXmlTreeShape {
  const node = tree.nodes[nodeId]

  if (node === undefined) {
    throw new Error(`Missing parsed node "${nodeId}"`)
  }

  return {
    label: node.label,
    branchLength: node.branchLength,
    metadata: node.metadata,
    children: node.childIds.map((childId) => getTreeShape(tree, childId)),
  }
}

interface ValidFixture {
  name: string
  source: string
  expected: PhyloXmlTreeShape
}

const validFixtures: ValidFixture[] = [
  {
    name: 'language family',
    source: languagesPhyloXml,
    expected: {
      label: 'Proto-Indo-European',
      branchLength: null,
      metadata: { source: 'fixture & example' },
      children: [
        {
          label: 'Germanic',
          branchLength: 0.5,
          metadata: { group: 'West Germanic' },
          children: [
            {
              label: 'English',
              branchLength: 0.3,
              metadata: { code: 'eng', confidence: 0.98, attested: true },
              children: [],
            },
            {
              label: 'German',
              branchLength: 0.2,
              metadata: { code: 'deu', extinct: false },
              children: [],
            },
          ],
        },
        {
          label: 'Polish',
          branchLength: 0.4,
          metadata: { code: 'pol' },
          children: [],
        },
      ],
    },
  },
  {
    name: 'prefixed namespace',
    source: minimalPhyloXml,
    expected: {
      label: 'Root',
      branchLength: null,
      metadata: {},
      children: [
        {
          label: 'Solo',
          branchLength: null,
          metadata: {},
          children: [],
        },
      ],
    },
  },
]

describe('parse phyloXML fixtures', () => {
  it.each(validFixtures)('parses the $name fixture', ({ source, expected }) => {
    const tree = parse(source)

    expect(getTreeShape(tree)).toEqual(expected)
    expect(Object.keys(tree.nodes)).toHaveLength(countNodes(expected))

    for (const [id, node] of Object.entries(tree.nodes)) {
      expect(node.id).toBe(id)

      for (const childId of node.childIds) {
        expect(tree.nodes[childId]?.parentId).toBe(id)
      }
    }
  })
})

function countNodes(shape: PhyloXmlTreeShape): number {
  return (
    1 + shape.children.reduce((count, child) => count + countNodes(child), 0)
  )
}

describe('malformed phyloXML input', () => {
  it('reports invalid XML as a positioned ParseError', () => {
    let thrownError: unknown

    try {
      parse(malformedPhyloXml)
    } catch (error) {
      thrownError = error
    }

    expect(thrownError).toBeInstanceOf(ParseError)
    expect(thrownError).toMatchObject({ position: expect.any(Number) })
    expect(thrownError).toHaveProperty(
      'message',
      expect.stringContaining('Invalid phyloXML'),
    )
  })

  it('rejects a branch length on the root clade', () => {
    const source =
      '<phyloxml><phylogeny><clade><branch_length>1</branch_length></clade></phylogeny></phyloxml>'

    expect(() => parse(source)).toThrow(ParseError)
  })
})
