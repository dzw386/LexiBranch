import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react'
import type { PhyloFlowEdge } from '../../layout/layout'

export function PhyloEdge({
  id,
  markerEnd,
  markerStart,
  selected,
  sourcePosition,
  sourceX,
  sourceY,
  style,
  targetPosition,
  targetX,
  targetY,
  data,
}: EdgeProps<PhyloFlowEdge>) {
  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 0,
  })
  const branchLength = data?.branchLength
  const branchLengthLabel =
    branchLength === null || branchLength === undefined
      ? undefined
      : String(branchLength)

  return (
    <BaseEdge
      id={id}
      path={path}
      label={branchLengthLabel}
      labelX={labelX}
      labelY={labelY}
      labelShowBg={branchLengthLabel !== undefined}
      labelStyle={{
        fill: 'var(--muted-foreground)',
        fontSize: 11,
        fontVariantNumeric: 'tabular-nums',
      }}
      labelBgStyle={{
        fill: 'var(--background)',
        fillOpacity: 0.92,
        stroke: 'var(--border)',
        strokeWidth: 1,
      }}
      labelBgPadding={[3, 5]}
      labelBgBorderRadius={3}
      className="phylo-edge"
      style={{
        stroke: 'var(--muted-foreground)',
        strokeLinecap: 'square',
        strokeLinejoin: 'miter',
        strokeWidth: selected ? 2 : 1.5,
        ...style,
      }}
      markerStart={markerStart}
      markerEnd={markerEnd}
    />
  )
}
