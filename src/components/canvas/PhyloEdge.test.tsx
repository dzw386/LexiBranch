import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Position, type EdgeProps } from '@xyflow/react'
import type { PhyloFlowEdge } from '../../layout/layout'
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

describe('PhyloEdge', () => {
  it('renders a sharp stepped path and branch-length label', () => {
    const markup = renderToStaticMarkup(<PhyloEdge {...edgeProps} />)

    expect(markup).toContain('phylo-edge')
    expect(markup).toContain('L')
    expect(markup).toContain('react-flow__edge-text')
    expect(markup).toContain('1.5')
  })

  it('omits the label when branch length is not present', () => {
    const markup = renderToStaticMarkup(
      <PhyloEdge {...edgeProps} data={{ branchLength: null }} />,
    )

    expect(markup).not.toContain('react-flow__edge-text')
  })
})
