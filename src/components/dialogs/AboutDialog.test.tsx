import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { afterEach, describe, expect, it, vi } from 'vitest'
import packageJson from '../../../package.json'
import i18n from '../../i18n'
import { AboutDialog } from './AboutDialog'

function renderAbout() {
  const onOpenChange = vi.fn()

  render(
    <I18nextProvider i18n={i18n}>
      <AboutDialog open onOpenChange={onOpenChange} />
    </I18nextProvider>,
  )

  return onOpenChange
}

describe('AboutDialog', () => {
  afterEach(cleanup)

  it('shows thesis, formats, and version when open', () => {
    renderAbout()

    const dialog = screen.getByRole('dialog')
    expect(dialog.textContent).toContain('About LexiBranch')
    expect(dialog.textContent).toContain(
      'Project and implementation of an interactive tool for creating and visualizing language phylogenetic trees',
    )
    expect(dialog.textContent).toContain('Wojciech Dziki')
    expect(dialog.textContent).toContain('Supported formats')
    expect(dialog.textContent).toContain(
      'Newick (.nwk), NHX (.nhx), phyloXML (.xml)',
    )
    expect(dialog.textContent).toContain('Runs entirely in your browser')
    expect(dialog.textContent).toContain('Version')
    expect(dialog.textContent).toContain(packageJson.version)
  })

  it('requests closing from the close button', () => {
    const onOpenChange = renderAbout()

    fireEvent.click(screen.getAllByRole('button', { name: 'Close' })[0]!)

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
