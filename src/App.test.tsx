import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import App from './App'
import { demoEdges, demoNodes } from './demo-flow'

describe('App', () => {
  it('renders the hardcoded React Flow demo', () => {
    const markup = renderToStaticMarkup(<App />)

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
    const markup = renderToStaticMarkup(<App />)

    expect(markup).toContain('<header')
    expect(markup).toContain('LexiBranch')
    expect(markup).toContain('New tree')
    expect(markup).toContain('Import')
    expect(markup).toContain('Export')
    expect(markup).toContain('Tree tools sidebar')
    expect(markup).toContain('Phylogenetic tree canvas')
  })
})
