import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the default scaffold page', () => {
    const markup = renderToStaticMarkup(<App />)

    expect(markup).toContain('<h1>Vite + React</h1>')
    expect(markup).toContain('Count is 0')
  })
})
