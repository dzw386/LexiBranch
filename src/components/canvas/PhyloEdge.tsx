import { memo } from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from '@xyflow/react'
import type { PhyloFlowEdge } from '../../layout/layout'

function PhyloEdgeComponent({
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
    <>
      <BaseEdge
        id={id}
        path={path}
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
      {branchLengthLabel !== undefined ? (
        <EdgeLabelRenderer>
          <div
            className="phylo-edge__label nodrag nopan"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            {branchLengthLabel}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  )
}

function areEdgePropsEqual(
  previous: EdgeProps<PhyloFlowEdge>,
  next: EdgeProps<PhyloFlowEdge>,
): boolean {
  return (
    previous.id === next.id &&
    previous.selected === next.selected &&
    previous.sourceX === next.sourceX &&
    previous.sourceY === next.sourceY &&
    previous.targetX === next.targetX &&
    previous.targetY === next.targetY &&
    previous.sourcePosition === next.sourcePosition &&
    previous.targetPosition === next.targetPosition &&
    previous.markerStart === next.markerStart &&
    previous.markerEnd === next.markerEnd &&
    previous.data?.branchLength === next.data?.branchLength &&
    previous.style === next.style
  )
}

export const PhyloEdge = memo(PhyloEdgeComponent, areEdgePropsEqual)
