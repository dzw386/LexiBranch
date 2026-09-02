import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  useReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useEffect, useMemo, useRef } from 'react'
import { Download, Plus, Upload } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { PhyloEdge } from './components/canvas/PhyloEdge'
import { PhyloNode } from './components/canvas/PhyloNode'
import { NodeDetailsPanel } from './components/panels/NodeDetailsPanel'
import { Button } from './components/ui/button'
import {
  layoutPhyloTree,
  type PhyloFlowEdge,
  type PhyloFlowNode,
} from './layout/layout'
import { useTreeStore } from './state/store'

const nodeTypes = { phylo: PhyloNode }
const edgeTypes = { phylo: PhyloEdge }
const readOnlyEdgeOptions = { selectable: false, reconnectable: false }

interface FlowDataSynchronizerProps {
  nodes: PhyloFlowNode[]
  edges: PhyloFlowEdge[]
}

function areNodeDataEqual(
  previous: PhyloFlowNode['data'],
  next: PhyloFlowNode['data'],
): boolean {
  const previousMetadataKeys = Object.keys(previous.metadata)
  const nextMetadataKeys = Object.keys(next.metadata)

  return (
    previous.label === next.label &&
    previousMetadataKeys.length === nextMetadataKeys.length &&
    nextMetadataKeys.every(
      (key) => previous.metadata[key] === next.metadata[key],
    )
  )
}

function FlowDataSynchronizer({ nodes, edges }: FlowDataSynchronizerProps) {
  const { updateNodeData, updateEdgeData } = useReactFlow<
    PhyloFlowNode,
    PhyloFlowEdge
  >()
  const previousNodesRef = useRef(nodes)
  const previousEdgesRef = useRef(edges)

  useEffect(() => {
    const previousNodes = new Map(
      previousNodesRef.current.map((node) => [node.id, node]),
    )
    for (const node of nodes) {
      const previousNode = previousNodes.get(node.id)

      if (
        previousNode !== undefined &&
        !areNodeDataEqual(previousNode.data, node.data)
      ) {
        updateNodeData(node.id, node.data, { replace: true })
      }
    }

    const previousEdges = new Map(
      previousEdgesRef.current.map((edge) => [edge.id, edge]),
    )
    for (const edge of edges) {
      const previousEdge = previousEdges.get(edge.id)

      if (previousEdge?.data?.branchLength !== edge.data?.branchLength) {
        updateEdgeData(edge.id, edge.data, { replace: true })
      }
    }

    previousNodesRef.current = nodes
    previousEdgesRef.current = edges
  }, [edges, nodes, updateEdgeData, updateNodeData])

  return null
}

function App() {
  const { t } = useTranslation()
  const tree = useTreeStore((state) => state.tree)
  const selectedNodeId = useTreeStore((state) => state.selectedNodeId)
  const selectNode = useTreeStore((state) => state.selectNode)
  const setLabel = useTreeStore((state) => state.setLabel)
  const setBranchLength = useTreeStore((state) => state.setBranchLength)
  const { nodes: layoutNodes, edges } = useMemo(
    () => layoutPhyloTree(tree),
    [tree],
  )
  const selectedNode =
    layoutNodes.find((node) => node.id === selectedNodeId) ?? null
  const selectedTreeNode =
    selectedNodeId === null ? undefined : tree.nodes[selectedNodeId]

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
            branchLength={selectedTreeNode?.branchLength ?? null}
            isRoot={selectedNodeId === tree.rootId}
            onLabelChange={(label) => {
              if (selectedNodeId !== null) {
                setLabel(selectedNodeId, label)
              }
            }}
            onBranchLengthChange={(branchLength) => {
              if (selectedNodeId !== null && selectedNodeId !== tree.rootId) {
                setBranchLength(selectedNodeId, branchLength)
              }
            }}
          />
        </aside>

        <section
          className="relative min-h-0 min-w-0 flex-1"
          aria-label={t('phylogeneticTreeCanvas')}
        >
          <ReactFlow
            defaultNodes={layoutNodes}
            defaultEdges={edges}
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
            <FlowDataSynchronizer nodes={layoutNodes} edges={edges} />
            <Background variant={BackgroundVariant.Lines} gap={24} />
            <Controls showInteractive={false} aria-label={t('treeControls')} />
          </ReactFlow>
        </section>
      </main>
    </div>
  )
}

export default App
