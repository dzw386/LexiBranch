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

  it('replaces the edit form when the selected node changes', () => {
    const { rerender } = render(
      <I18nextProvider i18n={i18n}>
        <NodeDetailsPanel node={node} branchLength={0.8} />
      </I18nextProvider>,
    )

    rerender(
      <I18nextProvider i18n={i18n}>
        <NodeDetailsPanel
          node={{
            ...node,
            id: 'english',
            data: { ...node.data, label: 'English' },
          }}
          branchLength={0.4}
        />
      </I18nextProvider>,
    )

    expect(screen.getAllByText('Edit node')).toHaveLength(1)
    expect((screen.getByLabelText('Label') as HTMLInputElement).value).toBe(
      'English',
    )
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
        'Branch length must be a number between 0 and 1,000,000.',
      ),
    ).toBeDefined()
    expect(labelChanges).toEqual([])
    expect(branchLengthChanges).toEqual([])
  })

  it('rejects branch lengths above the sanity cap', () => {
    const branchLengthChanges: Array<number | null> = []

    render(
      <I18nextProvider i18n={i18n}>
        <NodeDetailsPanel
          node={node}
          branchLength={0.8}
          onBranchLengthChange={(length) => branchLengthChanges.push(length)}
        />
      </I18nextProvider>,
    )

    expect(screen.getByLabelText('Branch length').getAttribute('max')).toBe(
      '1000000',
    )

    for (const invalid of ['1000000.5', '1e21', '999999999999999900000']) {
      fireEvent.change(screen.getByLabelText('Branch length'), {
        target: { value: invalid },
      })
      fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

      expect(
        screen.getByText(
          'Branch length must be a number between 0 and 1,000,000.',
        ),
      ).toBeDefined()
    }

    expect(branchLengthChanges).toEqual([])
  })

  it('accepts branch lengths up to the sanity cap', () => {
    const branchLengthChanges: Array<number | null> = []

    render(
      <I18nextProvider i18n={i18n}>
        <NodeDetailsPanel
          node={node}
          branchLength={0.8}
          onBranchLengthChange={(length) => branchLengthChanges.push(length)}
        />
      </I18nextProvider>,
    )

    fireEvent.change(screen.getByLabelText('Branch length'), {
      target: { value: '0' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    fireEvent.change(screen.getByLabelText('Branch length'), {
      target: { value: '1000000' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(branchLengthChanges).toEqual([0, 1000000])
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

  it('adds, edits, and removes typed metadata entries', () => {
    const addedMetadata: Array<[string, string | number | boolean]> = []
    const updatedMetadata: Array<[string, string, string | number | boolean]> =
      []
    const removedMetadata: string[] = []

    render(
      <I18nextProvider i18n={i18n}>
        <NodeDetailsPanel
          node={node}
          branchLength={0.8}
          onAddMetadata={(key, value) => addedMetadata.push([key, value])}
          onUpdateMetadata={(previousKey, key, value) =>
            updatedMetadata.push([previousKey, key, value])
          }
          onRemoveMetadata={(key) => removedMetadata.push(key)}
        />
      </I18nextProvider>,
    )

    fireEvent.change(screen.getByPlaceholderText('New key'), {
      target: { value: 'attested' },
    })
    fireEvent.change(
      screen.getByLabelText('Type', { selector: '#new-metadata-type' }),
      {
        target: { value: 'boolean' },
      },
    )
    fireEvent.change(
      screen.getByLabelText('Value', { selector: '#new-metadata-value' }),
      {
        target: { value: 'true' },
      },
    )
    fireEvent.click(screen.getByRole('button', { name: 'Add metadata' }))

    expect(addedMetadata).toEqual([['attested', true]])

    fireEvent.change(screen.getByDisplayValue('West Germanic'), {
      target: { value: 'West Germanic updated' },
    })
    fireEvent.click(
      screen.getByRole('button', { name: 'Save metadata: branch' }),
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'Remove metadata: confidence' }),
    )

    expect(updatedMetadata).toEqual([
      ['branch', 'branch', 'West Germanic updated'],
    ])
    expect(removedMetadata).toEqual(['confidence'])
  })

  it('rejects a duplicate metadata key before saving', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <NodeDetailsPanel node={node} branchLength={0.8} />
      </I18nextProvider>,
    )

    fireEvent.change(screen.getByPlaceholderText('New key'), {
      target: { value: 'branch' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add metadata' }))

    expect(screen.getByText('Metadata keys must be unique.')).toBeDefined()
  })

  it('disables all editing controls when isMoveMode is true', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <NodeDetailsPanel
          node={node}
          branchLength={0.8}
          isRoot={false}
          canMoveUp
          canMoveDown
          isMoveMode
          onLabelChange={() => undefined}
          onBranchLengthChange={() => undefined}
          onAddMetadata={() => undefined}
          onUpdateMetadata={() => undefined}
          onRemoveMetadata={() => undefined}
          onAddChild={() => undefined}
          onStartMove={() => undefined}
          onReorder={() => undefined}
          onRemoveSubtree={() => undefined}
        />
      </I18nextProvider>,
    )

    expect(screen.getByLabelText('Label').hasAttribute('disabled')).toBe(true)
    expect(
      screen.getByLabelText('Branch length').hasAttribute('disabled'),
    ).toBe(true)
    expect(
      screen
        .getByRole('button', { name: 'Save changes' })
        .hasAttribute('disabled'),
    ).toBe(true)
    expect(
      screen
        .getByRole('button', { name: 'Add child' })
        .hasAttribute('disabled'),
    ).toBe(true)
    expect(
      screen
        .getByRole('button', { name: 'Move subtree' })
        .hasAttribute('disabled'),
    ).toBe(true)
    expect(
      screen.getByRole('button', { name: 'Move up' }).hasAttribute('disabled'),
    ).toBe(true)
    expect(
      screen
        .getByRole('button', { name: 'Move down' })
        .hasAttribute('disabled'),
    ).toBe(true)
    expect(
      screen
        .getByRole('button', { name: 'Delete subtree' })
        .hasAttribute('disabled'),
    ).toBe(true)
    expect(
      screen.getByPlaceholderText('New key').hasAttribute('disabled'),
    ).toBe(true)
    expect(
      screen
        .getByRole('button', { name: 'Add metadata' })
        .hasAttribute('disabled'),
    ).toBe(true)
  })

  it('enables all editing controls when isMoveMode is false', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <NodeDetailsPanel
          node={node}
          branchLength={0.8}
          isRoot={false}
          canMoveUp
          canMoveDown
          onLabelChange={() => undefined}
          onBranchLengthChange={() => undefined}
          onAddMetadata={() => undefined}
          onUpdateMetadata={() => undefined}
          onRemoveMetadata={() => undefined}
          onAddChild={() => undefined}
          onStartMove={() => undefined}
          onReorder={() => undefined}
          onRemoveSubtree={() => undefined}
        />
      </I18nextProvider>,
    )

    expect(screen.getByLabelText('Label').hasAttribute('disabled')).toBe(false)
    expect(
      screen.getByLabelText('Branch length').hasAttribute('disabled'),
    ).toBe(false)
    expect(
      screen
        .getByRole('button', { name: 'Save changes' })
        .hasAttribute('disabled'),
    ).toBe(false)
    expect(
      screen
        .getByRole('button', { name: 'Add child' })
        .hasAttribute('disabled'),
    ).toBe(false)
    expect(
      screen
        .getByRole('button', { name: 'Move subtree' })
        .hasAttribute('disabled'),
    ).toBe(false)
    expect(
      screen.getByRole('button', { name: 'Move up' }).hasAttribute('disabled'),
    ).toBe(false)
    expect(
      screen
        .getByRole('button', { name: 'Move down' })
        .hasAttribute('disabled'),
    ).toBe(false)
    expect(
      screen
        .getByRole('button', { name: 'Delete subtree' })
        .hasAttribute('disabled'),
    ).toBe(false)
    expect(
      screen.getByPlaceholderText('New key').hasAttribute('disabled'),
    ).toBe(false)
    expect(
      screen
        .getByRole('button', { name: 'Add metadata' })
        .hasAttribute('disabled'),
    ).toBe(false)
  })
})
