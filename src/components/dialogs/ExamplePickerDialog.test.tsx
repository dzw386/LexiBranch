import { useRef, useState } from 'react'
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
import { SAMPLES } from '../../parsers/samples'
import { parse as parsePhyloXml } from '../../parsers/phyloxml'
import { useToastsStore } from '../../state/toasts'
import { ExamplePickerDialog } from './ExamplePickerDialog'

interface HarnessProps {
  onLoadExample: (tree: ReturnType<typeof parsePhyloXml>) => void
}

function Harness({ onLoadExample }: HarnessProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  return (
    <>
      <button ref={triggerRef} type="button" onClick={() => setOpen(true)}>
        Open examples
      </button>
      <ExamplePickerDialog
        open={open}
        onOpenChange={setOpen}
        onLoadExample={onLoadExample}
        returnFocusRef={triggerRef}
      />
    </>
  )
}

function renderHarness() {
  const onLoadExample = vi.fn()
  render(
    <I18nextProvider i18n={i18n}>
      <Harness onLoadExample={onLoadExample} />
    </I18nextProvider>,
  )
  const trigger = screen.getByRole('button', { name: 'Open examples' })
  fireEvent.click(trigger)

  return { onLoadExample, trigger }
}

describe('ExamplePickerDialog', () => {
  afterEach(async () => {
    cleanup()
    useToastsStore.setState({ toasts: [] })
    await i18n.changeLanguage('en')
  })

  it('lists every sample and focuses the first one', async () => {
    renderHarness()

    expect(await screen.findByRole('dialog')).toBeDefined()
    expect(screen.getAllByText('Load an example')).toHaveLength(1)

    const sampleButtons = SAMPLES.map((_, index) => {
      const labels = ['Indo-European', 'Uralic', 'Turkic', 'Sinitic', 'Japonic']
      return screen.getByRole('button', { name: labels[index] })
    })

    expect(sampleButtons).toHaveLength(SAMPLES.length)
    await waitFor(() => expect(document.activeElement).toBe(sampleButtons[0]))
  })

  it('opens the confirmation for a selected sample and loads it', async () => {
    const { onLoadExample } = renderHarness()

    fireEvent.click(
      await screen.findByRole('button', { name: 'Indo-European' }),
    )

    const confirmDialog = await screen.findByRole('dialog')
    expect(confirmDialog.textContent).toContain(
      'Load the “Indo-European” example?',
    )
    await waitFor(() =>
      expect(confirmDialog.contains(document.activeElement)).toBe(true),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Load this example' }))

    expect(onLoadExample).toHaveBeenCalledTimes(1)
    const expectedTree = parsePhyloXml(SAMPLES[0]!.text)
    const loadedTree = onLoadExample.mock.calls[0]![0]
    expect(loadedTree.nodes[loadedTree.rootId]?.label).toBe(
      expectedTree.nodes[expectedTree.rootId]?.label,
    )
    expect(Object.keys(loadedTree.nodes)).toHaveLength(
      Object.keys(expectedTree.nodes).length,
    )
  })

  it('returns focus to the opener after cancelling the confirmation', async () => {
    const { trigger } = renderHarness()

    fireEvent.click(
      await screen.findByRole('button', { name: 'Indo-European' }),
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(document.activeElement).toBe(trigger))
  })
})
