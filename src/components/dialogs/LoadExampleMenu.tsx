import { useEffect, useRef, useState } from 'react'
import { BookOpen, ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { PhyloTree } from '../../domain/types'
import { parse as parsePhyloXml } from '../../parsers/phyloxml'
import { SAMPLES, type SampleId } from '../../parsers/samples'
import { useToastsStore } from '../../state/toasts'
import { Button } from '../ui/button'
import { ConfirmDialog } from './ConfirmDialog'

interface LoadExampleMenuProps {
  onLoadExample: (tree: PhyloTree) => void
}

const SAMPLE_LABEL_KEYS: Record<SampleId, string> = {
  'indo-european': 'sampleIndoEuropean',
  uralic: 'sampleUralic',
  turkic: 'sampleTurkic',
  sinitic: 'sampleSinitic',
  japonic: 'sampleJaponic',
}

export function LoadExampleMenu({ onLoadExample }: LoadExampleMenuProps) {
  const { t } = useTranslation()
  const showToast = useToastsStore((state) => state.showToast)
  const [open, setOpen] = useState(false)
  const [pendingSample, setPendingSample] = useState<{
    tree: PhyloTree
    name: string
  } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    function handlePointerDown(event: MouseEvent): void {
      if (
        containerRef.current !== null &&
        event.target instanceof Node &&
        !containerRef.current.contains(event.target)
      ) {
        setOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  function handleSelect(text: string, name: string): void {
    const importedTree = parsePhyloXml(text)
    setPendingSample({ tree: importedTree, name })
    setOpen(false)
  }

  function confirmLoadExample(): void {
    if (pendingSample === null) {
      return
    }

    onLoadExample(pendingSample.tree)
    showToast({
      variant: 'success',
      messageKey: 'toastExampleLoaded',
      params: { name: pendingSample.name },
    })
    setPendingSample(null)
  }

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-11 w-11 shrink-0 px-2 sm:h-8 sm:w-auto sm:px-3"
        aria-label={t('loadExample')}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <BookOpen aria-hidden="true" />
        <span className="hidden sm:inline">{t('loadExample')}</span>
        <ChevronDown
          aria-hidden="true"
          className="hidden opacity-60 sm:block"
        />
      </Button>

      {open ? (
        <div
          role="menu"
          aria-label={t('loadExample')}
          className="absolute right-0 top-full z-50 mt-1 min-w-44 rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
        >
          {SAMPLES.map((sample) => (
            <button
              key={sample.id}
              type="button"
              role="menuitem"
              className="flex min-h-11 w-full items-center rounded-sm px-2.5 py-1.5 text-left text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
              onClick={() =>
                handleSelect(sample.text, t(SAMPLE_LABEL_KEYS[sample.id]))
              }
            >
              {t(SAMPLE_LABEL_KEYS[sample.id])}
            </button>
          ))}
        </div>
      ) : null}

      <ConfirmDialog
        open={pendingSample !== null}
        title={t('loadExampleConfirmTitle', {
          name: pendingSample?.name ?? '',
        })}
        description={t('loadExampleConfirmDescription')}
        confirmLabel={t('confirmLoadExample')}
        destructive
        onOpenChange={(open) => {
          if (!open) {
            setPendingSample(null)
          }
        }}
        onConfirm={confirmLoadExample}
      />
    </div>
  )
}
