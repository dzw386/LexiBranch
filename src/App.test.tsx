import { renderToStaticMarkup } from 'react-dom/server'
import { I18nextProvider } from 'react-i18next'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'
import { demoEdges, demoNodes } from './demo-flow'
import i18n from './i18n'

function renderApp() {
  return renderToStaticMarkup(
    <I18nextProvider i18n={i18n}>
      <App />
    </I18nextProvider>,
  )
}

describe('App', () => {
  afterEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('renders the hardcoded React Flow demo', () => {
    const markup = renderApp()

    expect(demoNodes).toHaveLength(7)
    expect(demoEdges).toHaveLength(6)
    expect(markup).toContain('react-flow')
    expect(markup).toContain('Proto-language')
    expect(markup).toContain('Germanic')
    expect(markup).toContain('Slavic')
    expect(markup).toContain('English')
    expect(markup).toContain('German')
    expect(markup).toContain('Polish')
    expect(markup).toContain('Russian')
    expect(markup).toContain('react-flow__background')
    expect(markup).toContain('react-flow__controls')
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
})
