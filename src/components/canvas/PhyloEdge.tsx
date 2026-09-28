import { memo } from 'react'
import { BaseEdge, EdgeLabelRenderer, type EdgeProps } from '@xyflow/react'
import { formatBranchLength } from '../../lib/branchLength'
import type { PhyloFlowEdge } from '../../layout/layout'

const BRANCH_LABEL_LINE_OFFSET = 18

function PhyloEdgeComponent({
  id,
  markerEnd,
  markerStart,
  selected,
  sourceX,
  sourceY,
  style,
  targetX,
  targetY,
  data,
}: EdgeProps<PhyloFlowEdge>) {
  const path = `M ${sourceX},${sourceY} L ${sourceX},${targetY} L ${targetX},${targetY}`
  const branchLength = data?.branchLength
  const branchLengthLabel =
    branchLength === null || branchLength === undefined
      ? undefined
      : formatBranchLength(branchLength)
  const branchLabelX = data?.branchLabelX ?? (sourceX + targetX) / 2
  const branchLabelY = targetY - BRANCH_LABEL_LINE_OFFSET

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
        <>
          <line
            className="phylo-edge__label-stem"
            x1={branchLabelX}
            y1={branchLabelY}
            x2={branchLabelX}
            y2={targetY}
          />
          <EdgeLabelRenderer>
            <div
              className="phylo-edge__label nodrag nopan"
              style={{
                transform: `translate(-50%, -100%) translate(${branchLabelX}px, ${branchLabelY}px)`,
              }}
            >
              {branchLengthLabel}
            </div>
          </EdgeLabelRenderer>
        </>
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
    previous.data?.branchLabelX === next.data?.branchLabelX &&
    previous.style === next.style
  )
}

export const PhyloEdge = memo(PhyloEdgeComponent, areEdgePropsEqual)
