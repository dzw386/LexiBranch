import { useCallback, useEffect, useState } from 'react'
import {
  applyResolvedTheme,
  DARK_THEME_MEDIA_QUERY,
  getSystemPrefersDark,
  readStoredThemePreference,
  resolveTheme,
  saveThemePreference,
  type ResolvedTheme,
  type ThemePreference,
} from './theme'

export interface ThemeController {
  preference: ThemePreference
  resolvedTheme: ResolvedTheme
  setPreference: (preference: ThemePreference) => void
}

export function useTheme(): ThemeController {
  const [preference, setPreferenceState] = useState<ThemePreference>(() =>
    readStoredThemePreference(),
  )
  const [systemPrefersDark, setSystemPrefersDark] =
    useState(getSystemPrefersDark)
  const resolvedTheme = resolveTheme(preference, systemPrefersDark)

  useEffect(() => {
    applyResolvedTheme(resolvedTheme)
  }, [resolvedTheme])

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function'
    ) {
      return
    }

    const mediaQuery = window.matchMedia(DARK_THEME_MEDIA_QUERY)
    const handleChange = (): void => {
      setSystemPrefersDark(mediaQuery.matches)
    }

    handleChange()
    mediaQuery.addEventListener('change', handleChange)

    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const setPreference = useCallback((nextPreference: ThemePreference): void => {
    setPreferenceState(nextPreference)
    saveThemePreference(nextPreference)
  }, [])

  return { preference, resolvedTheme, setPreference }
}
