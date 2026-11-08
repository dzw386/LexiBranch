import { ChevronDown, ChevronUp } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { PhyloTree } from '../../domain/types'
import { ANALYSIS_MODULES } from '../../modules/registry'
import type { AnalysisModule } from '../../modules/types'

export interface AnalysisPanelProps {
  tree: PhyloTree
  modules?: readonly AnalysisModule[]
}

interface AnalysisModuleCardProps {
  module: AnalysisModule
  tree: PhyloTree
}

function AnalysisModuleCard({ module, tree }: AnalysisModuleCardProps) {
  const { t } = useTranslation()
  const treeSnapshot = useMemo(() => structuredClone(tree), [tree])
  const ModulePanel = module.Panel
  const headingId = `analysis-${module.id}-heading`

  return (
    <article
      aria-labelledby={headingId}
      className="space-y-2 rounded-lg border bg-background/60 p-3"
    >
      <div>
        <h3 id={headingId} className="text-sm font-medium">
          {t(module.nameKey)}
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {t(module.descriptionKey)}
        </p>
      </div>
      {ModulePanel === undefined ? null : <ModulePanel tree={treeSnapshot} />}
    </article>
  )
}

export function AnalysisPanel({
  tree,
  modules = ANALYSIS_MODULES,
}: AnalysisPanelProps) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <section
      aria-labelledby="analysis-heading"
      className="shrink-0 border-t pt-4"
    >
      <h2 id="analysis-heading">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 text-left"
          aria-expanded={isOpen}
          aria-controls={isOpen ? 'analysis-content' : undefined}
          onClick={() => setIsOpen((open) => !open)}
        >
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {t('analysis')}
          </span>
          {isOpen ? (
            <ChevronUp
              aria-hidden="true"
              className="size-4 shrink-0 text-muted-foreground"
            />
          ) : (
            <ChevronDown
              aria-hidden="true"
              className="size-4 shrink-0 text-muted-foreground"
            />
          )}
        </button>
      </h2>

      {isOpen ? (
        <div id="analysis-content" className="mt-3 space-y-3">
          <p className="text-xs text-muted-foreground">
            {t('analysisDescription')}
          </p>

          {modules.map((analysisModule) => (
            <AnalysisModuleCard
              key={analysisModule.id}
              module={analysisModule}
              tree={tree}
            />
          ))}
        </div>
      ) : null}
    </section>
  )
}
