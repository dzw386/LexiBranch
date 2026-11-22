import { useState, type FormEvent } from 'react'
import { Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { SearchResult, SearchScope } from '../../domain/search'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'

export interface SearchDialogProps {
  query: string
  scope: SearchScope
  results: readonly SearchResult[]
  onQueryChange: (query: string) => void
  onScopeChange: (scope: SearchScope) => void
  onSelectResult: (nodeId: string) => void
}

const SEARCH_SCOPES: SearchScope[] = ['all', 'label', 'metadata']

export function SearchDialog({
  query,
  scope,
  results,
  onQueryChange,
  onScopeChange,
  onSelectResult,
}: SearchDialogProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const trimmedQuery = query.trim()

  function handleSelect(nodeId: string): void {
    onSelectResult(nodeId)
    setOpen(false)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()

    const firstResult = results[0]

    if (firstResult !== undefined) {
      handleSelect(firstResult.nodeId)
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-11 w-11 shrink-0 px-2 sm:h-8 sm:w-auto sm:px-3"
        aria-label={t('search')}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <Search aria-hidden="true" />
        <span className="hidden sm:inline">{t('search')}</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('searchTitle')}</DialogTitle>
            <DialogDescription>{t('searchDescription')}</DialogDescription>
          </DialogHeader>

          <form
            className="grid gap-3 sm:grid-cols-[1fr_10rem]"
            onSubmit={handleSubmit}
          >
            <div className="grid gap-1.5">
              <label
                htmlFor="node-search-query"
                className="text-sm font-medium leading-none"
              >
                {t('searchQueryLabel')}
              </label>
              <input
                id="node-search-query"
                type="search"
                value={query}
                placeholder={t('searchQueryPlaceholder')}
                autoComplete="off"
                onChange={(event) => onQueryChange(event.currentTarget.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none transition-colors focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <div className="grid gap-1.5">
              <label
                htmlFor="node-search-scope"
                className="text-sm font-medium leading-none"
              >
                {t('searchScopeLabel')}
              </label>
              <select
                id="node-search-scope"
                value={scope}
                onChange={(event) =>
                  onScopeChange(event.currentTarget.value as SearchScope)
                }
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {SEARCH_SCOPES.map((searchScope) => (
                  <option key={searchScope} value={searchScope}>
                    {t(`searchScope_${searchScope}`)}
                  </option>
                ))}
              </select>
            </div>
          </form>

          {trimmedQuery === '' ? (
            <p className="rounded-md border border-border bg-muted p-3 text-sm text-muted-foreground">
              {t('searchPrompt')}
            </p>
          ) : results.length === 0 ? (
            <p
              role="status"
              className="rounded-md border border-border bg-muted p-3 text-sm text-muted-foreground"
            >
              {t('searchNoResults', { query: trimmedQuery })}
            </p>
          ) : (
            <div className="grid gap-2">
              <p role="status" className="text-xs text-muted-foreground">
                {t('searchResultCount', { count: results.length })}
              </p>
              <ul
                aria-label={t('searchResults')}
                className="max-h-64 space-y-1 overflow-y-auto"
              >
                {results.map((result) => {
                  const resultLabel =
                    result.label.trim() === '' ? t('unnamedNode') : result.label
                  const metadataText = result.metadataMatches
                    .map((match) =>
                      t('searchMetadataMatch', {
                        key: match.key,
                        value: match.value,
                      }),
                    )
                    .join(' · ')

                  return (
                    <li key={result.nodeId}>
                      <button
                        type="button"
                        className="flex min-h-11 w-full flex-col items-start gap-0.5 rounded-md border px-3 py-2 text-left text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={
                          metadataText === ''
                            ? resultLabel
                            : t('searchResultWithMetadata', {
                                label: resultLabel,
                                matches: metadataText,
                              })
                        }
                        onClick={() => handleSelect(result.nodeId)}
                      >
                        <span className="max-w-full truncate font-medium">
                          {resultLabel}
                        </span>
                        {metadataText === '' ? null : (
                          <span className="max-w-full truncate text-xs text-muted-foreground">
                            {metadataText}
                          </span>
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
