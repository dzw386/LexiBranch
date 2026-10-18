import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  type AriaLabelConfig,
  type NodeChange,
  type NodeSelectionChange,
  type ReactFlowInstance,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { PhyloEdge } from './components/canvas/PhyloEdge'
import { PhyloNode } from './components/canvas/PhyloNode'
import { localizeEdgeAriaLabels } from './components/canvas/localizeEdgeAriaLabels'
import { ImportExportActions } from './components/dialogs/ImportExportActions'
import { LoadExampleMenu } from './components/dialogs/LoadExampleMenu'
import { NodeDetailsPanel } from './components/panels/NodeDetailsPanel'
import { Button } from './components/ui/button'
import {
  getSubtreeIds,
  TreeOperationError,
  type ReorderDirection,
} from './domain/tree'
import type { MetadataValue } from './domain/types'
import { cn } from './lib/utils'
import {
  layoutPhyloTree,
  type PhyloFlowEdge,
  type PhyloFlowNode,
} from './layout/layout'
import { useTreeStore } from './state/store'

const nodeTypes = { phylo: PhyloNode }
const edgeTypes = { phylo: PhyloEdge }
const readOnlyEdgeOptions = { selectable: false, reconnectable: false }
const MIN_CANVAS_ZOOM = 0.2
const MAX_CANVAS_ZOOM = 1.5
const FIT_VIEW_OPTIONS = {
  padding: 0.1,
  minZoom: MIN_CANVAS_ZOOM,
  maxZoom: MAX_CANVAS_ZOOM,
  duration: 200,
}

function getFlowDirectionTranslationKey(direction: string): string {
  switch (direction) {
    case 'left':
      return 'directionLeft'
    case 'right':
      return 'directionRight'
    case 'up':
      return 'directionUp'
    case 'down':
      return 'directionDown'
    default:
      return 'directionUnknown'
  }
}

interface NodeMeasurement {
  width: number
  height: number
}

function App() {
  const { t } = useTranslation()
  const ariaLabelConfig = useMemo<AriaLabelConfig>(
    () => ({
      'node.a11yDescription.default': t('flowNodeDescription'),
      'node.a11yDescription.keyboardDisabled': t('flowNodeKeyboardDescription'),
      'node.a11yDescription.ariaLiveMessage': ({ direction, x, y }) =>
        t('flowNodeMovedAnnouncement', {
          direction: t(getFlowDirectionTranslationKey(direction)),
          x,
          y,
        }),
      'edge.a11yDescription.default': t('flowEdgeDescription'),
      'controls.ariaLabel': t('treeControls'),
      'controls.zoomIn.ariaLabel': t('zoomIn'),
      'controls.zoomOut.ariaLabel': t('zoomOut'),
      'controls.fitView.ariaLabel': t('fitView'),
      'controls.interactive.ariaLabel': t('toggleInteractivity'),
      'minimap.ariaLabel': t('miniMap'),
      'handle.ariaLabel': t('connectionHandle'),
    }),
    [t],
  )
  const tree = useTreeStore((state) => state.tree)
  const selectedNodeId = useTreeStore((state) => state.selectedNodeId)
  const pendingMoveNodeId = useTreeStore((state) => state.pendingMoveNodeId)
  const viewMode = useTreeStore((state) => state.viewMode)
  const selectNode = useTreeStore((state) => state.selectNode)
  const importTree = useTreeStore((state) => state.importTree)
  const setViewMode = useTreeStore((state) => state.setViewMode)
  const addChild = useTreeStore((state) => state.addChild)
  const removeSubtree = useTreeStore((state) => state.removeSubtree)
  const setLabel = useTreeStore((state) => state.setLabel)
  const setBranchLength = useTreeStore((state) => state.setBranchLength)
  const addMetadata = useTreeStore((state) => state.addMetadata)
  const updateMetadata = useTreeStore((state) => state.updateMetadata)
  const removeMetadata = useTreeStore((state) => state.removeMetadata)
  const reorderChild = useTreeStore((state) => state.reorderChild)
  const startMoveSubtree = useTreeStore((state) => state.startMoveSubtree)
  const cancelMoveSubtree = useTreeStore((state) => state.cancelMoveSubtree)
  const completeMoveSubtree = useTreeStore((state) => state.completeMoveSubtree)
  const [moveError, setMoveError] = useState<string | null>(null)
  const [nodeMeasurements, setNodeMeasurements] = useState<
    Record<string, NodeMeasurement>
  >({})
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance<
    PhyloFlowNode,
    PhyloFlowEdge
  > | null>(null)

  const { nodes: layoutNodes, edges } = useMemo(
    () =>
      layoutPhyloTree(tree, {
        mode: viewMode,
        nodeWidths: Object.fromEntries(
          Object.entries(nodeMeasurements).map(([id, { width }]) => [
            id,
            width,
          ]),
        ),
      }),
    [tree, nodeMeasurements, viewMode],
  )
  const layoutKey = useMemo(
    () =>
      JSON.stringify(
        layoutNodes.map((node) => [node.id, node.position.x, node.position.y]),
      ),
    [layoutNodes],
  )
  const previousLayoutKey = useRef(layoutKey)
  const measuredLayoutNodes = useMemo(
    () =>
      layoutNodes.map((node) => {
        const measured = nodeMeasurements[node.id]

        return measured === undefined ? node : { ...node, measured }
      }),
    [layoutNodes, nodeMeasurements],
  )
  const nodes = useMemo(
    () =>
      measuredLayoutNodes.map((node) =>
        node.id === selectedNodeId ? { ...node, selected: true } : node,
      ),
    [measuredLayoutNodes, selectedNodeId],
  )
  const localizedEdges = useMemo(
    () => localizeEdgeAriaLabels(edges, tree, t),
    [edges, t, tree],
  )

  useEffect(() => {
    if (reactFlowInstance === null || previousLayoutKey.current === layoutKey) {
      return
    }

    previousLayoutKey.current = layoutKey
    const timeoutId = window.setTimeout(() => {
      void reactFlowInstance.fitView(FIT_VIEW_OPTIONS)
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [reactFlowInstance, layoutKey])

  const selectedNode =
    layoutNodes.find((node) => node.id === selectedNodeId) ?? null
  const selectedTreeNode =
    selectedNodeId === null ? undefined : tree.nodes[selectedNodeId]
  const isRootSelected =
    selectedNodeId !== null && selectedNodeId === tree.rootId
  const pendingMoveNode =
    pendingMoveNodeId === null ? undefined : tree.nodes[pendingMoveNodeId]

  useEffect(() => {
    if (pendingMoveNodeId === null) {
      return
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        setMoveError(null)
        cancelMoveSubtree()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [pendingMoveNodeId, cancelMoveSubtree])

  const handleNodesChange = useCallback(
    (changes: NodeChange<PhyloFlowNode>[]) => {
      if (changes.some((change) => change.type === 'dimensions')) {
        setNodeMeasurements((current) => {
          let next = current

          for (const change of changes) {
            if (
              change.type !== 'dimensions' ||
              change.dimensions === undefined
            ) {
              continue
            }

            const previous = current[change.id]
            const { width, height } = change.dimensions
            if (previous?.width === width && previous.height === height) {
              continue
            }

            if (next === current) {
              next = { ...current }
            }
            next[change.id] = { width, height }
          }

          return next
        })
      }

      if (pendingMoveNodeId !== null) {
        return
      }

      const selectedChange = changes.find(
        (change): change is NodeSelectionChange =>
          change.type === 'select' && change.selected,
      )
      if (selectedChange !== undefined) {
        selectNode(selectedChange.id)
        return
      }

      if (
        selectedNodeId !== null &&
        changes.some(
          (change) =>
            change.type === 'select' &&
            !change.selected &&
            change.id === selectedNodeId,
        )
      ) {
        selectNode(null)
      }
    },
    [pendingMoveNodeId, selectNode, selectedNodeId],
  )

  function handleNodeClick(nodeId: string): void {
    if (pendingMoveNodeId === null) {
      selectNode(nodeId)
      return
    }

    if (nodeId === pendingMoveNodeId) {
      setMoveError(null)
      cancelMoveSubtree()
      return
    }

    try {
      completeMoveSubtree(nodeId)
      setMoveError(null)
    } catch (error) {
      if (error instanceof TreeOperationError) {
        setMoveError(
          t('moveCycleError', { label: pendingMoveNode?.label ?? '' }),
        )
      } else {
        throw error
      }
    }
  }

  function handleCancelMove(): void {
    setMoveError(null)
    cancelMoveSubtree()
  }

  function handleReorder(direction: ReorderDirection): void {
    if (
      selectedNodeId === null ||
      selectedTreeNode === undefined ||
      selectedTreeNode.parentId === null
    ) {
      return
    }

    reorderChild(selectedTreeNode.parentId, selectedNodeId, direction)
  }

  const siblingIds =
    selectedTreeNode?.parentId != null
      ? (tree.nodes[selectedTreeNode.parentId]?.childIds ?? [])
      : []
  const siblingIndex =
    selectedNodeId === null ? -1 : siblingIds.indexOf(selectedNodeId)
  const subtreeSize =
    selectedTreeNode === undefined
      ? 1
      : getSubtreeIds(tree, selectedTreeNode.id).length

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
          <div
            className="hidden items-center gap-1 rounded-md border bg-background p-0.5 sm:flex"
            role="group"
            aria-label={t('viewMode')}
          >
            <Button
              type="button"
              size="sm"
              variant={viewMode === 'cladogram' ? 'secondary' : 'ghost'}
              className="h-7 px-2 text-xs"
              aria-pressed={viewMode === 'cladogram'}
              onClick={() => setViewMode('cladogram')}
            >
              {t('cladogramMode')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={viewMode === 'phylogram' ? 'secondary' : 'ghost'}
              className="h-7 px-2 text-xs"
              aria-pressed={viewMode === 'phylogram'}
              onClick={() => setViewMode('phylogram')}
            >
              {t('phylogramMode')}
            </Button>
          </div>
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
          <LoadExampleMenu onLoadExample={importTree} />
          <ImportExportActions tree={tree} onImport={importTree} />
        </nav>
      </header>

      <main className="flex min-h-0 flex-1 overflow-hidden">
        <aside
          className="hidden min-h-0 w-64 min-w-0 shrink-0 flex-col border-r bg-muted/20 p-4 md:flex"
          aria-label={t('treeToolsSidebar')}
        >
          <NodeDetailsPanel
            node={selectedNode}
            branchLength={selectedTreeNode?.branchLength ?? null}
            isRoot={isRootSelected}
            subtreeSize={subtreeSize}
            canMoveUp={siblingIndex > 0}
            canMoveDown={
              siblingIndex >= 0 && siblingIndex < siblingIds.length - 1
            }
            isMoveMode={pendingMoveNodeId !== null}
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
            onAddMetadata={(key, value: MetadataValue) => {
              if (selectedNodeId !== null) {
                addMetadata(selectedNodeId, key, value)
              }
            }}
            onUpdateMetadata={(previousKey, key, value: MetadataValue) => {
              if (selectedNodeId !== null) {
                updateMetadata(selectedNodeId, previousKey, key, value)
              }
            }}
            onRemoveMetadata={(key) => {
              if (selectedNodeId !== null) {
                removeMetadata(selectedNodeId, key)
              }
            }}
            onAddChild={() => {
              if (selectedNodeId !== null) {
                addChild(selectedNodeId, { label: t('newNode') })
              }
            }}
            onStartMove={() => {
              if (selectedNodeId !== null && selectedNodeId !== tree.rootId) {
                setMoveError(null)
                startMoveSubtree(selectedNodeId)
              }
            }}
            onReorder={handleReorder}
            onRemoveSubtree={() => {
              if (selectedNodeId !== null && selectedNodeId !== tree.rootId) {
                removeSubtree(selectedNodeId)
              }
            }}
          />
        </aside>

        <section
          className="relative min-h-0 min-w-0 flex-1"
          aria-label={t('phylogeneticTreeCanvas')}
        >
          {pendingMoveNode !== undefined ? (
            <div
              role="status"
              className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-3 border-b bg-card px-4 py-2 shadow-sm"
            >
              <p
                className={cn(
                  'min-w-0 flex-1 text-sm',
                  moveError !== null && 'text-destructive',
                )}
              >
                {moveError ??
                  t('pickNewParentPrompt', { label: pendingMoveNode.label })}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCancelMove}
              >
                {t('pickNewParentCancel')}
              </Button>
            </div>
          ) : null}

          <ReactFlow
            nodes={nodes}
            edges={localizedEdges}
            ariaLabelConfig={ariaLabelConfig}
            onInit={setReactFlowInstance}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            defaultEdgeOptions={readOnlyEdgeOptions}
            elevateNodesOnSelect={false}
            elevateEdgesOnSelect={false}
            elementsSelectable={pendingMoveNodeId === null}
            onNodesChange={handleNodesChange}
            onNodeClick={(_, node) => handleNodeClick(node.id)}
            onPaneClick={() => {
              if (pendingMoveNodeId === null) {
                selectNode(null)
              }
            }}
            nodesDraggable={false}
            nodesConnectable={false}
            edgesReconnectable={false}
            connectOnClick={false}
            deleteKeyCode={null}
            selectionKeyCode={null}
            multiSelectionKeyCode={null}
            fitView
            fitViewOptions={FIT_VIEW_OPTIONS}
            minZoom={MIN_CANVAS_ZOOM}
            maxZoom={MAX_CANVAS_ZOOM}
            panOnDrag
            zoomOnScroll
            zoomOnPinch
          >
            <Background variant={BackgroundVariant.Lines} gap={24} />
            <Controls
              showInteractive={false}
              fitViewOptions={FIT_VIEW_OPTIONS}
              aria-label={t('treeControls')}
            />
          </ReactFlow>
        </section>
      </main>
    </div>
  )
}

export default App
