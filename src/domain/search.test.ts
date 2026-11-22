import { describe, expect, it } from 'vitest'
import { addChild, addMetadata, createEmptyTree, setLabel } from './tree'
import { searchTree } from './search'
import type { PhyloTree } from './types'

function createSearchTree(): PhyloTree {
  let tree = createEmptyTree()
  const rootId = tree.rootId

  tree = setLabel(tree, rootId, 'Proto-language')
  tree = addChild(tree, rootId, { id: 'germanic', label: 'Germanic' })
  tree = addMetadata(tree, 'germanic', 'branch', 'West Germanic')
  tree = addChild(tree, 'germanic', {
    id: 'english',
    label: 'English',
  })
  tree = addMetadata(tree, 'english', 'iso', 'eng')
  tree = addMetadata(tree, 'english', 'attested', true)
  tree = addChild(tree, 'germanic', {
    id: 'german',
    label: 'German',
  })
  tree = addMetadata(tree, 'german', 'speakers', 95)
  tree = addChild(tree, rootId, { id: 'slavic', label: 'Slavic' })
  tree = addChild(tree, 'slavic', { id: 'polish', label: 'Polish' })

  return tree
}

describe('searchTree', () => {
  it('returns no results for an empty or whitespace-only query', () => {
    const tree = createSearchTree()

    expect(searchTree(tree, '')).toEqual([])
    expect(searchTree(tree, '   ')).toEqual([])
  })

  it('matches labels case-insensitively in depth-first order', () => {
    const results = searchTree(createSearchTree(), 'GERMAN', 'label')

    expect(results.map((result) => result.nodeId)).toEqual([
      'germanic',
      'german',
    ])
    expect(results.every((result) => result.labelMatch)).toBe(true)
    expect(results.every((result) => result.metadataMatches.length === 0)).toBe(
      true,
    )
  })

  it('matches metadata keys and stringified values', () => {
    const tree = createSearchTree()

    expect(searchTree(tree, 'iso', 'metadata')).toEqual([
      {
        nodeId: 'english',
        label: 'English',
        labelMatch: false,
        metadataMatches: [{ key: 'iso', value: 'eng' }],
      },
    ])
    expect(searchTree(tree, 'west', 'metadata')).toEqual([
      {
        nodeId: 'germanic',
        label: 'Germanic',
        labelMatch: false,
        metadataMatches: [{ key: 'branch', value: 'West Germanic' }],
      },
    ])
    expect(searchTree(tree, '95', 'metadata')[0]?.nodeId).toBe('german')
    expect(searchTree(tree, 'true', 'metadata')[0]?.nodeId).toBe('english')
  })

  it('ignores metadata in label scope and labels in metadata scope', () => {
    expect(searchTree(createSearchTree(), 'West', 'label')).toEqual([])
    expect(searchTree(createSearchTree(), 'Polish', 'metadata')).toEqual([])
  })

  it('matches labels and metadata in the all scope', () => {
    const results = searchTree(createSearchTree(), 'man', 'all')

    expect(results.map((result) => result.nodeId)).toEqual([
      'germanic',
      'german',
    ])
    expect(results[0]).toMatchObject({
      labelMatch: true,
      metadataMatches: [{ key: 'branch', value: 'West Germanic' }],
    })
    expect(results[1]).toMatchObject({
      labelMatch: true,
      metadataMatches: [],
    })
  })

  it('returns an empty list when nothing matches', () => {
    expect(searchTree(createSearchTree(), 'Finnish')).toEqual([])
  })
})
