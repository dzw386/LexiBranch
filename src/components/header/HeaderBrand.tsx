import type { RefObject } from 'react'
import { useTranslation } from 'react-i18next'

interface HeaderBrandProps {
  onOpenAbout: () => void
  triggerRef?: RefObject<HTMLButtonElement | null>
}

export function HeaderBrand({ onOpenAbout, triggerRef }: HeaderBrandProps) {
  const { t } = useTranslation()

  return (
    <h1 className="min-w-0">
      <button
        ref={triggerRef}
        type="button"
        className="flex min-w-0 items-center gap-3 rounded-md text-left outline-none transition-opacity hover:opacity-80 focus-visible:ring-1 focus-visible:ring-ring"
        title={t('about')}
        aria-haspopup="dialog"
        onClick={onOpenAbout}
      >
        <span
          aria-hidden="true"
          className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-semibold text-primary-foreground"
        >
          {t('appMonogram')}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold tracking-tight">
            {t('appName')}
          </span>
          <span className="hidden truncate text-xs text-muted-foreground sm:block">
            {t('appTagline')}
          </span>
        </span>
      </button>
    </h1>
  )
}
