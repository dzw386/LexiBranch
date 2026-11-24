import {
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
  type RefObject,
} from 'react'
import { Download } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { PhyloTree } from '../../domain/types'
import type { PhyloFlowEdge, PhyloFlowNode } from '../../layout/layout'
import { serialize } from '../../parsers/newick'
import {
  parse as parsePhyloXml,
  serialize as serializePhyloXml,
} from '../../parsers/phyloxml'
import {
  ParseError,
  parse as parseNHX,
  serialize as serializeNHX,
} from '../../parsers/nhx'
import { useToastsStore } from '../../state/toasts'
import type { ResolvedTheme } from '../../theme/theme'
import { exportTreeImage, type ExportImageFormat } from '../canvas/exportImage'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { ConfirmDialog } from './ConfirmDialog'

interface ImportExportActionsProps {
  tree: PhyloTree
  nodes: PhyloFlowNode[]
  edges: PhyloFlowEdge[]
  theme: ResolvedTheme
  onImport: (tree: PhyloTree) => void
  returnFocusRef?: RefObject<HTMLElement | null>
  children: (actions: {
    openImport: () => void
    openExport: () => void
  }) => ReactNode
}

type ImportError =
  | { type: 'parse'; fileName: string; position: number }
  | { type: 'read'; fileName: string }

type ExportFormat = 'newick' | 'nhx' | 'phyloxml' | ExportImageFormat

function isPhyloXmlFile(file: File): boolean {
  const extension = file.name.toLowerCase().split('.').at(-1)

  return extension === 'xml' || extension === 'phyloxml'
}

function isImageFormat(format: ExportFormat): format is ExportImageFormat {
  return format === 'png' || format === 'svg'
}

function triggerDownload(href: string, fileName: string): void {
  const link = document.createElement('a')
  link.href = href
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
}

export function ImportExportActions({
  tree,
  nodes,
  edges,
  theme,
  onImport,
  returnFocusRef,
  children,
}: ImportExportActionsProps) {
  const { t } = useTranslation()
  const showToast = useToastsStore((state) => state.showToast)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importError, setImportError] = useState<ImportError | null>(null)
  const [importErrorDialogOpen, setImportErrorDialogOpen] = useState(false)
  const [pendingImport, setPendingImport] = useState<{
    tree: PhyloTree
    fileName: string
  } | null>(null)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [exportFormat, setExportFormat] = useState<ExportFormat>('newick')
  const [exportImageTheme, setExportImageTheme] = useState<ResolvedTheme>(theme)
  const [isExporting, setIsExporting] = useState(false)
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
      const contents = await file.text()
      const importedTree = isPhyloXmlFile(file)
        ? parsePhyloXml(contents)
        : parseNHX(contents)
      setPendingImport({ tree: importedTree, fileName: file.name })
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

  function confirmImport(): void {
    if (pendingImport === null) {
      return
    }

    onImport(pendingImport.tree)
    showToast({
      variant: 'success',
      messageKey: 'toastImportSuccess',
      params: { fileName: pendingImport.fileName },
    })
    setPendingImport(null)
  }

  function openExportDialog(): void {
    setExportImageTheme(theme)
    setExportDialogOpen(true)
  }

  function openImport(): void {
    fileInputRef.current?.click()
  }

  function handleCloseAutoFocus(event: Event): void {
    if (returnFocusRef?.current != null) {
      event.preventDefault()
      returnFocusRef.current.focus()
    }
  }

  async function handleDownload(): Promise<void> {
    const fileName = t(`${exportFormat}ExportFileName`)

    if (isImageFormat(exportFormat)) {
      setIsExporting(true)
      try {
        const dataUrl = await exportTreeImage({
          nodes,
          edges,
          format: exportFormat,
          theme: exportImageTheme,
        })
        triggerDownload(dataUrl, fileName)
        setExportDialogOpen(false)
        showToast({
          variant: 'success',
          messageKey: 'toastExportSuccess',
          params: { fileName },
        })
      } catch {
        showToast({
          variant: 'error',
          messageKey: 'toastImageExportError',
        })
      } finally {
        setIsExporting(false)
      }
      return
    }

    const content = {
      newick: () => serialize(tree),
      nhx: () => serializeNHX(tree),
      phyloxml: () => serializePhyloXml(tree),
    }[exportFormat]()
    const blob = new Blob([content], {
      type:
        exportFormat === 'phyloxml'
          ? 'application/xml;charset=utf-8'
          : 'text/plain;charset=utf-8',
    })
    const objectUrl = URL.createObjectURL(blob)
    triggerDownload(objectUrl, fileName)
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0)
    setExportDialogOpen(false)
    showToast({
      variant: 'success',
      messageKey: 'toastExportSuccess',
      params: { fileName },
    })
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".nwk,.newick,.nhx,.xml,.phyloxml"
        aria-label={t('treeFileInput')}
        className="hidden"
        onChange={(event) => {
          void handleFileChange(event)
        }}
      />
      {children({ openImport, openExport: openExportDialog })}

      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent onCloseAutoFocus={handleCloseAutoFocus}>
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
              <option value="phyloxml">{t('phyloXmlFormat')}</option>
              <option value="png">{t('pngFormat')}</option>
              <option value="svg">{t('svgFormat')}</option>
            </select>
          </div>
          {isImageFormat(exportFormat) ? (
            <div className="grid gap-2">
              <label
                htmlFor="export-image-theme"
                className="text-sm font-medium leading-none"
              >
                {t('imageTheme')}
              </label>
              <select
                id="export-image-theme"
                value={exportImageTheme}
                onChange={(event) =>
                  setExportImageTheme(
                    event.currentTarget.value as ResolvedTheme,
                  )
                }
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="light">{t('themeLight')}</option>
                <option value="dark">{t('themeDark')}</option>
              </select>
              <p className="text-xs text-muted-foreground">
                {t('imageThemeHint')}
              </p>
            </div>
          ) : null}
          {isImageFormat(exportFormat) ? (
            <p
              role="status"
              className="rounded-md border border-border bg-muted p-3 text-sm text-muted-foreground"
            >
              {t('imageExportHint')}
            </p>
          ) : exportFormat === 'newick' && hasMetadata ? (
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
            <Button
              type="button"
              disabled={isExporting}
              onClick={() => {
                void handleDownload()
              }}
            >
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
        <DialogContent onCloseAutoFocus={handleCloseAutoFocus}>
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

      <ConfirmDialog
        open={pendingImport !== null}
        title={t('importConfirmTitle', {
          fileName: pendingImport?.fileName ?? '',
        })}
        description={t('importConfirmDescription')}
        confirmLabel={t('confirmImport')}
        destructive
        returnFocusRef={returnFocusRef}
        onOpenChange={(open) => {
          if (!open) {
            setPendingImport(null)
          }
        }}
        onConfirm={confirmImport}
      />
    </>
  )
}
