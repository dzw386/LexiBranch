import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { I18nextProvider } from 'react-i18next'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'
import { demoEdges, demoNodes } from './demo-flow'
import i18n from './i18n'
import { useTreeStore } from './state/store'

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

describe('App', () => {
  afterEach(async () => {
    cleanup()
    useTreeStore.getState().selectNode(null)
    await i18n.changeLanguage('en')
  })

  it('renders the hardcoded React Flow demo', () => {
    const markup = renderApp()

    expect(demoNodes).toHaveLength(7)
    expect(demoNodes.map((node) => node.data.label)).toEqual(
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
    expect(demoEdges).toHaveLength(6)
    expect(markup).toContain('react-flow')
    expect(markup).toContain('react-flow__background')
    expect(markup).toContain('react-flow__controls')
    expect(demoEdges.every((edge) => edge.type === 'phylo')).toBe(true)
    expect(demoEdges.some((edge) => edge.data?.branchLength === 0.8)).toBe(true)
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

    expect(await screen.findByText('West Germanic')).toBeDefined()
    expect(screen.getByText('germanic')).toBeDefined()
  })

  it('clears the details panel when clicking the empty canvas', async () => {
    mountApp()

    await screen.findByText('Germanic')
    fireEvent.click(screen.getByText('Germanic'))
    await screen.findByText('West Germanic')

    fireEvent.click(document.querySelector('.react-flow__pane')!)
    await screen.findByText('Select a node to view its details.')
  })
})
