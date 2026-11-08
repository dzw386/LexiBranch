import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { afterEach, describe, expect, it } from 'vitest'
import packageJson from '../../../package.json'
import i18n from '../../i18n'
import { AboutDialog } from './AboutDialog'

function renderAbout() {
  return render(
    <I18nextProvider i18n={i18n}>
      <AboutDialog />
    </I18nextProvider>,
  )
}

describe('AboutDialog', () => {
  afterEach(cleanup)

  it('opens from the header button and shows thesis, formats, and version', () => {
    renderAbout()

    fireEvent.click(screen.getByRole('button', { name: 'About' }))

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

  it('closes from the close button', () => {
    renderAbout()

    fireEvent.click(screen.getByRole('button', { name: 'About' }))
    fireEvent.click(screen.getAllByRole('button', { name: 'Close' })[0]!)

    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
