import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { afterEach, describe, expect, it, vi } from 'vitest'
import i18n from '../../i18n'
import { SAMPLES } from '../../parsers/samples'
import { LoadExampleMenu } from './LoadExampleMenu'

function renderMenu() {
  return render(
    <I18nextProvider i18n={i18n}>
      <LoadExampleMenu onLoadExample={vi.fn()} />
    </I18nextProvider>,
  )
}

describe('LoadExampleMenu', () => {
  afterEach(async () => {
    cleanup()
    await i18n.changeLanguage('en')
  })

  it('moves focus into the menu and supports arrow-key navigation', () => {
    renderMenu()
    const trigger = screen.getByRole('button', { name: 'Load example' })

    fireEvent.click(trigger)
    const items = screen.getAllByRole('menuitem')
    expect(items).toHaveLength(SAMPLES.length)
    expect(document.activeElement).toBe(items[0])

    fireEvent.keyDown(items[0]!, { key: 'ArrowDown' })
    expect(document.activeElement).toBe(items[1])

    fireEvent.keyDown(items[1]!, { key: 'ArrowUp' })
    expect(document.activeElement).toBe(items[0])

    fireEvent.keyDown(items[0]!, { key: 'ArrowUp' })
    expect(document.activeElement).toBe(items[items.length - 1])

    fireEvent.keyDown(items[items.length - 1]!, { key: 'Home' })
    expect(document.activeElement).toBe(items[0])

    fireEvent.keyDown(items[0]!, { key: 'End' })
    expect(document.activeElement).toBe(items[items.length - 1])
  })

  it('closes on Escape and returns focus to the trigger', () => {
    renderMenu()
    const trigger = screen.getByRole('button', { name: 'Load example' })

    fireEvent.click(trigger)
    expect(screen.getByRole('menu')).toBeDefined()

    const notCancelled = fireEvent.keyDown(window, { key: 'Escape' })

    expect(notCancelled).toBe(false)
    expect(screen.queryByRole('menu')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it('opens the confirmation dialog for a selected sample', () => {
    renderMenu()
    const trigger = screen.getByRole('button', { name: 'Load example' })

    fireEvent.click(trigger)
    const firstItem = screen.getAllByRole('menuitem')[0]!
    fireEvent.click(firstItem)

    expect(screen.getByRole('dialog').textContent).toContain(
      'Load the “Indo-European” example?',
    )
  })
})
