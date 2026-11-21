import { useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Move,
  MoveDown,
  MoveUp,
  Plus,
  Trash2,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ReorderDirection } from '../../domain/tree'
import { ConfirmDialog } from '../dialogs/ConfirmDialog'
import { Button } from '../ui/button'

export interface NodeStructureActionsProps {
  label: string
  subtreeSize: number
  isRoot: boolean
  canMoveUp: boolean
  canMoveDown: boolean
  hasChildren?: boolean
  isCollapsed?: boolean
  disabled?: boolean
  onAddChild: () => void
  onToggleCollapse?: () => void
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
  hasChildren = false,
  isCollapsed = false,
  disabled = false,
  onAddChild,
  onToggleCollapse,
  onStartMove,
  onReorder,
  onRemoveSubtree,
}: NodeStructureActionsProps) {
  const { t } = useTranslation()
  const [confirmOpen, setConfirmOpen] = useState(false)

  function confirmDelete(): void {
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
        disabled={disabled}
        aria-label={t('addChild')}
      >
        <Plus aria-hidden="true" />
        {t('addChild')}
      </Button>
      {onToggleCollapse === undefined ? null : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={onToggleCollapse}
          disabled={(!hasChildren && !isCollapsed) || disabled}
          aria-label={isCollapsed ? t('expandSubtree') : t('collapseSubtree')}
          aria-expanded={hasChildren || isCollapsed ? !isCollapsed : undefined}
        >
          {isCollapsed ? (
            <ChevronRight aria-hidden="true" />
          ) : (
            <ChevronDown aria-hidden="true" />
          )}
          {isCollapsed ? t('expandSubtree') : t('collapseSubtree')}
        </Button>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        onClick={onStartMove}
        disabled={isRoot || disabled}
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
        disabled={!canMoveUp || disabled}
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
        disabled={!canMoveDown || disabled}
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
        disabled={isRoot || disabled}
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

      <ConfirmDialog
        open={confirmOpen}
        title={t('deleteSubtreeTitle', { label })}
        description={t('deleteSubtreeDescription', {
          label,
          count: subtreeSize,
        })}
        confirmLabel={t('confirmDelete')}
        destructive
        onOpenChange={setConfirmOpen}
        onConfirm={confirmDelete}
      />
    </section>
  )
}
