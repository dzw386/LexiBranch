import {
  PanelBottomClose,
  PanelBottomOpen,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import type { RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { AboutDialog } from '../dialogs/AboutDialog'
import { Button } from '../ui/button'
import { HeaderBrand } from './HeaderBrand'
import { TreeToolbar, type TreeToolbarProps } from './TreeToolbar'

interface AppHeaderProps {
  toolbarProps: TreeToolbarProps
  mobileSidebarOpen: boolean
  desktopSidebarOpen: boolean
  onToggleMobileSidebar: () => void
  onToggleDesktopSidebar: () => void
  mobileSidebarToggleRef: RefObject<HTMLButtonElement | null>
}

export function AppHeader({
  toolbarProps,
  mobileSidebarOpen,
  desktopSidebarOpen,
  onToggleMobileSidebar,
  onToggleDesktopSidebar,
  mobileSidebarToggleRef,
}: AppHeaderProps) {
  const { t, i18n } = useTranslation()

  return (
    <header className="relative z-40 flex shrink-0 flex-col gap-2 border-b bg-card px-3 py-2 sm:px-4 lg:h-14 lg:flex-row lg:items-center lg:justify-between lg:gap-4 lg:px-6 lg:py-0">
      <div className="flex min-w-0 items-center justify-between gap-3 lg:justify-start">
        <HeaderBrand />

        <div className="flex shrink-0 items-center gap-2">
          <label htmlFor="language-select" className="sr-only">
            {t('language')}
          </label>
          <select
            id="language-select"
            value={i18n.resolvedLanguage ?? i18n.language}
            onChange={(event) => {
              void i18n.changeLanguage(event.currentTarget.value)
            }}
            className="h-11 max-w-28 rounded-md border border-input bg-background px-2 text-xs shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring sm:h-8 sm:max-w-none sm:text-sm"
          >
            <option value="en">{t('languageEnglish')}</option>
            <option value="pl">{t('languagePolish')}</option>
          </select>
          <AboutDialog />
          <Button
            ref={mobileSidebarToggleRef}
            type="button"
            variant="outline"
            size="icon"
            className="h-11 w-11 shrink-0 md:hidden"
            aria-label={t('toggleSidebar')}
            aria-expanded={mobileSidebarOpen}
            aria-controls="tree-tools-sidebar"
            onClick={onToggleMobileSidebar}
          >
            {mobileSidebarOpen ? (
              <PanelBottomClose aria-hidden="true" />
            ) : (
              <PanelBottomOpen aria-hidden="true" />
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="hidden h-9 w-9 shrink-0 md:inline-flex"
            aria-label={t('toggleSidebar')}
            aria-expanded={desktopSidebarOpen}
            aria-controls="tree-tools-sidebar"
            onClick={onToggleDesktopSidebar}
          >
            {desktopSidebarOpen ? (
              <PanelLeftClose aria-hidden="true" />
            ) : (
              <PanelLeftOpen aria-hidden="true" />
            )}
          </Button>
        </div>
      </div>

      <TreeToolbar {...toolbarProps} />
    </header>
  )
}
