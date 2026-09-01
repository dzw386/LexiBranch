import { renderToStaticMarkup } from 'react-dom/server'
import { I18nextProvider } from 'react-i18next'
import { describe, expect, it } from 'vitest'
import type { PhyloFlowNode } from '../../layout/layout'
import i18n from '../../i18n'
import { NodeDetailsPanel } from './NodeDetailsPanel'

const node: PhyloFlowNode = {
  id: 'germanic',
  type: 'phylo',
  position: { x: 0, y: 0 },
  data: {
    label: 'Germanic',
    metadata: { branch: 'West Germanic', confidence: 0.98 },
  },
}

function renderPanel(
  selectedNode: PhyloFlowNode | null,
  branchLength: number | null,
): string {
  return renderToStaticMarkup(
    <I18nextProvider i18n={i18n}>
      <NodeDetailsPanel node={selectedNode} branchLength={branchLength} />
    </I18nextProvider>,
  )
}

describe('NodeDetailsPanel', () => {
  it('prompts the user to select a node when there is no selection', () => {
    const markup = renderPanel(null, null)

    expect(markup).toContain('Node details')
    expect(markup).toContain('Select a node to view its details.')
  })

  it('renders selected node data as read-only details', () => {
    const markup = renderPanel(node, 0.8)

    expect(markup).toContain('Germanic')
    expect(markup).toContain('germanic')
    expect(markup).toContain('0.8')
    expect(markup).toContain('branch')
    expect(markup).toContain('West Germanic')
    expect(markup).toContain('confidence')
    expect(markup).toContain('0.98')
    expect(markup).not.toContain('<input')
    expect(markup).not.toContain('<button')
  })

  it('shows when branch length and metadata are absent', () => {
    const markup = renderPanel(
      { ...node, data: { label: 'Root', metadata: {} } },
      null,
    )

    expect(markup).toContain('Not specified')
    expect(markup).toContain('No metadata')
  })
})
