import { useState } from 'react'
import { Move, MoveDown, MoveUp, Plus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ReorderDirection } from '../../domain/tree'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'

export interface NodeStructureActionsProps {
  label: string
  subtreeSize: number
  isRoot: boolean
  canMoveUp: boolean
  canMoveDown: boolean
  onAddChild: () => void
  onStartMove: () => void
  onReorder: (direction: ReorderDirection) => void
  onRemoveSubtree: () => void
}

export function NodeStructureActions({
  label,
  subtreeSize,
  isRoot,
  canMoveUp,
  canMoveDown,
  onAddChild,
  onStartMove,
  onReorder,
  onRemoveSubtree,
}: NodeStructureActionsProps) {
  const { t } = useTranslation()
  const [confirmOpen, setConfirmOpen] = useState(false)

  function confirmDelete(): void {
    setConfirmOpen(false)
    onRemoveSubtree()
  }

  return (
    <section aria-labelledby="node-structure-heading" className="space-y-3">
      <h3
        id="node-structure-heading"
        className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"
      >
        {t('structure')}
      </h3>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        onClick={onAddChild}
        aria-label={t('addChild')}
      >
        <Plus aria-hidden="true" />
        {t('addChild')}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        onClick={onStartMove}
        disabled={isRoot}
        aria-label={t('moveSubtree')}
      >
        <Move aria-hidden="true" />
        {t('moveSubtree')}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => onReorder('up')}
        disabled={!canMoveUp}
        aria-label={t('reorderUp')}
      >
        <MoveUp aria-hidden="true" />
        {t('reorderUp')}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => onReorder('down')}
        disabled={!canMoveDown}
        aria-label={t('reorderDown')}
      >
        <MoveDown aria-hidden="true" />
        {t('reorderDown')}
      </Button>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        className="w-full"
        onClick={() => setConfirmOpen(true)}
        disabled={isRoot}
        aria-label={t('deleteSubtree')}
      >
        <Trash2 aria-hidden="true" />
        {t('deleteSubtree')}
      </Button>

      {isRoot ? (
        <p className="text-xs text-muted-foreground">
          {t('rootStructureHint')}
        </p>
      ) : null}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteSubtreeTitle', { label })}</DialogTitle>
            <DialogDescription>
              {t('deleteSubtreeDescription', { label, count: subtreeSize })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
            >
              {t('cancel')}
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDelete}>
              {t('confirmDelete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
