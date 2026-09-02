import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { I18nextProvider } from 'react-i18next'
import type { ComponentProps } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
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
  options: Pick<
    ComponentProps<typeof NodeDetailsPanel>,
    'isRoot' | 'onLabelChange' | 'onBranchLengthChange'
  > = {},
): string {
  return renderToStaticMarkup(
    <I18nextProvider i18n={i18n}>
      <NodeDetailsPanel
        node={selectedNode}
        branchLength={branchLength}
        {...options}
      />
    </I18nextProvider>,
  )
}

describe('NodeDetailsPanel', () => {
  afterEach(cleanup)

  it('prompts the user to select a node when there is no selection', () => {
    const markup = renderPanel(null, null)

    expect(markup).toContain('Node details')
    expect(markup).toContain('Select a node to view its details.')
  })

  it('renders selected node data with editable details', () => {
    const markup = renderPanel(node, 0.8)

    expect(markup).toContain('Germanic')
    expect(markup).toContain('germanic')
    expect(markup).toContain('0.8')
    expect(markup).toContain('branch')
    expect(markup).toContain('West Germanic')
    expect(markup).toContain('confidence')
    expect(markup).toContain('0.98')
    expect(markup).toContain('Edit node')
    expect(markup).toContain('<input')
    expect(markup).toContain('Save changes')
  })

  it('shows when branch length and metadata are absent', () => {
    const markup = renderPanel(
      { ...node, data: { label: 'Root', metadata: {} } },
      null,
    )

    expect(markup).toContain('Not specified')
    expect(markup).toContain('No metadata')
  })

  it('reports invalid labels and branch lengths without invoking changes', () => {
    const labelChanges: string[] = []
    const branchLengthChanges: Array<number | null> = []

    render(
      <I18nextProvider i18n={i18n}>
        <NodeDetailsPanel
          node={node}
          branchLength={0.8}
          onLabelChange={(label) => labelChanges.push(label)}
          onBranchLengthChange={(length) => branchLengthChanges.push(length)}
        />
      </I18nextProvider>,
    )

    fireEvent.change(screen.getByLabelText('Label'), {
      target: { value: '   ' },
    })
    fireEvent.change(screen.getByLabelText('Branch length'), {
      target: { value: '-1' },
    })

    expect(screen.getByText('Label cannot be empty.')).toBeDefined()
    expect(
      screen.getByText(
        'Branch length must be a number greater than or equal to 0.',
      ),
    ).toBeDefined()
    expect(labelChanges).toEqual([])
    expect(branchLengthChanges).toEqual([])
  })

  it('holds valid edits until save and treats an empty length as unspecified', () => {
    const labelChanges: string[] = []
    const branchLengthChanges: Array<number | null> = []

    render(
      <I18nextProvider i18n={i18n}>
        <NodeDetailsPanel
          node={node}
          branchLength={0.8}
          onLabelChange={(label) => labelChanges.push(label)}
          onBranchLengthChange={(length) => branchLengthChanges.push(length)}
        />
      </I18nextProvider>,
    )

    fireEvent.change(screen.getByLabelText('Label'), {
      target: { value: 'North Germanic' },
    })
    fireEvent.change(screen.getByLabelText('Branch length'), {
      target: { value: '1.25' },
    })
    fireEvent.change(screen.getByLabelText('Branch length'), {
      target: { value: '' },
    })

    expect(labelChanges).toEqual([])
    expect(branchLengthChanges).toEqual([])

    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(labelChanges).toEqual(['North Germanic'])
    expect(branchLengthChanges).toEqual([null])
  })
})
