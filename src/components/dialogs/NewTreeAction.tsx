import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../ui/button'
import { ConfirmDialog } from './ConfirmDialog'

export interface NewTreeActionProps {
  onNewTree: () => void
}

export function NewTreeAction({ onNewTree }: NewTreeActionProps) {
  const { t } = useTranslation()
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-11 w-11 shrink-0 px-2 sm:h-8 sm:w-auto sm:px-3"
        aria-label={t('newTree')}
        onClick={() => setConfirmOpen(true)}
      >
        <Plus aria-hidden="true" />
        <span className="hidden sm:inline">{t('newTree')}</span>
      </Button>

      <ConfirmDialog
        open={confirmOpen}
        title={t('newTreeTitle')}
        description={t('newTreeDescription')}
        confirmLabel={t('confirmNewTree')}
        destructive
        onOpenChange={setConfirmOpen}
        onConfirm={onNewTree}
      />
    </>
  )
}
