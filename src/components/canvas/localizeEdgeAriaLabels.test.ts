import { describe, expect, it } from 'vitest'
import i18n from '../../i18n'
import { layoutPhyloTree } from '../../layout/layout'
import { createInitialTree } from '../../state/store'
import { localizeEdgeAriaLabels } from './localizeEdgeAriaLabels'

describe('localizeEdgeAriaLabels', () => {
  it('names each edge after the nodes it connects', () => {
    const tree = createInitialTree()
    const { edges } = layoutPhyloTree(tree)

    const localized = localizeEdgeAriaLabels(edges, tree, i18n.t)

    expect(localized).toHaveLength(edges.length)
    expect(localized.every((edge) => edge.ariaLabel !== undefined)).toBe(true)
    expect(localized[0]?.ariaLabel).toBe(
      'Branch connecting Proto-language and Germanic',
    )
  })

  it('follows the selected language', async () => {
    const tree = createInitialTree()
    const { edges } = layoutPhyloTree(tree)
    await i18n.changeLanguage('pl')

    try {
      const localized = localizeEdgeAriaLabels(edges, tree, i18n.t)

      expect(localized[0]?.ariaLabel).toBe(
        'Gałąź łącząca Proto-language i Germanic',
      )
    } finally {
      await i18n.changeLanguage('en')
    }
  })
})
