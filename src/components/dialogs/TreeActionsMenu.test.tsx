import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { afterEach, describe, expect, it, vi } from 'vitest'
import i18n from '../../i18n'
import { TreeActionsMenu } from './TreeActionsMenu'

function renderMenu() {
  const onNewTree = vi.fn()
  const onLoadExample = vi.fn()
  const onImport = vi.fn()
  const onExport = vi.fn()

  render(
    <I18nextProvider i18n={i18n}>
      <TreeActionsMenu
        onNewTree={onNewTree}
        onLoadExample={onLoadExample}
        onImport={onImport}
        onExport={onExport}
      />
    </I18nextProvider>,
  )

  return {
    onNewTree,
    onImport,
    onExport,
    trigger: screen.getByRole('button', { name: 'Tree actions' }),
  }
}

describe('TreeActionsMenu', () => {
  afterEach(async () => {
    cleanup()
    await i18n.changeLanguage('en')
  })

  it('moves focus into the menu and supports arrow-key navigation', () => {
    renderMenu()
    fireEvent.click(screen.getByRole('button', { name: 'Tree actions' }))

    const items = screen.getAllByRole('menuitem')
    expect(items).toHaveLength(4)
    expect(document.activeElement).toBe(items[0])

    fireEvent.keyDown(items[0]!, { key: 'ArrowDown' })
    expect(document.activeElement).toBe(items[1])

    fireEvent.keyDown(items[1]!, { key: 'ArrowUp' })
    expect(document.activeElement).toBe(items[0])

    fireEvent.keyDown(items[0]!, { key: 'ArrowUp' })
    expect(document.activeElement).toBe(items[3])

    fireEvent.keyDown(items[3]!, { key: 'Home' })
    expect(document.activeElement).toBe(items[0])

    fireEvent.keyDown(items[0]!, { key: 'End' })
    expect(document.activeElement).toBe(items[3])
  })

  it('closes on Escape and returns focus to the trigger', () => {
    const { trigger } = renderMenu()

    fireEvent.click(trigger)
    expect(screen.getByRole('menu')).toBeDefined()

    const notCancelled = fireEvent.keyDown(window, { key: 'Escape' })

    expect(notCancelled).toBe(false)
    expect(screen.queryByRole('menu')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it('runs import and export actions from menu items', () => {
    const { onImport, onExport, trigger } = renderMenu()

    fireEvent.click(trigger)
    fireEvent.click(screen.getByRole('menuitem', { name: 'Import' }))
    expect(onImport).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('menu')).toBeNull()
    expect(document.activeElement).toBe(trigger)

    fireEvent.click(trigger)
    fireEvent.click(screen.getByRole('menuitem', { name: 'Export' }))
    expect(onExport).toHaveBeenCalledTimes(1)
  })

  it('confirms creating a new tree', async () => {
    const { onNewTree, trigger } = renderMenu()

    fireEvent.click(trigger)
    fireEvent.click(screen.getByRole('menuitem', { name: 'New tree' }))

    expect((await screen.findByRole('dialog')).textContent).toContain(
      'Your current tree will be replaced with a blank tree.',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Create new tree' }))

    expect(onNewTree).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(document.activeElement).toBe(trigger))
  })
})
