import { Info } from 'lucide-react'
import type { RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import type { ThemePreference } from '../../theme/theme'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'

export interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  themePreference: ThemePreference
  onThemePreferenceChange: (preference: ThemePreference) => void
  onOpenAbout: () => void
  returnFocusRef?: RefObject<HTMLElement | null>
  aboutButtonRef?: RefObject<HTMLButtonElement | null>
}

export function SettingsDialog({
  open,
  onOpenChange,
  themePreference,
  onThemePreferenceChange,
  onOpenAbout,
  returnFocusRef,
  aboutButtonRef,
}: SettingsDialogProps) {
  const { t, i18n } = useTranslation()

  function handleCloseAutoFocus(event: Event): void {
    if (returnFocusRef?.current != null) {
      event.preventDefault()
      returnFocusRef.current.focus()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onCloseAutoFocus={handleCloseAutoFocus}>
        <DialogHeader>
          <DialogTitle>{t('settingsTitle')}</DialogTitle>
          <DialogDescription>{t('settingsDescription')}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <label
              htmlFor="language-select"
              className="text-sm font-medium leading-none"
            >
              {t('language')}
            </label>
            <select
              id="language-select"
              value={i18n.resolvedLanguage ?? i18n.language}
              onChange={(event) => {
                void i18n.changeLanguage(event.currentTarget.value)
              }}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="en">{t('languageEnglish')}</option>
              <option value="pl">{t('languagePolish')}</option>
            </select>
          </div>

          <div className="grid gap-2">
            <label
              htmlFor="theme-select"
              className="text-sm font-medium leading-none"
            >
              {t('theme')}
            </label>
            <select
              id="theme-select"
              value={themePreference}
              onChange={(event) =>
                onThemePreferenceChange(
                  event.currentTarget.value as ThemePreference,
                )
              }
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="auto">{t('themeAuto')}</option>
              <option value="light">{t('themeLight')}</option>
              <option value="dark">{t('themeDark')}</option>
            </select>
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button
            ref={aboutButtonRef}
            type="button"
            variant="outline"
            onClick={onOpenAbout}
          >
            <Info aria-hidden="true" />
            {t('about')}
          </Button>
          <Button type="button" onClick={() => onOpenChange(false)}>
            {t('close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
