import type { PhyloTree } from './types'

export type SearchScope = 'all' | 'label' | 'metadata'

export interface MetadataMatch {
  key: string
  value: string
}

export interface SearchResult {
  nodeId: string
  label: string
  labelMatch: boolean
  metadataMatches: MetadataMatch[]
}

function includesQuery(text: string, query: string): boolean {
  return text.toLowerCase().includes(query)
}

export function searchTree(
  tree: PhyloTree,
  query: string,
  scope: SearchScope = 'all',
): SearchResult[] {
  const normalizedQuery = query.trim().toLowerCase()

  if (normalizedQuery === '') {
    return []
  }

  const results: SearchResult[] = []

  function visit(nodeId: string): void {
    const node = tree.nodes[nodeId]

    if (node === undefined) {
      return
    }

    const labelMatch =
      scope !== 'metadata' && includesQuery(node.label, normalizedQuery)
    const metadataMatches =
      scope === 'label'
        ? []
        : Object.entries(node.metadata).flatMap(([key, value]) => {
            const textValue = String(value)

            return includesQuery(key, normalizedQuery) ||
              includesQuery(textValue, normalizedQuery)
              ? [{ key, value: textValue }]
              : []
          })

    if (labelMatch || metadataMatches.length > 0) {
      results.push({
        nodeId: node.id,
        label: node.label,
        labelMatch,
        metadataMatches,
      })
    }

    for (const childId of node.childIds) {
      visit(childId)
    }
  }

  visit(tree.rootId)

  return results
}
