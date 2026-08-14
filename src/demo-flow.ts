import type { Edge, Node } from '@xyflow/react'

export const demoNodes: Node[] = [
  {
    id: 'proto-language',
    position: { x: 80, y: 200 },
    data: { label: 'Proto-language' },
  },
  {
    id: 'germanic',
    position: { x: 420, y: 100 },
    data: { label: 'Germanic' },
  },
  {
    id: 'slavic',
    position: { x: 420, y: 300 },
    data: { label: 'Slavic' },
  },
]

export const demoEdges: Edge[] = [
  { id: 'proto-to-germanic', source: 'proto-language', target: 'germanic' },
  { id: 'proto-to-slavic', source: 'proto-language', target: 'slavic' },
]
