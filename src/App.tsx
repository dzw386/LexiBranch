import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Download, Plus, Upload } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { PhyloEdge } from './components/canvas/PhyloEdge'
import { PhyloNode } from './components/canvas/PhyloNode'
import { Button } from './components/ui/button'
import { demoEdges, demoNodes } from './demo-flow'

const nodeTypes = { phylo: PhyloNode }
const edgeTypes = { phylo: PhyloEdge }

function App() {
  const { t } = useTranslation()

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background text-foreground">
      <header className="flex h-14 shrink-0 items-center justify-between border-b bg-card px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-semibold text-primary-foreground">
            {t('appMonogram')}
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold tracking-tight">
              {t('appName')}
            </h1>
            <p className="hidden truncate text-xs text-muted-foreground sm:block">
              {t('appTagline')}
            </p>
          </div>
        </div>

        <nav
          className="flex shrink-0 items-center gap-2"
          aria-label={t('workspaceActions')}
        >
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="px-2 sm:px-3"
            aria-label={t('newTree')}
            disabled
          >
            <Plus aria-hidden="true" />
            <span className="hidden sm:inline">{t('newTree')}</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="px-2 sm:px-3"
            aria-label={t('import')}
            disabled
          >
            <Upload aria-hidden="true" />
            <span className="hidden sm:inline">{t('import')}</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="px-2 sm:px-3"
            aria-label={t('export')}
            disabled
          >
            <Download aria-hidden="true" />
            <span className="hidden sm:inline">{t('export')}</span>
          </Button>
        </nav>
      </header>

      <main className="flex min-h-0 flex-1">
        <aside
          className="hidden w-64 shrink-0 flex-col border-r bg-muted/20 p-4 md:flex"
          aria-label={t('treeToolsSidebar')}
        >
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {t('workspace')}
            </p>
            <h2 className="mt-1 text-base font-medium">{t('treeEditor')}</h2>
          </div>

          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed bg-background/60 p-5 text-center">
            <p className="text-sm leading-6 text-muted-foreground">
              {t('editingToolsPlaceholder')}
            </p>
          </div>
        </aside>

        <section
          className="relative min-h-0 min-w-0 flex-1"
          aria-label={t('phylogeneticTreeCanvas')}
        >
          <ReactFlow
            nodes={demoNodes}
            edges={demoEdges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            panOnDrag
            zoomOnScroll
            zoomOnPinch
          >
            <Background variant={BackgroundVariant.Lines} gap={24} />
            <Controls aria-label={t('treeControls')} />
          </ReactFlow>
        </section>
      </main>
    </div>
  )
}

export default App
