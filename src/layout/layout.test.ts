import { describe, expect, it } from 'vitest'
import { layoutPhyloTree, layoutTree, type NestedTreeNode } from './layout'

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
      horizontalGap: 56,
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
        data: { branchLength: null, branchLabelX: 192 },
      },
      {
        id: 'root-right',
        source: 'root',
        target: 'right',
        type: 'phylo',
        data: { branchLength: null, branchLabelX: 192 },
      },
      {
        id: 'left-left-a',
        source: 'left',
        target: 'left-a',
        type: 'phylo',
        data: { branchLength: null, branchLabelX: 432 },
      },
      {
        id: 'left-left-b',
        source: 'left',
        target: 'left-b',
        type: 'phylo',
        data: { branchLength: null, branchLabelX: 432 },
      },
      {
        id: 'right-right-a',
        source: 'right',
        target: 'right-a',
        type: 'phylo',
        data: { branchLength: null, branchLabelX: 432 },
      },
      {
        id: 'right-right-b',
        source: 'right',
        target: 'right-b',
        type: 'phylo',
        data: { branchLength: null, branchLabelX: 432 },
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
    expect(edges[0]?.data).toEqual({ branchLength: 1.5, branchLabelX: 192 })
  })

  it('keeps a single-node tree at the origin', () => {
    const { nodes, edges } = layoutTree({ id: 'only', label: 'Only' })

    expect(nodes[0]?.position).toEqual({ x: 0, y: 0 })
    expect(edges).toEqual([])
  })

  it('aligns depth columns and keeps at least horizontalGap of clearance', () => {
    const { nodes } = layoutTree(testTree, {
      horizontalGap: 96,
      verticalSpacing: 80,
      nodeWidths: { left: 208 },
    })
    const positions = Object.fromEntries(
      nodes.map((node) => [node.id, node.position]),
    )

    expect(positions.left).toEqual({ x: 240, y: 40 })
    expect(positions.right).toEqual({ x: 240, y: 200 })
    expect(positions['left-a']).toEqual({ x: 544, y: 0 })
    expect(positions['right-b']).toEqual({ x: 544, y: 240 })
  })

  it('uses the default node width when a node has no measurement', () => {
    const { nodes } = layoutTree(testTree)

    expect(nodes.map((node) => node.position.x)).toEqual([
      0, 240, 480, 480, 240, 480, 480,
    ])
  })

  it('spaces leaf rows 120px apart by default', () => {
    const { nodes } = layoutTree(testTree)
    const positions = Object.fromEntries(
      nodes.map((node) => [node.id, node.position]),
    )

    expect(positions['left-a']).toEqual({ x: 480, y: 0 })
    expect(positions['left-b']).toEqual({ x: 480, y: 120 })
    expect(positions.left).toEqual({ x: 240, y: 60 })
    expect(positions.root).toEqual({ x: 0, y: 180 })
  })

  it('centers branch-length labels in the gap between the parent and child boxes', () => {
    const { edges } = layoutTree(testTree, {
      horizontalGap: 96,
      nodeWidths: { left: 208 },
    })
    const labelXById = Object.fromEntries(
      edges.map((edge) => [edge.id, edge.data?.branchLabelX]),
    )

    expect(labelXById['root-left']).toBe(192)
    expect(labelXById['left-left-a']).toBe(496)
    expect(labelXById['right-right-a']).toBe(464)
  })

  it('anchors every node at its left edge', () => {
    const { nodes } = layoutTree(testTree)

    expect(
      nodes.every(
        (node) =>
          node.sourcePosition === 'left' && node.targetPosition === 'left',
      ),
    ).toBe(true)
  })

  it('lays out the normalized tree used by the application', () => {
    const { nodes, edges } = layoutPhyloTree({
      rootId: 'root',
      nodes: {
        root: {
          id: 'root',
          parentId: null,
          childIds: ['leaf'],
          label: 'Root',
          branchLength: null,
          metadata: {},
        },
        leaf: {
          id: 'leaf',
          parentId: 'root',
          childIds: [],
          label: 'Leaf',
          branchLength: 1.5,
          metadata: { iso: 'lxx' },
        },
      },
    })

    expect(nodes.map((node) => node.data)).toEqual([
      { label: 'Root', metadata: {} },
      { label: 'Leaf', metadata: { iso: 'lxx' } },
    ])
    expect(edges[0]?.data).toEqual({ branchLength: 1.5, branchLabelX: 192 })
  })
})
