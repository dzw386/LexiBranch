import { layoutTree, type NestedTreeNode } from './layout/layout'

export const demoTree: NestedTreeNode = {
  id: 'proto-language',
  label: 'Proto-language',
  children: [
    {
      id: 'germanic',
      label: 'Germanic',
      branchLength: 0.8,
      metadata: { branch: 'West Germanic' },
      children: [
        { id: 'english', label: 'English', branchLength: 0.4 },
        { id: 'german', label: 'German', branchLength: 0.4 },
      ],
    },
    {
      id: 'slavic',
      label: 'Slavic',
      branchLength: 0.8,
      children: [
        { id: 'polish', label: 'Polish', branchLength: 0.4 },
        { id: 'russian', label: 'Russian', branchLength: 0.4 },
      ],
    },
  ],
}

export const { nodes: demoNodes, edges: demoEdges } = layoutTree(demoTree)
