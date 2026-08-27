import { Handle, Position, type NodeProps } from '@xyflow/react'
import { cn } from '../../lib/utils'
import type { PhyloFlowNode } from '../../layout/layout'

export function PhyloNode({
  data,
  isConnectable,
  selected,
  sourcePosition,
  targetPosition,
}: NodeProps<PhyloFlowNode>) {
  const metadataCount = Object.keys(data.metadata).length

  return (
    <div
      className={cn(
        'phylo-node relative flex min-w-36 max-w-52 items-center gap-2 rounded-md border border-border/80 bg-card px-3 py-2 text-sm text-card-foreground shadow-sm transition-shadow',
        selected && 'ring-2 ring-ring ring-offset-2 ring-offset-background',
      )}
    >
      <Handle
        type="target"
        position={targetPosition ?? Position.Left}
        isConnectable={isConnectable}
        className="h-2! w-2! border-2! border-card! bg-primary!"
      />
      <span className="min-w-0 flex-1 truncate font-medium">{data.label}</span>
      {metadataCount > 0 ? (
        <span
          className="phylo-node__metadata-badge inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-semibold leading-none text-secondary-foreground"
          aria-hidden="true"
        >
          {metadataCount}
        </span>
      ) : null}
      <Handle
        type="source"
        position={sourcePosition ?? Position.Right}
        isConnectable={isConnectable}
        className="h-2! w-2! border-2! border-card! bg-primary!"
      />
    </div>
  )
}
