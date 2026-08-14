import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import App from './App'
import { demoEdges, demoNodes } from './demo-flow'

describe('App', () => {
  it('renders the hardcoded React Flow demo', () => {
    const markup = renderToStaticMarkup(<App />)

    expect(demoNodes).toHaveLength(3)
    expect(demoEdges).toHaveLength(2)
    expect(markup).toContain('react-flow')
    expect(markup).toContain('Proto-language')
    expect(markup).toContain('Germanic')
    expect(markup).toContain('Slavic')
    expect(markup).toContain('react-flow__background')
    expect(markup).toContain('react-flow__controls')
  })
})
