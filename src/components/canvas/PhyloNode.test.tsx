import { renderToStaticMarkup } from 'react-dom/server'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Position, ReactFlow } from '@xyflow/react'
import i18n from '../../i18n'
import type { PhyloFlowNode } from '../../layout/layout'
import { createTreeHistory } from '../../state/history'
import { createInitialTree, useTreeStore } from '../../state/store'
import { PhyloNode } from './PhyloNode'

const node: PhyloFlowNode = {
  id: 'english',
  type: 'phylo',
  position: { x: 0, y: 0 },
  data: { label: 'English', metadata: {} },
  sourcePosition: Position.Left,
  targetPosition: Position.Left,
}

const baseData: PhyloFlowNode['data'] = {
  label: 'English',
  metadata: {},
  collapsed: false,
  hiddenDescendantCount: 0,
  hasChildren: true,
}

function renderNode(
  data: Partial<PhyloFlowNode['data']> = {},
  selected = false,
): string {
  return renderToStaticMarkup(
    <I18nextProvider i18n={i18n}>
      <ReactFlow
        nodes={[{ ...node, data: { ...baseData, ...data }, selected }]}
        edges={[]}
        nodeTypes={{ phylo: PhyloNode }}
      />
    </I18nextProvider>,
  )
}

describe('PhyloNode', () => {
  beforeEach(() => {
    useTreeStore.setState({
      tree: createInitialTree(),
      history: createTreeHistory(),
      collapsedNodeIds: [],
      selectedNodeId: null,
      pendingMoveNodeId: null,
    })
  })

  afterEach(cleanup)

  it('renders the node label, connection handles, and collapse control', () => {
    const markup = renderNode()

    expect(markup).toContain('English')
    expect(markup).toContain('title="English"')
    expect(markup).toContain('react-flow__handle-left')
    expect(markup).not.toContain('react-flow__handle-right')
    expect(markup).not.toContain('phylo-node__metadata-badge')
    expect(markup).toContain('Collapse subtree of “English”')
    expect(markup).toContain('aria-expanded="true"')
  })

  it('renders a count badge when node metadata exists', () => {
    const markup = renderNode({
      metadata: { iso: 'eng', family: 'Germanic' },
    })

    expect(markup).toContain('phylo-node__metadata-badge')
    expect(markup).toMatch(/phylo-node__metadata-badge[^>]*>2<\/span>/)
  })

  it('indicates a collapsed subtree with a dashed box and hidden-node count', () => {
    const markup = renderNode({
      collapsed: true,
      hiddenDescendantCount: 2,
    })

    expect(markup).toContain('phylo-node--collapsed')
    expect(markup).toContain('phylo-node__collapse-badge')
    expect(markup).toContain('aria-expanded="false"')
    expect(markup).toContain('Expand subtree of “English”')
    expect(markup).toMatch(/phylo-node__collapse-badge[^>]*>2<\/span>/)
  })

  it('does not render a collapse control for leaf nodes', () => {
    const markup = renderNode({ hasChildren: false })

    expect(markup).not.toContain('phylo-node__collapse-toggle')
  })

  it('highlights a selected node', () => {
    const markup = renderNode({}, true)

    expect(markup).toContain('ring-2 ring-ring')
  })

  it('toggles a parent from its control without selecting the node', async () => {
    render(
      <I18nextProvider i18n={i18n}>
        <ReactFlow
          nodes={[
            {
              ...node,
              id: 'germanic',
              data: { ...baseData, label: 'Germanic' },
            },
          ]}
          edges={[]}
          nodeTypes={{ phylo: PhyloNode }}
        />
      </I18nextProvider>,
    )

    fireEvent.click(
      await screen.findByLabelText('Collapse subtree of “Germanic”'),
    )

    expect(useTreeStore.getState().collapsedNodeIds).toEqual(['germanic'])
    expect(useTreeStore.getState().selectedNodeId).toBeNull()
  })
})
