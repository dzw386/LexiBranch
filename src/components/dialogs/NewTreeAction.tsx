import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'

export interface NewTreeActionProps {
  onNewTree: () => void
}

export function NewTreeAction({ onNewTree }: NewTreeActionProps) {
  const { t } = useTranslation()
  const [confirmOpen, setConfirmOpen] = useState(false)

  function confirmNewTree(): void {
    onNewTree()
    setConfirmOpen(false)
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="px-2 sm:px-3"
        aria-label={t('newTree')}
        onClick={() => setConfirmOpen(true)}
      >
        <Plus aria-hidden="true" />
        <span className="hidden sm:inline">{t('newTree')}</span>
      </Button>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('newTreeTitle')}</DialogTitle>
            <DialogDescription>{t('newTreeDescription')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
            >
              {t('cancel')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmNewTree}
            >
              {t('confirmNewTree')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
