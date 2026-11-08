import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { I18nextProvider } from 'react-i18next'
import { afterEach, describe, expect, it, vi } from 'vitest'
import i18n from '../../i18n'
import { ConfirmDialog } from './ConfirmDialog'

function Harness({ onConfirm }: { onConfirm: () => void }) {
  const [open, setOpen] = useState(true)

  return (
    <I18nextProvider i18n={i18n}>
      <ConfirmDialog
        open={open}
        title="Replace your current tree?"
        description="Your current tree will be replaced with the imported tree."
        confirmLabel="Import tree"
        destructive
        onOpenChange={setOpen}
        onConfirm={onConfirm}
      />
    </I18nextProvider>
  )
}

describe('ConfirmDialog', () => {
  afterEach(cleanup)

  it('renders the title and description and confirms', () => {
    const onConfirm = vi.fn()
    render(<Harness onConfirm={onConfirm} />)

    const dialog = screen.getByRole('dialog')
    expect(dialog.textContent).toContain('Replace your current tree?')
    expect(dialog.textContent).toContain(
      'Your current tree will be replaced with the imported tree.',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Import tree' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('closes without confirming when cancelled', () => {
    const onConfirm = vi.fn()
    render(<Harness onConfirm={onConfirm} />)

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onConfirm).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
