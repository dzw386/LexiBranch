import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  applyResolvedTheme,
  getSystemPrefersDark,
  initializeTheme,
  isThemePreference,
  readStoredThemePreference,
  resolveTheme,
  saveThemePreference,
  THEME_STORAGE_KEY,
} from './theme'

afterEach(() => {
  document.documentElement.classList.remove('dark')
  document.documentElement.style.colorScheme = ''
  vi.unstubAllGlobals()
})

describe('resolveTheme', () => {
  it('resolves auto from the system preference', () => {
    expect(resolveTheme('auto', true)).toBe('dark')
    expect(resolveTheme('auto', false)).toBe('light')
  })

  it('keeps explicit preferences', () => {
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
  })
})

describe('theme preference storage', () => {
  it('defaults to auto when nothing valid is stored', () => {
    expect(readStoredThemePreference(window.localStorage)).toBe('auto')

    window.localStorage.setItem(THEME_STORAGE_KEY, 'sepia')
    expect(readStoredThemePreference(window.localStorage)).toBe('auto')
  })

  it('persists supported preferences and ignores invalid values', () => {
    saveThemePreference('dark', window.localStorage)
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    expect(readStoredThemePreference(window.localStorage)).toBe('dark')

    expect(isThemePreference('auto')).toBe(true)
    expect(isThemePreference('sepia')).toBe(false)
  })

  it('survives unavailable storage', () => {
    expect(readStoredThemePreference(null)).toBe('auto')
    expect(() => saveThemePreference('dark', null)).not.toThrow()
  })
})

describe('applyResolvedTheme', () => {
  it('toggles the dark class and color scheme on the document root', () => {
    applyResolvedTheme('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.style.colorScheme).toBe('dark')

    applyResolvedTheme('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(document.documentElement.style.colorScheme).toBe('light')
  })
})

describe('system preference detection', () => {
  it('falls back to light when matchMedia is unavailable', () => {
    vi.stubGlobal('matchMedia', undefined)
    expect(getSystemPrefersDark()).toBe(false)
  })

  it('reads and applies the browser dark preference in auto mode', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: true })),
    )

    expect(getSystemPrefersDark()).toBe(true)
    expect(initializeTheme()).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})
