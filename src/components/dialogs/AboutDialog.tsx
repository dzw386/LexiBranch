import { useState } from 'react'
import { Info } from 'lucide-react'
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

export function AboutDialog() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-11 w-11 shrink-0 md:h-9 md:w-9"
        aria-label={t('about')}
        onClick={() => setOpen(true)}
      >
        <Info aria-hidden="true" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
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
            <Button type="button" onClick={() => setOpen(false)}>
              {t('close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
