import { useTranslation } from 'react-i18next'
import type { PhyloTree } from '../../domain/types'
import { formatBranchLength } from '../../lib/branchLength'
import { computeTreeStatistics } from './treeStatistics'

export function TreeStatsPanel({ tree }: { tree: PhyloTree }) {
  const { t } = useTranslation()
  const statistics = computeTreeStatistics(tree)

  return (
    <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1.5 text-xs">
      <dt className="text-muted-foreground">{t('treeStatsNodeCount')}</dt>
      <dd className="text-right font-medium tabular-nums">
        {statistics.nodeCount}
      </dd>
      <dt className="text-muted-foreground">{t('treeStatsMaxDepth')}</dt>
      <dd className="text-right font-medium tabular-nums">
        {statistics.maxDepth}
      </dd>
      <dt className="text-muted-foreground">
        {t('treeStatsAverageBranchLength')}
      </dt>
      <dd className="text-right font-medium tabular-nums">
        {statistics.averageBranchLength === null
          ? t('notSpecified')
          : formatBranchLength(statistics.averageBranchLength)}
      </dd>
    </dl>
  )
}
