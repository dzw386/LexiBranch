import type { PhyloTree } from '../../domain/types'
import type { PhyloFlowEdge } from '../../layout/layout'

export type EdgeAriaLabelTranslator = (
  key: 'flowEdgeAriaLabel',
  options: { parent: string; child: string },
) => string

export function localizeEdgeAriaLabels(
  edges: PhyloFlowEdge[],
  tree: PhyloTree,
  t: EdgeAriaLabelTranslator,
): PhyloFlowEdge[] {
  return edges.map((edge) => ({
    ...edge,
    ariaLabel: t('flowEdgeAriaLabel', {
      parent: tree.nodes[edge.source].label,
      child: tree.nodes[edge.target].label,
    }),
  }))
}
