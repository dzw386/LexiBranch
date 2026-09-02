import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { PhyloFlowNode } from '../../layout/layout'
import { Button } from '../ui/button'

type ValidationError = 'labelRequired' | 'branchLengthInvalid'

export interface NodeDetailsPanelProps {
  node: PhyloFlowNode | null
  branchLength: number | null
  isRoot?: boolean
  onLabelChange?: (label: string) => void
  onBranchLengthChange?: (branchLength: number | null) => void
}

interface ValidationErrors {
  label?: ValidationError
  branchLength?: ValidationError
}

function getLabelError(label: string): ValidationError | undefined {
  return label.trim() === '' ? 'labelRequired' : undefined
}

function parseBranchLength(value: string): {
  value: number | null
  error?: ValidationError
} {
  if (value.trim() === '') {
    return { value: null }
  }

  const branchLength = Number(value)

  if (!Number.isFinite(branchLength) || branchLength < 0) {
    return { value: null, error: 'branchLengthInvalid' }
  }

  return { value: branchLength }
}

interface NodeEditFormProps {
  label: string
  branchLength: number | null
  isRoot: boolean
  onLabelChange?: (label: string) => void
  onBranchLengthChange?: (branchLength: number | null) => void
}

function NodeEditForm({
  label: initialLabel,
  branchLength: initialBranchLength,
  isRoot,
  onLabelChange,
  onBranchLengthChange,
}: NodeEditFormProps) {
  const { t } = useTranslation()
  const [label, setLabel] = useState(initialLabel)
  const [branchLength, setBranchLength] = useState(
    initialBranchLength === null ? '' : String(initialBranchLength),
  )
  const [errors, setErrors] = useState<ValidationErrors>({})

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()

    const labelError = getLabelError(label)
    const parsedBranchLength = isRoot
      ? { value: null }
      : parseBranchLength(branchLength)
    const nextErrors: ValidationErrors = {
      ...(labelError === undefined ? {} : { label: labelError }),
      ...(parsedBranchLength.error === undefined
        ? {}
        : { branchLength: parsedBranchLength.error }),
    }

    setErrors(nextErrors)

    if (labelError !== undefined || parsedBranchLength.error !== undefined) {
      return
    }

    onLabelChange?.(label.trim())
    if (!isRoot) {
      onBranchLengthChange?.(parsedBranchLength.value)
    }
  }

  function handleLabelInput(value: string): void {
    setLabel(value)
    const error = getLabelError(value)
    setErrors((current) => ({ ...current, label: error }))
  }

  function handleBranchLengthInput(value: string): void {
    setBranchLength(value)
    const parsed = parseBranchLength(value)
    setErrors((current) => ({ ...current, branchLength: parsed.error }))
  }

  return (
    <form className="space-y-4" noValidate onSubmit={handleSubmit}>
      <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {t('editNode')}
      </h3>

      <div className="space-y-1.5">
        <label htmlFor="node-label" className="text-xs font-medium">
          {t('nodeLabel')}
        </label>
        <input
          id="node-label"
          name="label"
          type="text"
          placeholder={t('unnamedNode')}
          value={label}
          onChange={(event) => handleLabelInput(event.currentTarget.value)}
          aria-invalid={errors.label !== undefined}
          aria-describedby={
            errors.label === undefined ? undefined : 'node-label-error'
          }
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none transition-colors focus-visible:ring-1 focus-visible:ring-ring"
        />
        {errors.label !== undefined ? (
          <p
            id="node-label-error"
            role="alert"
            className="text-xs text-destructive"
          >
            {t(errors.label)}
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="branch-length" className="text-xs font-medium">
          {t('branchLength')}
        </label>
        <input
          id="branch-length"
          name="branchLength"
          type="number"
          min="0"
          step="any"
          inputMode="decimal"
          placeholder={t('notSpecified')}
          value={branchLength}
          disabled={isRoot}
          onChange={(event) =>
            handleBranchLengthInput(event.currentTarget.value)
          }
          aria-invalid={errors.branchLength !== undefined}
          aria-describedby={
            isRoot
              ? 'root-branch-length-hint'
              : errors.branchLength === undefined
                ? undefined
                : 'branch-length-error'
          }
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm tabular-nums shadow-sm outline-none transition-colors focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
        />
        {isRoot ? (
          <p
            id="root-branch-length-hint"
            className="text-xs text-muted-foreground"
          >
            {t('rootBranchLengthNotApplicable')}
          </p>
        ) : null}
        {errors.branchLength !== undefined ? (
          <p
            id="branch-length-error"
            role="alert"
            className="text-xs text-destructive"
          >
            {t(errors.branchLength)}
          </p>
        ) : null}
      </div>

      <Button type="submit" size="sm" className="w-full">
        {t('saveChanges')}
      </Button>
    </form>
  )
}

export function NodeDetailsPanel({
  node,
  branchLength,
  isRoot = false,
  onLabelChange,
  onBranchLengthChange,
}: NodeDetailsPanelProps) {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {t('workspace')}
        </p>
        <h2 className="mt-1 text-base font-medium">{t('nodeDetails')}</h2>
      </div>

      {node === null ? (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed bg-background/60 p-5 text-center">
          <p className="text-sm leading-6 text-muted-foreground">
            {t('selectNodePrompt')}
          </p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto">
          <NodeEditForm
            key={node.id}
            label={node.data.label}
            branchLength={branchLength}
            isRoot={isRoot}
            onLabelChange={onLabelChange}
            onBranchLengthChange={onBranchLengthChange}
          />

          <dl className="space-y-4">
            <div className="space-y-1">
              <dt className="text-xs font-medium text-muted-foreground">
                {t('nodeId')}
              </dt>
              <dd className="break-all font-mono text-xs text-muted-foreground">
                {node.id}
              </dd>
            </div>
          </dl>

          <section aria-labelledby="node-metadata-heading">
            <h3
              id="node-metadata-heading"
              className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"
            >
              {t('metadata')}
            </h3>
            {Object.entries(node.data.metadata).length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('noMetadata')}</p>
            ) : (
              <dl className="divide-y rounded-md border bg-background/60">
                {Object.entries(node.data.metadata).map(([key, value]) => (
                  <div
                    key={key}
                    className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-3 px-3 py-2.5"
                  >
                    <dt className="wrap-break-word text-xs font-medium text-muted-foreground">
                      {key}
                    </dt>
                    <dd className="wrap-break-word text-right text-sm">
                      {String(value)}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
