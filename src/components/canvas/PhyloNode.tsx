import { Handle, Position, type NodeProps } from '@xyflow/react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../lib/utils'
import type { PhyloFlowNode } from '../../layout/layout'
import { useTreeStore } from '../../state/store'

export function PhyloNode({
  id,
  data,
  isConnectable,
  selected,
  sourcePosition,
  targetPosition,
}: NodeProps<PhyloFlowNode>) {
  const { t } = useTranslation()
  const toggleSubtreeCollapsed = useTreeStore(
    (state) => state.toggleSubtreeCollapsed,
  )
  const metadataCount = Object.keys(data.metadata).length
  const collapsed = data.collapsed === true
  const hiddenDescendantCount = data.hiddenDescendantCount ?? 0
  const hasChildren = data.hasChildren === true
  const canToggle = hasChildren || collapsed
  const toggleLabel = collapsed
    ? hiddenDescendantCount > 0
      ? t('expandNodeSubtreeWithCount', {
          label: data.label,
          count: hiddenDescendantCount,
        })
      : t('expandNodeSubtree', { label: data.label })
    : t('collapseNodeSubtree', { label: data.label })

  return (
    <div
      className={cn(
        'phylo-node relative flex min-w-36 max-w-52 items-center gap-2 rounded-md border border-border/80 bg-card px-3 py-2 text-sm text-card-foreground shadow-sm transition-shadow',
        selected && 'ring-2 ring-ring ring-offset-2 ring-offset-background',
        collapsed && 'phylo-node--collapsed border-dashed bg-muted/40',
        data.highlighted &&
          'phylo-node--highlighted border-amber-500/70 bg-amber-100/70 dark:border-amber-400/60 dark:bg-amber-400/10',
      )}
    >
      <Handle
        type="target"
        position={targetPosition ?? Position.Left}
        isConnectable={isConnectable}
        className="h-0! w-0! min-h-0! min-w-0! invisible"
      />
      <span className="min-w-0 flex-1 truncate font-medium" title={data.label}>
        {data.label}
      </span>
      {metadataCount > 0 ? (
        <span
          className="phylo-node__metadata-badge inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-semibold leading-none text-secondary-foreground"
          aria-hidden="true"
        >
          {metadataCount}
        </span>
      ) : null}
      {canToggle ? (
        <button
          type="button"
          className={cn(
            'phylo-node__collapse-toggle nodrag nopan flex h-6 min-h-0 min-w-6 shrink-0 items-center justify-center gap-1 rounded-full border px-1 text-xs outline-none transition-colors focus-visible:ring-1 focus-visible:ring-ring',
            collapsed
              ? 'border-border bg-secondary px-1.5 font-semibold text-secondary-foreground'
              : 'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
          aria-label={toggleLabel}
          aria-expanded={!collapsed}
          title={toggleLabel}
          onClick={(event) => {
            event.stopPropagation()
            toggleSubtreeCollapsed(id)
          }}
          onPointerDown={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          {collapsed ? (
            <>
              <ChevronRight aria-hidden="true" className="size-3.5 shrink-0" />
              {hiddenDescendantCount > 0 ? (
                <span className="phylo-node__collapse-badge leading-none tabular-nums">
                  {hiddenDescendantCount}
                </span>
              ) : null}
            </>
          ) : (
            <ChevronDown aria-hidden="true" className="size-4 shrink-0" />
          )}
        </button>
      ) : null}
      <Handle
        type="source"
        position={sourcePosition ?? Position.Left}
        isConnectable={isConnectable}
        className="h-0! w-0! min-h-0! min-w-0! invisible"
      />
    </div>
  )
}
