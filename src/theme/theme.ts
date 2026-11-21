export type ThemePreference = 'auto' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'lexibranch-theme'
export const DARK_THEME_MEDIA_QUERY = '(prefers-color-scheme: dark)'

function getLocalStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'auto' || value === 'light' || value === 'dark'
}

export function resolveTheme(
  preference: ThemePreference,
  systemPrefersDark: boolean,
): ResolvedTheme {
  if (preference === 'auto') {
    return systemPrefersDark ? 'dark' : 'light'
  }

  return preference
}

export function getSystemPrefersDark(): boolean {
  if (
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
  ) {
    return false
  }

  try {
    return window.matchMedia(DARK_THEME_MEDIA_QUERY).matches
  } catch {
    return false
  }
}

export function readStoredThemePreference(
  storage: Storage | null = getLocalStorage(),
): ThemePreference {
  if (storage === null) {
    return 'auto'
  }

  try {
    const storedPreference = storage.getItem(THEME_STORAGE_KEY)

    return isThemePreference(storedPreference) ? storedPreference : 'auto'
  } catch {
    return 'auto'
  }
}

export function saveThemePreference(
  preference: ThemePreference,
  storage: Storage | null = getLocalStorage(),
): void {
  if (storage === null) {
    return
  }

  try {
    storage.setItem(THEME_STORAGE_KEY, preference)
  } catch {
    // The theme still applies for the current session when storage is full.
  }
}

export function applyResolvedTheme(resolvedTheme: ResolvedTheme): void {
  if (typeof document === 'undefined') {
    return
  }

  const root = document.documentElement
  root.classList.toggle('dark', resolvedTheme === 'dark')
  root.style.colorScheme = resolvedTheme
}

export function initializeTheme(): ResolvedTheme {
  const resolvedTheme = resolveTheme(
    readStoredThemePreference(),
    getSystemPrefersDark(),
  )
  applyResolvedTheme(resolvedTheme)

  return resolvedTheme
}
