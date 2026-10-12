import { useRef, useState, type ChangeEvent } from 'react'
import { Download, Upload } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { PhyloTree } from '../../domain/types'
import { serialize } from '../../parsers/newick'
import {
  ParseError,
  parse as parseNHX,
  serialize as serializeNHX,
} from '../../parsers/nhx'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'

interface ImportExportActionsProps {
  tree: PhyloTree
  onImport: (tree: PhyloTree) => void
}

type ImportError =
  | { type: 'parse'; fileName: string; position: number }
  | { type: 'read'; fileName: string }

type ExportFormat = 'newick' | 'nhx'

export function ImportExportActions({
  tree,
  onImport,
}: ImportExportActionsProps) {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importError, setImportError] = useState<ImportError | null>(null)
  const [importErrorDialogOpen, setImportErrorDialogOpen] = useState(false)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [exportFormat, setExportFormat] = useState<ExportFormat>('newick')
  const hasMetadata = Object.values(tree.nodes).some(
    (node) => Object.keys(node.metadata).length > 0,
  )

  async function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
    const input = event.currentTarget
    const file = input.files?.[0]
    input.value = ''

    if (file === undefined) {
      return
    }

    setImportError(null)

    try {
      const importedTree = parseNHX(await file.text())
      onImport(importedTree)
    } catch (error) {
      if (error instanceof ParseError) {
        setImportError({
          type: 'parse',
          fileName: file.name,
          position: error.position,
        })
        setImportErrorDialogOpen(true)
        return
      }

      setImportError({ type: 'read', fileName: file.name })
      setImportErrorDialogOpen(true)
    }
  }

  function handleDownload(): void {
    const content =
      exportFormat === 'nhx' ? serializeNHX(tree) : serialize(tree)
    const blob = new Blob([content], {
      type: 'text/plain;charset=utf-8',
    })
    const objectUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = t(
      exportFormat === 'nhx' ? 'nhxExportFileName' : 'exportFileName',
    )
    document.body.append(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0)
    setExportDialogOpen(false)
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".nwk,.newick,.nhx"
        aria-label={t('treeFileInput')}
        className="hidden"
        onChange={(event) => {
          void handleFileChange(event)
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="px-2 sm:px-3"
        aria-label={t('import')}
        title={t('importTreeFile')}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload aria-hidden="true" />
        <span className="hidden sm:inline">{t('import')}</span>
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="px-2 sm:px-3"
        aria-label={t('export')}
        onClick={() => setExportDialogOpen(true)}
      >
        <Download aria-hidden="true" />
        <span className="hidden sm:inline">{t('export')}</span>
      </Button>

      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('exportAs')}</DialogTitle>
            <DialogDescription>
              {t('exportDialogDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <label
              htmlFor="export-format"
              className="text-sm font-medium leading-none"
            >
              {t('exportFormat')}
            </label>
            <select
              id="export-format"
              value={exportFormat}
              onChange={(event) =>
                setExportFormat(event.currentTarget.value as ExportFormat)
              }
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="newick">{t('newickFormat')}</option>
              <option value="nhx">{t('nhxFormat')}</option>
            </select>
          </div>
          {exportFormat === 'newick' && hasMetadata ? (
            <p
              role="status"
              className="rounded-md border border-border bg-muted p-3 text-sm text-muted-foreground"
            >
              {t('newickMetadataWarning')}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setExportDialogOpen(false)}
            >
              {t('cancel')}
            </Button>
            <Button type="button" onClick={handleDownload}>
              <Download aria-hidden="true" />
              {t('download')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={importErrorDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setImportErrorDialogOpen(false)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('importErrorTitle')}</DialogTitle>
            <DialogDescription>
              {importError?.type === 'parse'
                ? t('importParseErrorDescription', {
                    fileName: importError.fileName,
                  })
                : t('importReadErrorDescription', {
                    fileName: importError?.fileName ?? '',
                  })}
            </DialogDescription>
          </DialogHeader>
          {importError?.type === 'parse' ? (
            <p role="status" className="text-sm text-muted-foreground">
              {t('importParseErrorPosition', {
                position: importError.position + 1,
              })}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              onClick={() => setImportErrorDialogOpen(false)}
            >
              {t('close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
