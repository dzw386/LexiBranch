import { describe, expect, it } from 'vitest'
import { layoutTree, type NestedTreeNode } from './layout'

const testTree: NestedTreeNode = {
  id: 'root',
  label: 'Root',
  children: [
    {
      id: 'left',
      label: 'Left',
      children: [
        { id: 'left-a', label: 'Left A' },
        { id: 'left-b', label: 'Left B' },
      ],
    },
    {
      id: 'right',
      label: 'Right',
      children: [
        { id: 'right-a', label: 'Right A' },
        { id: 'right-b', label: 'Right B' },
      ],
    },
  ],
}

describe('layoutTree', () => {
  it('places leaves in depth-first order and centers internal nodes', () => {
    const { nodes } = layoutTree(testTree, {
      horizontalSpacing: 200,
      verticalSpacing: 80,
    })

    expect(nodes.map((node) => node.id)).toEqual([
      'root',
      'left',
      'left-a',
      'left-b',
      'right',
      'right-a',
      'right-b',
    ])
    expect(nodes.map((node) => [node.id, node.position])).toEqual([
      ['root', { x: 0, y: 120 }],
      ['left', { x: 200, y: 40 }],
      ['left-a', { x: 400, y: 0 }],
      ['left-b', { x: 400, y: 80 }],
      ['right', { x: 200, y: 200 }],
      ['right-a', { x: 400, y: 160 }],
      ['right-b', { x: 400, y: 240 }],
    ])
  })

  it('maps every parent-child relationship to a phylogenetic edge', () => {
    const { edges } = layoutTree(testTree)

    expect(edges).toEqual([
      {
        id: 'root-left',
        source: 'root',
        target: 'left',
        type: 'phylo',
        data: { branchLength: null },
      },
      {
        id: 'root-right',
        source: 'root',
        target: 'right',
        type: 'phylo',
        data: { branchLength: null },
      },
      {
        id: 'left-left-a',
        source: 'left',
        target: 'left-a',
        type: 'phylo',
        data: { branchLength: null },
      },
      {
        id: 'left-left-b',
        source: 'left',
        target: 'left-b',
        type: 'phylo',
        data: { branchLength: null },
      },
      {
        id: 'right-right-a',
        source: 'right',
        target: 'right-a',
        type: 'phylo',
        data: { branchLength: null },
      },
      {
        id: 'right-right-b',
        source: 'right',
        target: 'right-b',
        type: 'phylo',
        data: { branchLength: null },
      },
    ])
  })

  it('carries metadata to nodes and branch lengths to child edges', () => {
    const { nodes, edges } = layoutTree({
      id: 'root',
      label: 'Root',
      metadata: { clade: 'example' },
      children: [
        {
          id: 'leaf',
          label: 'Leaf',
          branchLength: 1.5,
          metadata: { iso: 'lxx' },
        },
      ],
    })

    expect(nodes[0]?.data).toEqual({
      label: 'Root',
      metadata: { clade: 'example' },
    })
    expect(nodes[1]?.data).toEqual({
      label: 'Leaf',
      metadata: { iso: 'lxx' },
    })
    expect(edges[0]?.data).toEqual({ branchLength: 1.5 })
  })

  it('keeps a single-node tree at the origin', () => {
    const { nodes, edges } = layoutTree({ id: 'only', label: 'Only' })

    expect(nodes[0]?.position).toEqual({ x: 0, y: 0 })
    expect(edges).toEqual([])
  })
})
