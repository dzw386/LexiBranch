import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Download, Plus, Upload } from 'lucide-react'
import { Button } from './components/ui/button'
import { demoEdges, demoNodes } from './demo-flow'

function App() {
  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background text-foreground">
      <header className="flex h-14 shrink-0 items-center justify-between border-b bg-card px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-semibold text-primary-foreground">
            LB
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold tracking-tight">
              LexiBranch
            </h1>
            <p className="hidden truncate text-xs text-muted-foreground sm:block">
              Language family workspace
            </p>
          </div>
        </div>

        <nav
          className="flex shrink-0 items-center gap-2"
          aria-label="Workspace actions"
        >
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="px-2 sm:px-3"
            aria-label="New tree"
            disabled
          >
            <Plus aria-hidden="true" />
            <span className="hidden sm:inline">New tree</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="px-2 sm:px-3"
            aria-label="Import"
            disabled
          >
            <Upload aria-hidden="true" />
            <span className="hidden sm:inline">Import</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="px-2 sm:px-3"
            aria-label="Export"
            disabled
          >
            <Download aria-hidden="true" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </nav>
      </header>

      <main className="flex min-h-0 flex-1">
        <aside
          className="hidden w-64 shrink-0 flex-col border-r bg-muted/20 p-4 md:flex"
          aria-label="Tree tools sidebar"
        >
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Workspace
            </p>
            <h2 className="mt-1 text-base font-medium">Tree editor</h2>
          </div>

          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed bg-background/60 p-5 text-center">
            <p className="text-sm leading-6 text-muted-foreground">
              Editing tools will appear here.
            </p>
          </div>
        </aside>

        <section
          className="relative min-h-0 min-w-0 flex-1"
          aria-label="Phylogenetic tree canvas"
        >
          <ReactFlow
            nodes={demoNodes}
            edges={demoEdges}
            fitView
            panOnDrag
            zoomOnScroll
            zoomOnPinch
          >
            <Background variant={BackgroundVariant.Lines} gap={24} />
            <Controls />
          </ReactFlow>
        </section>
      </main>
    </div>
  )
}

export default App
