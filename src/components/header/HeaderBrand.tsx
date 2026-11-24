import { useTranslation } from 'react-i18next'

export function HeaderBrand() {
  const { t } = useTranslation()

  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-semibold text-primary-foreground">
        {t('appMonogram')}
      </div>
      <div className="min-w-0">
        <h1 className="truncate text-sm font-semibold tracking-tight">
          {t('appName')}
        </h1>
        <p className="hidden truncate text-xs text-muted-foreground sm:block">
          {t('appTagline')}
        </p>
      </div>
    </div>
  )
}
