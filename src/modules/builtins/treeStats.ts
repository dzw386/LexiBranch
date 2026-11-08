import type { AnalysisModule } from '../types'
import { computeTreeStatistics } from './treeStatistics'
import { TreeStatsPanel } from './treeStatsPanel'

export const treeStatsModule: AnalysisModule = {
  id: 'tree-stats',
  nameKey: 'treeStatsName',
  descriptionKey: 'treeStatsDescription',
  run: ({ tree }) => computeTreeStatistics(tree),
  Panel: TreeStatsPanel,
}
