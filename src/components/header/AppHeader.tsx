import {
  PanelBottomClose,
  PanelBottomOpen,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
} from 'lucide-react'
import { useRef, useState, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import type { ThemePreference } from '../../theme/theme'
import { AboutDialog } from '../dialogs/AboutDialog'
import { SettingsDialog } from '../dialogs/SettingsDialog'
import { Button } from '../ui/button'
import { HeaderBrand } from './HeaderBrand'
import { TreeToolbar, type TreeToolbarProps } from './TreeToolbar'

interface AppHeaderProps {
  toolbarProps: TreeToolbarProps
  themePreference: ThemePreference
  onThemePreferenceChange: (preference: ThemePreference) => void
  mobileSidebarOpen: boolean
  desktopSidebarOpen: boolean
  onToggleMobileSidebar: () => void
  onToggleDesktopSidebar: () => void
  mobileSidebarToggleRef: RefObject<HTMLButtonElement | null>
}

export function AppHeader({
  toolbarProps,
  themePreference,
  onThemePreferenceChange,
  mobileSidebarOpen,
  desktopSidebarOpen,
  onToggleMobileSidebar,
  onToggleDesktopSidebar,
  mobileSidebarToggleRef,
}: AppHeaderProps) {
  const { t } = useTranslation()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const settingsTriggerRef = useRef<HTMLButtonElement>(null)
  const brandTriggerRef = useRef<HTMLButtonElement>(null)
  const settingsAboutButtonRef = useRef<HTMLButtonElement>(null)
  const aboutReturnFocusRef = useRef<HTMLElement | null>(null)

  function openAboutFromBrand(): void {
    aboutReturnFocusRef.current = brandTriggerRef.current
    setAboutOpen(true)
  }

  function openAboutFromSettings(): void {
    aboutReturnFocusRef.current = settingsAboutButtonRef.current
    setAboutOpen(true)
  }

  return (
    <header className="relative z-40 flex shrink-0 flex-col gap-2 border-b bg-card px-3 py-2 sm:px-4 lg:h-14 lg:flex-row lg:items-center lg:justify-between lg:gap-4 lg:px-6 lg:py-0">
      <div className="flex min-w-0 items-center justify-between gap-3 lg:justify-start">
        <HeaderBrand
          triggerRef={brandTriggerRef}
          onOpenAbout={openAboutFromBrand}
        />

        <div className="flex shrink-0 items-center gap-2">
          <Button
            ref={settingsTriggerRef}
            type="button"
            variant="outline"
            size="icon"
            className="h-11 w-11 shrink-0 md:h-9 md:w-9"
            aria-label={t('settings')}
            aria-haspopup="dialog"
            aria-expanded={settingsOpen}
            onClick={() => setSettingsOpen(true)}
          >
            <Settings aria-hidden="true" />
          </Button>
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

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        themePreference={themePreference}
        onThemePreferenceChange={onThemePreferenceChange}
        onOpenAbout={openAboutFromSettings}
        returnFocusRef={settingsTriggerRef}
        aboutButtonRef={settingsAboutButtonRef}
      />
      <AboutDialog
        open={aboutOpen}
        onOpenChange={setAboutOpen}
        returnFocusRef={aboutReturnFocusRef}
      />
    </header>
  )
}
