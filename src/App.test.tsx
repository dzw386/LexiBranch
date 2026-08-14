import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the styled shadcn button', () => {
    const markup = renderToStaticMarkup(<App />)

    expect(markup).toContain('>Styling setup</h1>')
    expect(markup).toContain('Preview Button')
    expect(markup).toContain('bg-primary')
  })
})
