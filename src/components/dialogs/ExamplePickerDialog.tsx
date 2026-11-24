import { useRef, useState, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import type { PhyloTree } from '../../domain/types'
import { parse as parsePhyloXml } from '../../parsers/phyloxml'
import { SAMPLES, type SampleId } from '../../parsers/samples'
import { useToastsStore } from '../../state/toasts'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { ConfirmDialog } from './ConfirmDialog'

export interface ExamplePickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onLoadExample: (tree: PhyloTree) => void
  returnFocusRef?: RefObject<HTMLElement | null>
}

const SAMPLE_LABEL_KEYS: Record<SampleId, string> = {
  'indo-european': 'sampleIndoEuropean',
  uralic: 'sampleUralic',
  turkic: 'sampleTurkic',
  sinitic: 'sampleSinitic',
  japonic: 'sampleJaponic',
}

export function ExamplePickerDialog({
  open,
  onOpenChange,
  onLoadExample,
  returnFocusRef,
}: ExamplePickerDialogProps) {
  const { t } = useTranslation()
  const showToast = useToastsStore((state) => state.showToast)
  const firstSampleRef = useRef<HTMLButtonElement>(null)
  const skipFocusReturnRef = useRef(false)
  const [pendingSample, setPendingSample] = useState<{
    tree: PhyloTree
    name: string
  } | null>(null)

  function focusReturnTarget(event: Event): void {
    if (skipFocusReturnRef.current) {
      skipFocusReturnRef.current = false
      event.preventDefault()
      return
    }

    if (returnFocusRef?.current != null) {
      event.preventDefault()
      returnFocusRef.current.focus()
    }
  }

  function handleSelect(text: string, name: string): void {
    const importedTree = parsePhyloXml(text)
    skipFocusReturnRef.current = true
    setPendingSample({ tree: importedTree, name })
    onOpenChange(false)
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
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            firstSampleRef.current?.focus()
          }}
          onCloseAutoFocus={focusReturnTarget}
        >
          <DialogHeader>
            <DialogTitle>{t('loadExampleDialogTitle')}</DialogTitle>
            <DialogDescription>
              {t('loadExampleDialogDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1">
            {SAMPLES.map((sample, index) => (
              <button
                key={sample.id}
                ref={index === 0 ? firstSampleRef : undefined}
                type="button"
                className="flex min-h-11 w-full items-center rounded-md border px-3 py-2 text-left text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() =>
                  handleSelect(sample.text, t(SAMPLE_LABEL_KEYS[sample.id]))
                }
              >
                {t(SAMPLE_LABEL_KEYS[sample.id])}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={pendingSample !== null}
        title={t('loadExampleConfirmTitle', {
          name: pendingSample?.name ?? '',
        })}
        description={t('loadExampleConfirmDescription')}
        confirmLabel={t('confirmLoadExample')}
        destructive
        returnFocusRef={returnFocusRef}
        onOpenChange={(open) => {
          if (!open) {
            setPendingSample(null)
          }
        }}
        onConfirm={confirmLoadExample}
      />
    </>
  )
}
