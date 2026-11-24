import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
} from 'react'
import {
  BookOpen,
  Download,
  EllipsisVertical,
  Plus,
  Upload,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { PhyloTree } from '../../domain/types'
import { Button } from '../ui/button'
import { ConfirmDialog } from './ConfirmDialog'
import { ExamplePickerDialog } from './ExamplePickerDialog'

export interface TreeActionsMenuProps {
  onNewTree: () => void
  onLoadExample: (tree: PhyloTree) => void
  onImport: () => void
  onExport: () => void
  triggerRef?: RefObject<HTMLButtonElement | null>
}

interface MenuAction {
  label: string
  icon: typeof Plus
  onSelect: () => void
}

export function TreeActionsMenu({
  onNewTree,
  onLoadExample,
  onImport,
  onExport,
  triggerRef: triggerRefProp,
}: TreeActionsMenuProps) {
  const { t } = useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [newTreeConfirmOpen, setNewTreeConfirmOpen] = useState(false)
  const [examplePickerOpen, setExamplePickerOpen] = useState(false)
  const internalTriggerRef = useRef<HTMLButtonElement>(null)
  const triggerRef = triggerRefProp ?? internalTriggerRef
  const containerRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) {
      return
    }

    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()

    function handlePointerDown(event: MouseEvent): void {
      if (
        containerRef.current !== null &&
        event.target instanceof Node &&
        !containerRef.current.contains(event.target)
      ) {
        setMenuOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape' && !event.defaultPrevented) {
        event.preventDefault()
        setMenuOpen(false)
        triggerRef.current?.focus()
      }
    }

    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown, true)
    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [menuOpen, triggerRef])

  function handleMenuKeyDown(event: ReactKeyboardEvent<HTMLDivElement>): void {
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
    )
    if (items.length === 0) {
      return
    }

    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      items[event.key === 'Home' ? 0 : items.length - 1]?.focus()
      return
    }

    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
      return
    }

    event.preventDefault()
    const offset = event.key === 'ArrowDown' ? 1 : -1
    const currentIndex = items.findIndex(
      (item) => item === document.activeElement,
    )
    const nextIndex =
      currentIndex === -1
        ? offset === 1
          ? 0
          : items.length - 1
        : (currentIndex + offset + items.length) % items.length
    items[nextIndex]?.focus()
  }

  function runAction(action: () => void): void {
    setMenuOpen(false)
    triggerRef.current?.focus()
    action()
  }

  const actions: MenuAction[] = [
    {
      label: t('newTree'),
      icon: Plus,
      onSelect: () => setNewTreeConfirmOpen(true),
    },
    {
      label: t('loadExampleEllipsis'),
      icon: BookOpen,
      onSelect: () => setExamplePickerOpen(true),
    },
    { label: t('import'), icon: Upload, onSelect: onImport },
    { label: t('export'), icon: Download, onSelect: onExport },
  ]

  return (
    <div ref={containerRef} className="relative">
      <Button
        ref={triggerRef}
        type="button"
        variant="outline"
        size="sm"
        className="h-11 w-11 shrink-0 px-2 sm:h-8 sm:w-auto sm:px-3"
        aria-label={t('treeActions')}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-controls={menuOpen ? 'tree-actions-menu' : undefined}
        onClick={() => setMenuOpen((current) => !current)}
      >
        <EllipsisVertical aria-hidden="true" />
        <span className="hidden sm:inline">{t('treeActions')}</span>
      </Button>

      {menuOpen ? (
        <div
          ref={menuRef}
          id="tree-actions-menu"
          role="menu"
          aria-label={t('treeActions')}
          className="absolute right-0 top-full z-50 mt-1 min-w-48 rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
          onKeyDown={handleMenuKeyDown}
        >
          {actions.map((action) => {
            const Icon = action.icon

            return (
              <button
                key={action.label}
                type="button"
                role="menuitem"
                tabIndex={-1}
                className="flex min-h-11 w-full items-center gap-2 rounded-sm px-2.5 py-1.5 text-left text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => runAction(action.onSelect)}
              >
                <Icon aria-hidden="true" className="size-4 shrink-0" />
                {action.label}
              </button>
            )
          })}
        </div>
      ) : null}

      <ConfirmDialog
        open={newTreeConfirmOpen}
        title={t('newTreeTitle')}
        description={t('newTreeDescription')}
        confirmLabel={t('confirmNewTree')}
        destructive
        returnFocusRef={triggerRef}
        onOpenChange={setNewTreeConfirmOpen}
        onConfirm={onNewTree}
      />
      <ExamplePickerDialog
        open={examplePickerOpen}
        onOpenChange={setExamplePickerOpen}
        onLoadExample={onLoadExample}
        returnFocusRef={triggerRef}
      />
    </div>
  )
}
