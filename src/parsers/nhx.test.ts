import { describe, expect, it } from 'vitest'
import type { PhyloTree } from '../domain/types'
import commentsTree from './fixtures/comments.nwk?raw'
import metadataNhx from './fixtures/metadata.nhx?raw'
import { ParseError, parse, serialize } from './nhx'

interface MetadataTreeShape {
  label: string
  branchLength: number | null
  metadata: Record<string, string | number | boolean>
  children: MetadataTreeShape[]
}

function getMetadataTreeShape(
  tree: PhyloTree,
  nodeId = tree.rootId,
): MetadataTreeShape {
  const node = tree.nodes[nodeId]

  if (node === undefined) {
    throw new Error(`Missing parsed node "${nodeId}"`)
  }

  return {
    label: node.label,
    branchLength: node.branchLength,
    metadata: node.metadata,
    children: node.childIds.map((childId) =>
      getMetadataTreeShape(tree, childId),
    ),
  }
}

describe('parse NHX fixtures', () => {
  it('maps NHX fields to metadata on their associated nodes', () => {
    const tree = parse(metadataNhx)

    expect(getMetadataTreeShape(tree)).toEqual({
      label: 'Proto',
      branchLength: null,
      metadata: { source: 'fixture' },
      children: [
        {
          label: 'Germanic',
          branchLength: 0.5,
          metadata: { branch: 'West Germanic' },
          children: [
            {
              label: 'English',
              branchLength: 0.3,
              metadata: { code: 'eng', note: 'first-second' },
              children: [],
            },
            {
              label: 'German',
              branchLength: 0.2,
              metadata: { code: 'deu' },
              children: [],
            },
          ],
        },
        {
          label: 'Polish',
          branchLength: 0.1,
          metadata: { code: 'pol' },
          children: [],
        },
      ],
    })
  })

  it('ignores ordinary Newick comments while parsing NHX fields', () => {
    const tree = parse(commentsTree)
    const alpha = Object.values(tree.nodes).find(
      (node) => node.label === 'Alpha',
    )

    expect(alpha?.metadata).toEqual({ code: 'eng' })
  })

  it('infers numeric and boolean values from NHX fields', () => {
    const tree = parse(
      '(English[&&NHX:confidence=0.98:attested=true:extinct=false])Proto;',
    )
    const english = Object.values(tree.nodes).find(
      (node) => node.label === 'English',
    )

    expect(english?.metadata).toEqual({
      confidence: 0.98,
      attested: true,
      extinct: false,
    })
  })

  it('reports malformed NHX fields as positioned parse errors', () => {
    const source = '(English[&&NHX:missing-value])Proto;'
    let thrownError: unknown

    try {
      parse(source)
    } catch (error) {
      thrownError = error
    }

    expect(thrownError).toBeInstanceOf(ParseError)
    expect(thrownError).toMatchObject({
      position: source.indexOf('missing-value'),
    })
  })
})

describe('serialize NHX', () => {
  it('round-trips the metadata NHX fixture', () => {
    const tree = parse(metadataNhx)
    const serialized = serialize(tree)

    expect(serialized).toContain('[&&NHX:code=eng:note=first-second]')
    expect(getMetadataTreeShape(parse(serialized))).toEqual(
      getMetadataTreeShape(tree),
    )
  })

  it('escapes reserved NHX delimiters in metadata keys and values', () => {
    const tree = parse(metadataNhx)
    const english = Object.values(tree.nodes).find(
      (node) => node.label === 'English',
    )

    if (english === undefined) {
      throw new Error('Expected an English node in the NHX fixture')
    }

    const treeWithExtraMetadata: PhyloTree = {
      ...tree,
      nodes: {
        ...tree.nodes,
        [english.id]: {
          ...english,
          metadata: {
            'extra:key=part': 'value:with=delimiters [and % encoding]',
          },
        },
      },
    }
    const serialized = serialize(treeWithExtraMetadata)

    expect(serialized).toContain(
      'extra%3Akey%3Dpart=value%3Awith%3Ddelimiters %5Band %25 encoding%5D',
    )
    expect(getMetadataTreeShape(parse(serialized))).toEqual(
      getMetadataTreeShape(treeWithExtraMetadata),
    )
  })

  it('preserves typed values and strings that look like scalars', () => {
    const tree = parse(metadataNhx)
    const english = Object.values(tree.nodes).find(
      (node) => node.label === 'English',
    )

    if (english === undefined) {
      throw new Error('Expected an English node in the NHX fixture')
    }

    const treeWithTypedMetadata: PhyloTree = {
      ...tree,
      nodes: {
        ...tree.nodes,
        [english.id]: {
          ...english,
          metadata: {
            confidence: 0.98,
            attested: true,
            code: 'true',
            numericText: '1',
            markerText: '~s~literal',
          },
        },
      },
    }
    const serialized = serialize(treeWithTypedMetadata)

    expect(serialized).toContain(
      'confidence=0.98:attested=true:code=~s~true:numericText=~s~1:markerText=~s~~s~literal',
    )
    expect(getMetadataTreeShape(parse(serialized))).toEqual(
      getMetadataTreeShape(treeWithTypedMetadata),
    )
  })
})
