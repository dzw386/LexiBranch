import { layoutTree, type NestedTreeNode } from './layout/layout'

export const demoTree: NestedTreeNode = {
  id: 'proto-language',
  label: 'Proto-language',
  children: [
    {
      id: 'germanic',
      label: 'Germanic',
      children: [
        { id: 'english', label: 'English' },
        { id: 'german', label: 'German' },
      ],
    },
    {
      id: 'slavic',
      label: 'Slavic',
      children: [
        { id: 'polish', label: 'Polish' },
        { id: 'russian', label: 'Russian' },
      ],
    },
  ],
}

export const { nodes: demoNodes, edges: demoEdges } = layoutTree(demoTree)
