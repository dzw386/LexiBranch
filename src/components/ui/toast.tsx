import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useToastsStore } from '../../state/toasts'
import { cn } from '@/lib/utils'

export function Toaster() {
  const { t } = useTranslation()
  const toasts = useToastsStore((state) => state.toasts)
  const dismissToast = useToastsStore((state) => state.dismissToast)

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 sm:items-end">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role={toast.variant === 'error' ? 'alert' : 'status'}
          className={cn(
            'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-md border bg-background p-4 shadow-lg',
            toast.variant === 'error' && 'border-destructive',
          )}
        >
          <p className="flex-1 text-sm">{t(toast.messageKey, toast.params)}</p>
          <button
            type="button"
            aria-label={t('dismissToast')}
            onClick={() => dismissToast(toast.id)}
            className="rounded-sm p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <X aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  )
}
