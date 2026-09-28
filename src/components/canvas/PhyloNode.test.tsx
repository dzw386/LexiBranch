import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Position, ReactFlow } from '@xyflow/react'
import type { PhyloFlowNode } from '../../layout/layout'
import { PhyloNode } from './PhyloNode'

const node: PhyloFlowNode = {
  id: 'english',
  type: 'phylo',
  position: { x: 0, y: 0 },
  data: { label: 'English', metadata: {} },
  sourcePosition: Position.Left,
  targetPosition: Position.Left,
}

function renderNode(data: PhyloFlowNode['data'], selected = false): string {
  return renderToStaticMarkup(
    <ReactFlow
      nodes={[{ ...node, data, selected }]}
      edges={[]}
      nodeTypes={{ phylo: PhyloNode }}
    />,
  )
}

describe('PhyloNode', () => {
  it('renders the node label and connection handles', () => {
    const markup = renderNode(node.data)

    expect(markup).toContain('English')
    expect(markup).toContain('title="English"')
    expect(markup).toContain('react-flow__handle-left')
    expect(markup).not.toContain('react-flow__handle-right')
    expect(markup).not.toContain('phylo-node__metadata-badge')
  })

  it('renders a count badge when node metadata exists', () => {
    const markup = renderNode({
      label: 'English',
      metadata: { iso: 'eng', family: 'Germanic' },
    })

    expect(markup).toContain('phylo-node__metadata-badge')
    expect(markup).toMatch(/phylo-node__metadata-badge[^>]*>2<\/span>/)
  })

  it('highlights a selected node', () => {
    const markup = renderNode(node.data, true)

    expect(markup).toContain('ring-2 ring-ring')
  })
})
