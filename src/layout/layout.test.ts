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

describe('layoutTree in phylogram mode', () => {
  function positionsById(
    nodes: ReturnType<typeof layoutTree>['nodes'],
  ): Record<string, { x: number; y: number }> {
    return Object.fromEntries(
      nodes.map((node) => [node.id, node.position] as const),
    )
  }

  it('positions nodes by cumulative branch length scaled to the target width', () => {
    const { nodes } = layoutTree(
      {
        id: 'root',
        label: 'Root',
        children: [
          {
            id: 'a',
            label: 'A',
            branchLength: 0.5,
            children: [{ id: 'a1', label: 'A1', branchLength: 0.5 }],
          },
          { id: 'b', label: 'B', branchLength: 1 },
        ],
      },
      { mode: 'phylogram' },
    )
    const positions = positionsById(nodes)

    expect(positions.root).toEqual({ x: 0, y: 60 })
    expect(positions.a).toEqual({ x: 600, y: 0 })
    expect(positions.a1).toEqual({ x: 1200, y: 0 })
    expect(positions.b).toEqual({ x: 1200, y: 120 })
  })

  it('treats missing branch lengths as 1', () => {
    const { nodes } = layoutTree(
      {
        id: 'root',
        label: 'Root',
        children: [
          {
            id: 'x',
            label: 'X',
            children: [{ id: 'x1', label: 'X1' }],
          },
          { id: 'y', label: 'Y', branchLength: 2 },
        ],
      },
      { mode: 'phylogram' },
    )
    const positions = positionsById(nodes)

    expect(positions.x).toEqual({ x: 600, y: 0 })
    expect(positions.x1).toEqual({ x: 1200, y: 0 })
    expect(positions.y).toEqual({ x: 1200, y: 120 })
  })

  it('draws zero-length branches as a 24px stub', () => {
    const { nodes } = layoutTree(
      {
        id: 'root',
        label: 'Root',
        children: [
          { id: 'a', label: 'A', branchLength: 0 },
          { id: 'b', label: 'B', branchLength: 1 },
        ],
      },
      { mode: 'phylogram' },
    )
    const positions = positionsById(nodes)

    expect(positions.a?.x).toBe(24)
    expect(positions.b?.x).toBe(1200)
  })

  it('pushes a single-child chain past the parent box', () => {
    const { nodes, edges } = layoutTree(
      {
        id: 'root',
        label: 'Root',
        children: [
          {
            id: 'a',
            label: 'A',
            branchLength: 0.05,
            children: [{ id: 'a1', label: 'A1', branchLength: 1.45 }],
          },
        ],
      },
      { mode: 'phylogram' },
    )
    const positions = positionsById(nodes)

    expect(positions.root).toEqual({ x: 0, y: 0 })
    expect(positions.a).toEqual({ x: 168, y: 0 })
    expect(positions.a1).toEqual({ x: 1328, y: 0 })
    expect(edges[0]?.data).toEqual({ branchLength: 0.05, branchLabelX: 156 })
  })

  it('pushes the middle child of an odd fan past the parent box', () => {
    const { nodes } = layoutTree(
      {
        id: 'root',
        label: 'Root',
        children: [
          { id: 'a', label: 'A', branchLength: 1 },
          { id: 'm', label: 'M', branchLength: 0.001 },
          { id: 'c', label: 'C', branchLength: 1 },
        ],
      },
      { mode: 'phylogram' },
    )
    const positions = positionsById(nodes)

    expect(positions.m).toEqual({ x: 168, y: 120 })
    expect(positions.a?.x).toBe(1200)
    expect(positions.c?.x).toBe(1200)
  })
})
