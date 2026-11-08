import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { afterEach, describe, expect, it } from 'vitest'
import type { PhyloTree } from '../../domain/types'
import type { AnalysisModule } from '../../modules/types'
import { createInitialTree } from '../../state/store'
import i18n from '../../i18n'
import { AnalysisPanel } from './AnalysisPanel'

function renderPanel() {
  return render(
    <I18nextProvider i18n={i18n}>
      <AnalysisPanel tree={createInitialTree()} />
    </I18nextProvider>,
  )
}

describe('AnalysisPanel', () => {
  afterEach(async () => {
    cleanup()
    await i18n.changeLanguage('en')
  })

  it('is collapsed by default and toggles its content', () => {
    renderPanel()

    const region = screen.getByRole('region', { name: 'Analysis' })
    const toggle = within(region).getByRole('button', { name: 'Analysis' })

    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(within(region).queryByText('Tree statistics')).toBeNull()

    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(within(region).getByText('Tree statistics')).toBeDefined()

    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(within(region).queryByText('Tree statistics')).toBeNull()
  })

  it('renders the tree statistics module after expanding', () => {
    renderPanel()

    const region = screen.getByRole('region', { name: 'Analysis' })
    fireEvent.click(within(region).getByRole('button', { name: 'Analysis' }))

    expect(within(region).getByText('Tree statistics')).toBeDefined()
    expect(
      within(region).getByText('Nodes').nextElementSibling?.textContent,
    ).toBe('7')
    expect(
      within(region).getByText('Max depth').nextElementSibling?.textContent,
    ).toBe('2')
    expect(
      within(region).getByText('Avg. branch length').nextElementSibling
        ?.textContent,
    ).toBe('0.533')
  })

  it('gives each module panel its own tree snapshot', () => {
    const observedLabels: string[] = []
    const MutatingPanel = ({ tree }: { tree: PhyloTree }) => {
      tree.nodes[tree.rootId]!.label = 'Mutated'
      return null
    }
    const ObservingPanel = ({ tree }: { tree: PhyloTree }) => {
      observedLabels.push(tree.nodes[tree.rootId]?.label ?? '')
      return null
    }
    const modules: AnalysisModule[] = [
      {
        id: 'mutator',
        nameKey: 'treeStatsName',
        descriptionKey: 'treeStatsDescription',
        run: () => null,
        Panel: MutatingPanel,
      },
      {
        id: 'observer',
        nameKey: 'treeStatsName',
        descriptionKey: 'treeStatsDescription',
        run: () => null,
        Panel: ObservingPanel,
      },
    ]
    const tree = createInitialTree()

    render(
      <I18nextProvider i18n={i18n}>
        <AnalysisPanel tree={tree} modules={modules} />
      </I18nextProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Analysis' }))

    expect(observedLabels).toEqual(['Proto-language'])
    expect(tree.nodes[tree.rootId]?.label).toBe('Proto-language')
  })

  it('translates the analysis section and statistics labels', async () => {
    await i18n.changeLanguage('pl')
    renderPanel()

    const region = screen.getByRole('region', { name: 'Analiza' })
    fireEvent.click(within(region).getByRole('button', { name: 'Analiza' }))

    expect(within(region).getByText('Statystyki drzewa')).toBeDefined()
    expect(within(region).getByText('Liczba węzłów')).toBeDefined()
    expect(within(region).getByText('Maksymalna głębokość')).toBeDefined()
    expect(within(region).getByText('Śr. długość gałęzi')).toBeDefined()
  })
})
