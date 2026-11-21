import { useTranslation } from 'react-i18next'
import type { ThemePreference } from '../theme/theme'

interface ThemeSwitcherProps {
  value: ThemePreference
  onChange: (preference: ThemePreference) => void
}

export function ThemeSwitcher({ value, onChange }: ThemeSwitcherProps) {
  const { t } = useTranslation()

  return (
    <>
      <label htmlFor="theme-select" className="sr-only">
        {t('theme')}
      </label>
      <select
        id="theme-select"
        value={value}
        onChange={(event) =>
          onChange(event.currentTarget.value as ThemePreference)
        }
        className="h-11 max-w-24 rounded-md border border-input bg-background px-2 text-xs shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring sm:h-8 sm:max-w-none sm:text-sm"
      >
        <option value="auto">{t('themeAuto')}</option>
        <option value="light">{t('themeLight')}</option>
        <option value="dark">{t('themeDark')}</option>
      </select>
    </>
  )
}
