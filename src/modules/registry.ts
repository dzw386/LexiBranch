import { treeStatsModule } from './builtins/treeStats'
import type { AnalysisModule } from './types'

export const ANALYSIS_MODULES: readonly AnalysisModule[] = [treeStatsModule]
