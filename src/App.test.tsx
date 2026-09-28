import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { I18nextProvider } from 'react-i18next'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'
import { layoutPhyloTree } from './layout/layout'
import i18n from './i18n'
import { createInitialTree, useTreeStore } from './state/store'

function renderApp() {
  return renderToStaticMarkup(
    <I18nextProvider i18n={i18n}>
      <App />
    </I18nextProvider>,
  )
}

function mountApp() {
  return render(
    <I18nextProvider i18n={i18n}>
      <App />
    </I18nextProvider>,
  )
}

function countRenderedNodes(): number {
  return document.querySelectorAll('.react-flow__node').length
}

describe('App', () => {
  afterEach(async () => {
    cleanup()
    useTreeStore.setState({
      tree: createInitialTree(),
      selectedNodeId: null,
      pendingMoveNodeId: null,
      viewMode: 'cladogram',
    })
    await i18n.changeLanguage('en')
  })

  it('renders the initial React Flow tree', () => {
    const markup = renderApp()
    const { nodes, edges } = layoutPhyloTree(createInitialTree())

    expect(nodes).toHaveLength(7)
    expect(nodes.map((node) => node.data.label)).toEqual(
      expect.arrayContaining([
        'Proto-language',
        'Germanic',
        'Slavic',
        'English',
        'German',
        'Polish',
        'Russian',
      ]),
    )
    expect(edges).toHaveLength(6)
    expect(markup).toContain('react-flow')
    expect(markup).toContain('react-flow__background')
    expect(markup).toContain('react-flow__controls')
    expect(edges.every((edge) => edge.type === 'phylo')).toBe(true)
    expect(edges.some((edge) => edge.data?.branchLength === 0.8)).toBe(true)
  })

  it('renders the app shell around the canvas', () => {
    const markup = renderApp()

    expect(markup).toContain('<header')
    expect(markup).toContain('LexiBranch')
    expect(markup).toContain('New tree')
    expect(markup).toContain('Import')
    expect(markup).toContain('Export')
    expect(markup).toContain('Tree tools sidebar')
    expect(markup).toContain('Phylogenetic tree canvas')
  })

  it('switches between cladogram and phylogram view modes', () => {
    mountApp()

    expect(
      screen
        .getByRole('button', { name: 'Cladogram' })
        .getAttribute('aria-pressed'),
    ).toBe('true')
    expect(useTreeStore.getState().viewMode).toBe('cladogram')

    fireEvent.click(screen.getByRole('button', { name: 'Phylogram' }))
    expect(useTreeStore.getState().viewMode).toBe('phylogram')
    expect(
      screen
        .getByRole('button', { name: 'Phylogram' })
        .getAttribute('aria-pressed'),
    ).toBe('true')

    fireEvent.click(screen.getByRole('button', { name: 'Cladogram' }))
    expect(useTreeStore.getState().viewMode).toBe('cladogram')
    expect(
      screen
        .getByRole('button', { name: 'Cladogram' })
        .getAttribute('aria-pressed'),
    ).toBe('true')
  })

  it('renders translated shell text when the language changes', async () => {
    await i18n.changeLanguage('pl')

    const markup = renderApp()

    expect(markup).toContain('Nowe drzewo')
    expect(markup).toContain('Importuj')
    expect(markup).toContain('Eksportuj')
    expect(markup).toContain('Panel narzędzi drzewa')
    expect(markup).toContain('Obszar drzewa filogenetycznego')
    expect(markup).toContain('Elementy sterujące widokiem drzewa')
  })

  it('renders the node details panel before a node is selected', () => {
    const markup = renderApp()

    expect(markup).toContain('Node details')
    expect(markup).toContain('Select a node to view its details.')
  })

  it('shows the clicked node data in the details panel', async () => {
    mountApp()

    await screen.findByText('Germanic')
    fireEvent.click(screen.getByText('Germanic'))

    expect(await screen.findByDisplayValue('West Germanic')).toBeDefined()
    expect(screen.getByText('germanic')).toBeDefined()
  })

  it('replaces the details form when selection changes', async () => {
    mountApp()

    await screen.findByText('Germanic')
    fireEvent.click(screen.getByText('Germanic'))
    expect(screen.getAllByText('Edit node')).toHaveLength(1)

    fireEvent.click(screen.getByText('English'))

    expect(screen.getAllByText('Edit node')).toHaveLength(1)
    expect((screen.getByLabelText('Label') as HTMLInputElement).value).toBe(
      'English',
    )
  })

  it('clears the details panel when clicking the empty canvas', async () => {
    mountApp()

    await screen.findByText('Germanic')
    fireEvent.click(screen.getByText('Germanic'))
    await screen.findByDisplayValue('West Germanic')

    fireEvent.click(document.querySelector('.react-flow__pane')!)
    await screen.findByText('Select a node to view its details.')
  })

  it('updates the selected node and its branch length on valid edits', async () => {
    mountApp()

    await screen.findByText('Germanic')
    fireEvent.click(screen.getByText('Germanic'))

    fireEvent.change(await screen.findByLabelText('Label'), {
      target: { value: 'North Germanic' },
    })
    fireEvent.change(screen.getByLabelText('Branch length'), {
      target: { value: '1.25' },
    })

    expect(screen.getByText('Germanic')).toBeDefined()
    expect(
      (screen.getByLabelText('Branch length') as HTMLInputElement).value,
    ).toBe('1.25')
    expect(useTreeStore.getState().tree.nodes.germanic).toMatchObject({
      label: 'Germanic',
      branchLength: 0.8,
    })

    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('North Germanic')).toBeDefined()
    expect(useTreeStore.getState().tree.nodes.germanic).toMatchObject({
      label: 'North Germanic',
      branchLength: 1.25,
    })
  })

  it('keeps the canvas value when an edit is invalid', async () => {
    mountApp()

    await screen.findByText('Germanic')
    fireEvent.click(screen.getByText('Germanic'))

    fireEvent.change(await screen.findByLabelText('Label'), {
      target: { value: '' },
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
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(screen.getByText('Germanic')).toBeDefined()
    expect(useTreeStore.getState().tree.nodes.germanic).toMatchObject({
      label: 'Germanic',
      branchLength: 0.8,
    })
  })

  it('adds a child node to the selected node and re-renders the canvas', async () => {
    mountApp()

    await screen.findByText('Germanic')
    expect(countRenderedNodes()).toBe(7)

    fireEvent.click(screen.getByText('Germanic'))
    fireEvent.click(await screen.findByRole('button', { name: 'Add child' }))

    const { tree, selectedNodeId } = useTreeStore.getState()
    expect(tree.nodes.germanic?.childIds).toHaveLength(3)
    expect(selectedNodeId).not.toBeNull()
    expect(tree.nodes[selectedNodeId ?? '']?.parentId).toBe('germanic')
    await waitFor(() => expect(countRenderedNodes()).toBe(8))
  })

  it('deletes a subtree only after confirmation', async () => {
    mountApp()

    await screen.findByText('German')
    fireEvent.click(screen.getByText('German'))
    fireEvent.click(
      await screen.findByRole('button', { name: 'Delete subtree' }),
    )

    const dialog = await screen.findByRole('dialog')
    expect(dialog.textContent).toContain('permanently delete “German”')

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(useTreeStore.getState().tree.nodes.german).toBeDefined()
    expect(countRenderedNodes()).toBe(7)

    fireEvent.click(screen.getByRole('button', { name: 'Delete subtree' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }))

    expect(useTreeStore.getState().tree.nodes.german).toBeUndefined()
    expect(useTreeStore.getState().selectedNodeId).toBe('germanic')
    await waitFor(() => expect(countRenderedNodes()).toBe(6))
  })

  it('moves a subtree onto a parent picked from the canvas', async () => {
    mountApp()

    await screen.findByText('English')
    fireEvent.click(screen.getByText('English'))
    fireEvent.click(await screen.findByRole('button', { name: 'Move subtree' }))

    expect(await screen.findByRole('status')).toBeDefined()
    expect(screen.getByText('Pick a new parent for “English”.')).toBeDefined()

    fireEvent.click(screen.getByText('Slavic'))

    const { tree, pendingMoveNodeId, selectedNodeId } = useTreeStore.getState()
    expect(tree.nodes.english?.parentId).toBe('slavic')
    expect(tree.nodes.slavic?.childIds).toContain('english')
    expect(tree.nodes.germanic?.childIds).not.toContain('english')
    expect(pendingMoveNodeId).toBeNull()
    expect(selectedNodeId).toBe('english')
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('rejects moving a node under its own descendant and keeps the mode', async () => {
    mountApp()

    await screen.findByText('Germanic')
    fireEvent.click(screen.getByText('Germanic'))
    fireEvent.click(await screen.findByRole('button', { name: 'Move subtree' }))
    await screen.findByRole('status')

    fireEvent.click(screen.getByText('English'))

    expect(
      screen.getByText('“Germanic” cannot be moved under its own descendant.'),
    ).toBeDefined()
    expect(useTreeStore.getState().pendingMoveNodeId).toBe('germanic')
    expect(useTreeStore.getState().selectedNodeId).toBe('germanic')
    expect((screen.getByLabelText('Label') as HTMLInputElement).value).toBe(
      'Germanic',
    )
    expect(useTreeStore.getState().tree.nodes.germanic?.parentId).toBe(
      'proto-language',
    )

    fireEvent.keyDown(window, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull())
    expect(useTreeStore.getState().pendingMoveNodeId).toBeNull()
  })

  it('reorders siblings from the details panel', async () => {
    mountApp()

    await screen.findByText('German')
    fireEvent.click(screen.getByText('German'))

    fireEvent.click(await screen.findByRole('button', { name: 'Move up' }))
    expect(useTreeStore.getState().tree.nodes.germanic?.childIds).toEqual([
      'german',
      'english',
    ])

    fireEvent.click(screen.getByRole('button', { name: 'Move down' }))
    expect(useTreeStore.getState().tree.nodes.germanic?.childIds).toEqual([
      'english',
      'german',
    ])
  })

  it('round-trips typed metadata through the store and updates the node badge', async () => {
    mountApp()

    await screen.findByText('Germanic')
    fireEvent.click(screen.getByText('Germanic'))

    fireEvent.change(screen.getByPlaceholderText('New key'), {
      target: { value: 'confidence' },
    })
    fireEvent.change(
      screen.getByLabelText('Type', { selector: '#new-metadata-type' }),
      {
        target: { value: 'number' },
      },
    )
    fireEvent.change(
      screen.getByLabelText('Value', { selector: '#new-metadata-value' }),
      {
        target: { value: '0.98' },
      },
    )
    fireEvent.click(screen.getByRole('button', { name: 'Add metadata' }))

    expect(useTreeStore.getState().tree.nodes.germanic?.metadata).toEqual({
      branch: 'West Germanic',
      confidence: 0.98,
    })
    await waitFor(() => {
      expect(
        document.querySelector(
          '[data-id="germanic"] .phylo-node__metadata-badge',
        )?.textContent,
      ).toBe('2')
    })
  })

  it('disables sidebar editing controls while pendingMoveNodeId is set', async () => {
    mountApp()

    await screen.findByText('English')
    fireEvent.click(screen.getByText('English'))
    fireEvent.click(await screen.findByRole('button', { name: 'Move subtree' }))

    expect(await screen.findByRole('status')).toBeDefined()
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

    fireEvent.click(screen.getByText('Slavic'))
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull())
    expect(screen.getByLabelText('Label').hasAttribute('disabled')).toBe(false)
    expect(
      screen
        .getByRole('button', { name: 'Add child' })
        .hasAttribute('disabled'),
    ).toBe(false)
  })
})
