import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import pl from './locales/pl.json'

const LANGUAGE_STORAGE_KEY = 'lexibranch-language'
type SupportedLanguage = 'en' | 'pl'

function getSupportedLanguage(
  language: string | undefined,
): SupportedLanguage | null {
  const baseLanguage = language?.toLowerCase().split(/[-_]/u)[0]

  return baseLanguage === 'en' || baseLanguage === 'pl' ? baseLanguage : null
}

function getInitialLanguage(): SupportedLanguage {
  try {
    const storedLanguage =
      typeof window === 'undefined'
        ? null
        : window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
    const supportedStoredLanguage = getSupportedLanguage(
      storedLanguage ?? undefined,
    )

    if (supportedStoredLanguage !== null) {
      return supportedStoredLanguage
    }
  } catch {
    // Continue with the browser language if localStorage is unavailable.
  }

  return (
    getSupportedLanguage(
      typeof navigator === 'undefined' ? undefined : navigator.language,
    ) ?? 'en'
  )
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    pl: { translation: pl },
  },
  lng: getInitialLanguage(),
  fallbackLng: 'en',
  supportedLngs: ['en', 'pl'],
  interpolation: {
    escapeValue: false,
  },
})

i18n.on('languageChanged', (language) => {
  const supportedLanguage = getSupportedLanguage(language)

  if (supportedLanguage === null || typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, supportedLanguage)
  } catch {
    // Language switching still works when localStorage is unavailable.
  }
})

export default i18n
