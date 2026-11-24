import { useTranslation } from 'react-i18next'
import type { SearchResult, SearchScope } from '../../domain/search'
import type { PhyloTree } from '../../domain/types'
import type {
  LayoutMode,
  PhyloFlowEdge,
  PhyloFlowNode,
} from '../../layout/layout'
import type { ResolvedTheme, ThemePreference } from '../../theme/theme'
import { ImportExportActions } from '../dialogs/ImportExportActions'
import { LoadExampleMenu } from '../dialogs/LoadExampleMenu'
import { NewTreeAction } from '../dialogs/NewTreeAction'
import { SearchDialog } from '../dialogs/SearchDialog'
import { ThemeSwitcher } from '../ThemeSwitcher'
import { Button } from '../ui/button'

export interface TreeToolbarProps {
  viewMode: LayoutMode
  onViewModeChange: (viewMode: LayoutMode) => void
  searchQuery: string
  searchScope: SearchScope
  searchResults: readonly SearchResult[]
  onSearchQueryChange: (query: string) => void
  onSearchScopeChange: (scope: SearchScope) => void
  onSelectSearchResult: (nodeId: string) => void
  themePreference: ThemePreference
  onThemePreferenceChange: (preference: ThemePreference) => void
  onNewTree: () => void
  onLoadExample: (tree: PhyloTree) => void
  tree: PhyloTree
  nodes: PhyloFlowNode[]
  edges: PhyloFlowEdge[]
  resolvedTheme: ResolvedTheme
  onImport: (tree: PhyloTree) => void
}

export function TreeToolbar({
  viewMode,
  onViewModeChange,
  searchQuery,
  searchScope,
  searchResults,
  onSearchQueryChange,
  onSearchScopeChange,
  onSelectSearchResult,
  themePreference,
  onThemePreferenceChange,
  onNewTree,
  onLoadExample,
  tree,
  nodes,
  edges,
  resolvedTheme,
  onImport,
}: TreeToolbarProps) {
  const { t } = useTranslation()

  return (
    <nav
      className="flex min-w-0 flex-wrap items-center justify-between gap-2 lg:shrink-0 lg:flex-nowrap"
      aria-label={t('workspaceActions')}
    >
      <label htmlFor="view-mode-select" className="sr-only">
        {t('viewMode')}
      </label>
      <select
        id="view-mode-select"
        value={viewMode}
        onChange={(event) =>
          onViewModeChange(
            event.currentTarget.value === 'phylogram'
              ? 'phylogram'
              : 'cladogram',
          )
        }
        className="h-11 w-32 shrink-0 rounded-md border border-input bg-background px-2 text-xs shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring lg:hidden"
      >
        <option value="cladogram">{t('cladogramMode')}</option>
        <option value="phylogram">{t('phylogramMode')}</option>
      </select>
      <div
        className="hidden items-center gap-1 rounded-md border bg-background p-0.5 lg:flex"
        role="group"
        aria-label={t('viewMode')}
      >
        <Button
          type="button"
          size="sm"
          variant={viewMode === 'cladogram' ? 'secondary' : 'ghost'}
          className="h-7 px-2 text-xs"
          aria-pressed={viewMode === 'cladogram'}
          onClick={() => onViewModeChange('cladogram')}
        >
          {t('cladogramMode')}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={viewMode === 'phylogram' ? 'secondary' : 'ghost'}
          className="h-7 px-2 text-xs"
          aria-pressed={viewMode === 'phylogram'}
          onClick={() => onViewModeChange('phylogram')}
        >
          {t('phylogramMode')}
        </Button>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <SearchDialog
          query={searchQuery}
          scope={searchScope}
          results={searchResults}
          onQueryChange={onSearchQueryChange}
          onScopeChange={onSearchScopeChange}
          onSelectResult={onSelectSearchResult}
        />
        <ThemeSwitcher
          value={themePreference}
          onChange={onThemePreferenceChange}
        />
        <NewTreeAction onNewTree={onNewTree} />
        <LoadExampleMenu onLoadExample={onLoadExample} />
        <ImportExportActions
          tree={tree}
          nodes={nodes}
          edges={edges}
          theme={resolvedTheme}
          onImport={onImport}
        />
      </div>
    </nav>
  )
}
