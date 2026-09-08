import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ComponentProps } from 'react'
import i18n from '../../i18n'
import { NodeStructureActions } from './NodeStructureActions'

type ActionsProps = ComponentProps<typeof NodeStructureActions>

function renderActions(overrides: Partial<ActionsProps> = {}): {
  onAddChild: ReturnType<typeof vi.fn>
  onStartMove: ReturnType<typeof vi.fn>
  onReorder: ReturnType<typeof vi.fn>
  onRemoveSubtree: ReturnType<typeof vi.fn>
} {
  const callbacks = {
    onAddChild: vi.fn(),
    onStartMove: vi.fn(),
    onReorder: vi.fn(),
    onRemoveSubtree: vi.fn(),
  }

  render(
    <I18nextProvider i18n={i18n}>
      <NodeStructureActions
        label="Germanic"
        subtreeSize={3}
        isRoot={false}
        canMoveUp
        canMoveDown
        {...callbacks}
        {...overrides}
      />
    </I18nextProvider>,
  )

  return callbacks
}

describe('NodeStructureActions', () => {
  afterEach(cleanup)

  it('invokes the matching callback for each action', () => {
    const callbacks = renderActions()

    fireEvent.click(screen.getByRole('button', { name: 'Add child' }))
    expect(callbacks.onAddChild).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Move subtree' }))
    expect(callbacks.onStartMove).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Move up' }))
    expect(callbacks.onReorder).toHaveBeenLastCalledWith('up')

    fireEvent.click(screen.getByRole('button', { name: 'Move down' }))
    expect(callbacks.onReorder).toHaveBeenLastCalledWith('down')
    expect(callbacks.onReorder).toHaveBeenCalledTimes(2)
  })

  it('disables reorder buttons at the sibling boundaries', () => {
    renderActions({ canMoveUp: false, canMoveDown: false })

    expect(
      screen.getByRole('button', { name: 'Move up' }).hasAttribute('disabled'),
    ).toBe(true)
    expect(
      screen
        .getByRole('button', { name: 'Move down' })
        .hasAttribute('disabled'),
    ).toBe(true)
  })

  it('disables move and delete for the root and explains why', () => {
    const callbacks = renderActions({ isRoot: true })

    expect(
      screen
        .getByRole('button', { name: 'Move subtree' })
        .hasAttribute('disabled'),
    ).toBe(true)
    expect(
      screen
        .getByRole('button', { name: 'Delete subtree' })
        .hasAttribute('disabled'),
    ).toBe(true)
    expect(
      screen.getByText('The root node cannot be moved or deleted.'),
    ).toBeDefined()
    expect(
      screen
        .getByRole('button', { name: 'Add child' })
        .hasAttribute('disabled'),
    ).toBe(false)
    expect(callbacks.onStartMove).not.toHaveBeenCalled()
  })

  it('deletes only after the confirmation dialog is accepted', () => {
    const callbacks = renderActions()

    fireEvent.click(screen.getByRole('button', { name: 'Delete subtree' }))

    const dialog = screen.getByRole('dialog')
    expect(dialog.textContent).toContain('Delete “Germanic”?')
    expect(dialog.textContent).toContain(
      'permanently delete “Germanic” and all its descendants (3 nodes)',
    )
    expect(callbacks.onRemoveSubtree).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(callbacks.onRemoveSubtree).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Delete subtree' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(callbacks.onRemoveSubtree).toHaveBeenCalledTimes(1)
  })

  it('phrases the confirmation for a single leaf node', () => {
    renderActions({ label: 'English', subtreeSize: 1 })

    fireEvent.click(screen.getByRole('button', { name: 'Delete subtree' }))

    const dialog = screen.getByRole('dialog')
    expect(dialog.textContent).toContain(
      'permanently delete “English” (1 node)',
    )
  })
})
