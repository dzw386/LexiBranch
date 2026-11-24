import type { RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import packageJson from '../../../package.json'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'

export interface AboutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  returnFocusRef?: RefObject<HTMLElement | null>
}

export function AboutDialog({
  open,
  onOpenChange,
  returnFocusRef,
}: AboutDialogProps) {
  const { t } = useTranslation()

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
          <DialogTitle>{t('aboutTitle')}</DialogTitle>
          <DialogDescription>{t('aboutThesisTitle')}</DialogDescription>
        </DialogHeader>
        <dl className="space-y-3 text-sm">
          <div className="space-y-1">
            <dt className="text-xs font-medium text-muted-foreground">
              {t('aboutAuthorLabel')}
            </dt>
            <dd>{t('aboutAuthor')}</dd>
          </div>
          <div className="space-y-1">
            <dt className="text-xs font-medium text-muted-foreground">
              {t('aboutVersionLabel')}
            </dt>
            <dd>{packageJson.version}</dd>
          </div>
          <div className="space-y-1">
            <dt className="text-xs font-medium text-muted-foreground">
              {t('aboutFormatsLabel')}
            </dt>
            <dd>{t('aboutFormats')}</dd>
          </div>
        </dl>
        <p className="text-sm text-muted-foreground">{t('aboutLocalNote')}</p>
        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            {t('close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
