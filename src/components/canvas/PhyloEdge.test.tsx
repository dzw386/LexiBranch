import { cleanup, render, screen } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it } from 'vitest'
import {
  Position,
  ReactFlow,
  ReactFlowProvider,
  type EdgeProps,
} from '@xyflow/react'
import type { PhyloFlowEdge } from '../../layout/layout'
import { PhyloNode } from './PhyloNode'
import { PhyloEdge } from './PhyloEdge'

const edgeProps: EdgeProps<PhyloFlowEdge> = {
  id: 'root-english',
  type: 'phylo',
  source: 'root',
  target: 'english',
  sourceX: 0,
  sourceY: 50,
  targetX: 240,
  targetY: 0,
  sourcePosition: Position.Right,
  targetPosition: Position.Left,
  data: { branchLength: 1.5 },
  animated: false,
  selected: false,
  selectable: true,
  deletable: true,
}

const flowNodes = [
  {
    id: 'root',
    type: 'phylo' as const,
    position: { x: 0, y: 0 },
    width: 100,
    height: 40,
    data: { label: 'Root', metadata: {} },
    handles: [
      {
        type: 'source' as const,
        position: Position.Right,
        x: 100,
        y: 20,
        width: 1,
        height: 1,
      },
    ],
  },
  {
    id: 'english',
    type: 'phylo' as const,
    position: { x: 240, y: 0 },
    width: 100,
    height: 40,
    data: { label: 'English', metadata: {} },
    handles: [
      {
        type: 'target' as const,
        position: Position.Left,
        x: 0,
        y: 20,
        width: 1,
        height: 1,
      },
    ],
  },
]

describe('PhyloEdge', () => {
  afterEach(cleanup)

  it('renders a sharp stepped path', () => {
    const markup = renderToStaticMarkup(
      <ReactFlowProvider>
        <PhyloEdge {...edgeProps} data={{ branchLength: null }} />
      </ReactFlowProvider>,
    )

    expect(markup).toContain('phylo-edge')
    expect(markup).toContain('L')
  })

  it('renders branch-length labels in the edge label layer', async () => {
    render(
      <ReactFlow
        nodes={flowNodes}
        edges={[edgeProps]}
        nodeTypes={{ phylo: PhyloNode }}
        edgeTypes={{ phylo: PhyloEdge }}
      />,
    )

    const label = await screen.findByText('1.5')

    expect(label.classList.contains('phylo-edge__label')).toBe(true)
    expect(document.querySelector('.phylo-edge')).not.toBeNull()
  })

  it('omits the label when branch length is not present', () => {
    const markup = renderToStaticMarkup(
      <ReactFlowProvider>
        <PhyloEdge {...edgeProps} data={{ branchLength: null }} />
      </ReactFlowProvider>,
    )

    expect(markup).not.toContain('phylo-edge__label')
  })
})
