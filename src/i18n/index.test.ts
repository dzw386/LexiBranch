import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('i18n initialization', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('restores the saved language when initializing', async () => {
    window.localStorage.setItem('lexibranch-language', 'pl')

    const { default: i18n } = await import('./index')

    expect(i18n.language).toBe('pl')
    expect(i18n.t('newTree')).toBe('Nowe drzewo')
  })

  it('uses the browser language when there is no saved preference', async () => {
    vi.stubGlobal('navigator', { language: 'pl-PL' })

    const { default: i18n } = await import('./index')

    expect(i18n.language).toBe('pl')
  })
})
