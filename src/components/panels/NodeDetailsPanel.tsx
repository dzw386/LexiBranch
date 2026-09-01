import { useTranslation } from 'react-i18next'
import type { PhyloFlowNode } from '../../layout/layout'

export interface NodeDetailsPanelProps {
  node: PhyloFlowNode | null
  branchLength: number | null
}

export function NodeDetailsPanel({
  node,
  branchLength,
}: NodeDetailsPanelProps) {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {t('workspace')}
        </p>
        <h2 className="mt-1 text-base font-medium">{t('nodeDetails')}</h2>
      </div>

      {node === null ? (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed bg-background/60 p-5 text-center">
          <p className="text-sm leading-6 text-muted-foreground">
            {t('selectNodePrompt')}
          </p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto">
          <dl className="space-y-4">
            <div className="space-y-1">
              <dt className="text-xs font-medium text-muted-foreground">
                {t('nodeLabel')}
              </dt>
              <dd className="wrap-break-word text-sm font-medium">
                {node.data.label || t('unnamedNode')}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium text-muted-foreground">
                {t('nodeId')}
              </dt>
              <dd className="break-all font-mono text-xs text-muted-foreground">
                {node.id}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium text-muted-foreground">
                {t('branchLength')}
              </dt>
              <dd className="text-sm tabular-nums">
                {branchLength === null
                  ? t('notSpecified')
                  : String(branchLength)}
              </dd>
            </div>
          </dl>

          <section aria-labelledby="node-metadata-heading">
            <h3
              id="node-metadata-heading"
              className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"
            >
              {t('metadata')}
            </h3>
            {Object.entries(node.data.metadata).length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('noMetadata')}</p>
            ) : (
              <dl className="divide-y rounded-md border bg-background/60">
                {Object.entries(node.data.metadata).map(([key, value]) => (
                  <div
                    key={key}
                    className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-3 px-3 py-2.5"
                  >
                    <dt className="wrap-break-word text-xs font-medium text-muted-foreground">
                      {key}
                    </dt>
                    <dd className="wrap-break-word text-right text-sm">
                      {String(value)}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
