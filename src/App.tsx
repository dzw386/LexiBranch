import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { demoEdges, demoNodes } from './demo-flow'

function App() {
  return (
    <main className="h-screen w-screen">
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
    </main>
  )
}

export default App
