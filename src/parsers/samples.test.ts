import { XMLValidator } from 'fast-xml-parser'
import { describe, expect, it } from 'vitest'
import type { MetadataValue, PhyloTree, TreeNodeData } from '../domain/types'
import { parse, serialize } from './phyloxml'
import { SAMPLES, type SampleId } from './samples'

const LEAF_COUNT_BOUNDS: Record<SampleId, { min: number; max: number }> = {
  'indo-european': { min: 40, max: 60 },
  uralic: { min: 12, max: 15 },
  turkic: { min: 12, max: 15 },
  sinitic: { min: 8, max: 10 },
  japonic: { min: 5, max: 10 },
}

interface TreeShape {
  label: string
  branchLength: number | null
  metadata: Record<string, MetadataValue>
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
    metadata: node.metadata,
    children: node.childIds.map((childId) => getTreeShape(tree, childId)),
  }
}

function getRootToNodeDistance(tree: PhyloTree, nodeId: string): number {
  let distance = 0
  let current: TreeNodeData | undefined = tree.nodes[nodeId]

  while (current !== undefined && current.parentId !== null) {
    distance += current.branchLength ?? 0
    current = tree.nodes[current.parentId]
  }

  return distance
}

describe.each(SAMPLES)('sample fixture $fileName ($id)', (sample) => {
  it('parses without error and round-trips with preserved metadata types', () => {
    const tree = parse(sample.text)
    const serialized = serialize(tree)
    const roundTripped = parse(serialized)

    expect(XMLValidator.validate(serialized)).toBe(true)
    expect(getTreeShape(roundTripped)).toEqual(getTreeShape(tree))

    for (const node of Object.values(roundTripped.nodes)) {
      expect(node.label.trim().length).toBeGreaterThan(0)
      expect(typeof node.metadata.reconstructed).toBe('boolean')

      const isLeaf = node.childIds.length === 0
      if (isLeaf) {
        expect(node.metadata.reconstructed).toBe(false)
        expect(typeof node.metadata.speakers).toBe('number')
        expect(typeof node.metadata.nativeName).toBe('string')
        expect(String(node.metadata.nativeName).length).toBeGreaterThan(0)
      } else {
        expect(node.metadata.reconstructed).toBe(true)
        expect(node.metadata.nativeName).toBeUndefined()
      }

      if (node.metadata.iso639_3 !== undefined) {
        expect(typeof node.metadata.iso639_3).toBe('string')
      }
    }
  })

  it('satisfies the ultrametric time-tree invariants', () => {
    const tree = parse(sample.text)
    const root = tree.nodes[tree.rootId]

    expect(root).toBeDefined()
    expect(root?.branchLength).toBeNull()

    const livingDistances: number[] = []
    const extinctDistances: number[] = []
    const bounds = LEAF_COUNT_BOUNDS[sample.id]

    for (const node of Object.values(tree.nodes)) {
      if (node.id === tree.rootId) {
        expect(node.branchLength).toBeNull()
      } else {
        expect(typeof node.branchLength).toBe('number')
        expect(Number.isInteger(node.branchLength)).toBe(true)
        expect(node.branchLength).toBeGreaterThan(0)
      }

      if (node.childIds.length === 0) {
        const speakers = node.metadata.speakers
        expect(typeof speakers).toBe('number')

        const distance = getRootToNodeDistance(tree, node.id)
        if (typeof speakers === 'number' && speakers > 0) {
          livingDistances.push(distance)
        } else {
          expect(speakers).toBe(0)
          extinctDistances.push(distance)
        }
      }
    }

    const totalLeaves = livingDistances.length + extinctDistances.length
    expect(totalLeaves).toBeGreaterThanOrEqual(bounds.min)
    expect(totalLeaves).toBeLessThanOrEqual(bounds.max)
    expect(livingDistances.length).toBeGreaterThan(0)
    const familyAge = livingDistances[0]!

    for (const distance of livingDistances) {
      expect(distance).toBe(familyAge)
    }

    for (const distance of extinctDistances) {
      expect(distance).toBeLessThan(familyAge)
    }
  })
})

describe('sample pack coverage', () => {
  it('includes an astral-plane nativeName that survives round-trip', () => {
    const indoEuropean = SAMPLES.find((sample) => sample.id === 'indo-european')
    expect(indoEuropean).toBeDefined()

    const tree = parse(serialize(parse(indoEuropean!.text)))
    const gothic = Object.values(tree.nodes).find(
      (node) => node.label === 'Gothic',
    )

    expect(gothic?.metadata.nativeName).toBe('𐌲𐌿𐍄𐌹𐍃𐌺')
  })
})
