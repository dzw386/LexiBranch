import type { ComponentType } from 'react'
import type { PhyloTree } from '../domain/types'

export interface AnalysisModule {
  id: string
  nameKey: string
  descriptionKey: string
  run(input: { tree: PhyloTree }): unknown
  Panel?: ComponentType<{ tree: PhyloTree }>
}
