import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TOAST_DURATION_MS, useToastsStore } from './toasts'

describe('toasts store', () => {
  beforeEach(() => {
    useToastsStore.setState({ toasts: [] })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows a toast and dismisses it by id', () => {
    const { showToast, dismissToast } = useToastsStore.getState()

    showToast({ variant: 'success', messageKey: 'toastExportSuccess' })

    const [toast] = useToastsStore.getState().toasts
    expect(toast).toMatchObject({
      variant: 'success',
      messageKey: 'toastExportSuccess',
    })

    dismissToast(toast!.id)
    expect(useToastsStore.getState().toasts).toEqual([])
  })

  it('auto-dismisses a toast after the display duration', () => {
    vi.useFakeTimers()
    const { showToast } = useToastsStore.getState()

    showToast({ variant: 'error', messageKey: 'toastAutosaveError' })
    expect(useToastsStore.getState().toasts).toHaveLength(1)

    vi.advanceTimersByTime(TOAST_DURATION_MS - 1)
    expect(useToastsStore.getState().toasts).toHaveLength(1)

    vi.advanceTimersByTime(1)
    expect(useToastsStore.getState().toasts).toEqual([])
  })

  it('skips a duplicate toast while the same dedupe key is visible', () => {
    const { showToast } = useToastsStore.getState()

    showToast({
      variant: 'error',
      messageKey: 'toastAutosaveError',
      dedupeKey: 'autosave',
    })
    showToast({
      variant: 'error',
      messageKey: 'toastAutosaveError',
      dedupeKey: 'autosave',
    })

    expect(useToastsStore.getState().toasts).toHaveLength(1)
  })

  it('allows the same message again after the first toast is dismissed', () => {
    const { showToast, dismissToast } = useToastsStore.getState()

    showToast({
      variant: 'error',
      messageKey: 'toastAutosaveError',
      dedupeKey: 'autosave',
    })
    dismissToast(useToastsStore.getState().toasts[0]!.id)
    showToast({
      variant: 'error',
      messageKey: 'toastAutosaveError',
      dedupeKey: 'autosave',
    })

    expect(useToastsStore.getState().toasts).toHaveLength(1)
  })
})
