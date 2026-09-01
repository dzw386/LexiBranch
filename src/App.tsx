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
import { NodeDetailsPanel } from './components/panels/NodeDetailsPanel'
import { Button } from './components/ui/button'
import { demoEdges, demoNodes } from './demo-flow'
import { useTreeStore } from './state/store'

const nodeTypes = { phylo: PhyloNode }
const edgeTypes = { phylo: PhyloEdge }
const readOnlyEdgeOptions = { selectable: false, reconnectable: false }

function App() {
  const { t } = useTranslation()
  const selectedNodeId = useTreeStore((state) => state.selectedNodeId)
  const selectNode = useTreeStore((state) => state.selectNode)
  const selectedNode =
    demoNodes.find((node) => node.id === selectedNodeId) ?? null
  const selectedBranchLength =
    selectedNode === null
      ? null
      : (demoEdges.find((edge) => edge.target === selectedNode.id)?.data
          ?.branchLength ?? null)

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
          <NodeDetailsPanel
            node={selectedNode}
            branchLength={selectedBranchLength}
          />
        </aside>

        <section
          className="relative min-h-0 min-w-0 flex-1"
          aria-label={t('phylogeneticTreeCanvas')}
        >
          <ReactFlow
            defaultNodes={demoNodes}
            defaultEdges={demoEdges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            defaultEdgeOptions={readOnlyEdgeOptions}
            onNodeClick={(_, node) => selectNode(node.id)}
            onPaneClick={() => selectNode(null)}
            nodesDraggable={false}
            nodesConnectable={false}
            edgesReconnectable={false}
            connectOnClick={false}
            deleteKeyCode={null}
            selectionKeyCode={null}
            multiSelectionKeyCode={null}
            fitView
            panOnDrag
            zoomOnScroll
            zoomOnPinch
          >
            <Background variant={BackgroundVariant.Lines} gap={24} />
            <Controls showInteractive={false} aria-label={t('treeControls')} />
          </ReactFlow>
        </section>
      </main>
    </div>
  )
}

export default App
