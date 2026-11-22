import { useState } from 'react'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { afterEach, describe, expect, it } from 'vitest'
import { createInitialTree } from '../../state/store'
import { searchTree, type SearchScope } from '../../domain/search'
import i18n from '../../i18n'
import type { PhyloTree } from '../../domain/types'
import { SearchDialog } from './SearchDialog'

function SearchHarness({ tree }: { tree: PhyloTree }) {
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState<SearchScope>('all')
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const results = searchTree(tree, query, scope)

  return (
    <I18nextProvider i18n={i18n}>
      <SearchDialog
        query={query}
        scope={scope}
        results={results}
        onQueryChange={setQuery}
        onScopeChange={setScope}
        onSelectResult={setSelectedNodeId}
      />
      <output data-testid="selected-node">{selectedNodeId ?? ''}</output>
    </I18nextProvider>
  )
}

function openSearch(): HTMLElement {
  fireEvent.click(screen.getByRole('button', { name: 'Search' }))

  return screen.getByRole('dialog')
}

describe('SearchDialog', () => {
  afterEach(cleanup)

  it('searches labels and metadata and shows metadata matches', () => {
    render(<SearchHarness tree={createInitialTree()} />)

    const dialog = openSearch()
    fireEvent.change(within(dialog).getByLabelText('Query'), {
      target: { value: 'German' },
    })

    expect(within(dialog).getByText('2 matching nodes')).toBeDefined()
    expect(
      within(dialog).getByRole('button', {
        name: /^Germanic \(branch: West Germanic\)$/u,
      }),
    ).toBeDefined()
    expect(
      within(dialog).getByRole('button', { name: /^German$/u }),
    ).toBeDefined()
  })

  it('filters by the selected scope', () => {
    render(<SearchHarness tree={createInitialTree()} />)

    const dialog = openSearch()
    const queryInput = within(dialog).getByLabelText('Query')
    const scopeSelect = within(dialog).getByLabelText('Search in')

    fireEvent.change(queryInput, { target: { value: 'West' } })
    expect(
      within(dialog).getByRole('button', {
        name: /^Germanic \(branch: West Germanic\)$/u,
      }),
    ).toBeDefined()

    fireEvent.change(scopeSelect, { target: { value: 'label' } })
    expect(within(dialog).getByText('No nodes match “West”.')).toBeDefined()

    fireEvent.change(scopeSelect, { target: { value: 'metadata' } })
    expect(
      within(dialog).getByRole('button', {
        name: /^Germanic \(branch: West Germanic\)$/u,
      }),
    ).toBeDefined()
  })

  it('keeps the query, scope, and results after closing and reopening', () => {
    render(<SearchHarness tree={createInitialTree()} />)

    let dialog = openSearch()
    fireEvent.change(within(dialog).getByLabelText('Query'), {
      target: { value: 'German' },
    })
    fireEvent.change(within(dialog).getByLabelText('Search in'), {
      target: { value: 'label' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: /^Germanic$/u }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByTestId('selected-node').textContent).toBe('germanic')

    dialog = openSearch()
    expect(
      (within(dialog).getByLabelText('Query') as HTMLInputElement).value,
    ).toBe('German')
    expect(
      (within(dialog).getByLabelText('Search in') as HTMLSelectElement).value,
    ).toBe('label')

    fireEvent.click(within(dialog).getByRole('button', { name: /^German$/u }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByTestId('selected-node').textContent).toBe('german')
  })

  it('selects the first result with Enter and shows the empty prompt', () => {
    render(<SearchHarness tree={createInitialTree()} />)

    const dialog = openSearch()
    expect(
      within(dialog).getByText(
        'Enter a search term to highlight matching nodes.',
      ),
    ).toBeDefined()

    const queryInput = within(dialog).getByLabelText('Query')
    fireEvent.change(queryInput, { target: { value: 'Polish' } })
    fireEvent.submit(queryInput.closest('form')!)

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByTestId('selected-node').textContent).toBe('polish')
  })
})
