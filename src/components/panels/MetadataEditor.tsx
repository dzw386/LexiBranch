import { useState, type FormEvent } from 'react'
import { Check, Plus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { MetadataValue } from '../../domain/types'
import { Button } from '../ui/button'

type MetadataType = 'string' | 'number' | 'boolean'
type MetadataValidationError =
  'metadataKeyRequired' | 'metadataDuplicateKey' | 'metadataNumberInvalid'

export interface MetadataEditorProps {
  metadata: Record<string, MetadataValue>
  disabled?: boolean
  onAdd?: (key: string, value: MetadataValue) => void
  onUpdate?: (previousKey: string, key: string, value: MetadataValue) => void
  onRemove?: (key: string) => void
}

interface MetadataEntryRowProps {
  metadataKey: string
  value: MetadataValue
  existingKeys: string[]
  disabled?: boolean
  onUpdate?: MetadataEditorProps['onUpdate']
  onRemove?: MetadataEditorProps['onRemove']
}

interface ParsedMetadataValue {
  value?: MetadataValue
  error?: MetadataValidationError
}

function getMetadataType(value: MetadataValue): MetadataType {
  if (typeof value === 'boolean') {
    return 'boolean'
  }

  if (typeof value === 'number') {
    return 'number'
  }

  return 'string'
}

function getInputValue(value: MetadataValue): string {
  return String(value)
}

function parseMetadataValue(
  type: MetadataType,
  input: string,
): ParsedMetadataValue {
  if (type === 'number') {
    const numberValue = Number(input)

    if (input.trim() === '' || !Number.isFinite(numberValue)) {
      return { error: 'metadataNumberInvalid' }
    }

    return { value: numberValue }
  }

  if (type === 'boolean') {
    return { value: input === 'true' }
  }

  return { value: input }
}

function getFieldId(prefix: string, key: string): string {
  return `${prefix}-${key.replace(/[^a-zA-Z0-9_-]/g, '-')}`
}

function MetadataEntryRow({
  metadataKey,
  value,
  existingKeys,
  disabled = false,
  onUpdate,
  onRemove,
}: MetadataEntryRowProps) {
  const { t } = useTranslation()
  const [key, setKey] = useState(metadataKey)
  const [type, setType] = useState<MetadataType>(() => getMetadataType(value))
  const [rawValue, setRawValue] = useState(() => getInputValue(value))
  const [error, setError] = useState<MetadataValidationError | undefined>()
  const keyId = getFieldId('metadata-key', metadataKey)
  const valueId = getFieldId('metadata-value', metadataKey)
  const errorId = getFieldId('metadata-error', metadataKey)

  function handleSave(): void {
    const normalizedKey = key.trim()

    if (normalizedKey === '') {
      setError('metadataKeyRequired')
      return
    }

    if (normalizedKey !== metadataKey && existingKeys.includes(normalizedKey)) {
      setError('metadataDuplicateKey')
      return
    }

    const parsed = parseMetadataValue(type, rawValue)
    if (parsed.error !== undefined || parsed.value === undefined) {
      setError(parsed.error ?? 'metadataNumberInvalid')
      return
    }

    onUpdate?.(metadataKey, normalizedKey, parsed.value)
    setKey(normalizedKey)
    setError(undefined)
  }

  function handleTypeChange(nextType: MetadataType): void {
    setType(nextType)
    if (nextType === 'boolean' && !['true', 'false'].includes(rawValue)) {
      setRawValue('false')
    }
    setError(undefined)
  }

  return (
    <tr>
      <td colSpan={4} className="rounded-md border bg-background/60 p-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <label className="sr-only" htmlFor={keyId}>
            {t('metadataKey')}: {metadataKey}
          </label>
          <input
            id={keyId}
            type="text"
            value={key}
            disabled={disabled}
            onChange={(event) => {
              setKey(event.currentTarget.value)
              setError(undefined)
            }}
            aria-invalid={
              error === 'metadataKeyRequired' ||
              error === 'metadataDuplicateKey'
            }
            aria-describedby={error === undefined ? undefined : errorId}
            className="h-8 w-full min-w-0 rounded-md border border-input bg-background px-2 text-xs shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
          />
          <div className="flex shrink-0 gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 p-1"
              aria-label={`${t('saveMetadata')}: ${metadataKey}`}
              title={t('saveMetadata')}
              disabled={disabled}
              onClick={handleSave}
            >
              <Check aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 p-1"
              aria-label={`${t('removeMetadata')}: ${metadataKey}`}
              title={t('removeMetadata')}
              disabled={disabled}
              onClick={() => onRemove?.(metadataKey)}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          </div>
        </div>
        <div className="mt-2 grid min-w-0 grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] gap-2">
          <div className="min-w-0">
            <label
              className="mb-1 block text-[10px] font-medium text-muted-foreground"
              htmlFor={`${keyId}-type`}
            >
              {t('metadataType')}
            </label>
            <select
              id={`${keyId}-type`}
              value={type}
              disabled={disabled}
              onChange={(event) =>
                handleTypeChange(event.currentTarget.value as MetadataType)
              }
              className="h-8 w-full min-w-0 rounded-md border border-input bg-background px-1 text-xs shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="string">{t('metadataTypeString')}</option>
              <option value="number">{t('metadataTypeNumber')}</option>
              <option value="boolean">{t('metadataTypeBoolean')}</option>
            </select>
          </div>
          <div className="min-w-0">
            <label
              className="mb-1 block text-[10px] font-medium text-muted-foreground"
              htmlFor={valueId}
            >
              {t('metadataValue')}
            </label>
            {type === 'boolean' ? (
              <select
                id={valueId}
                value={rawValue}
                disabled={disabled}
                aria-describedby={error === undefined ? undefined : errorId}
                onChange={(event) => {
                  setRawValue(event.currentTarget.value)
                  setError(undefined)
                }}
                className="h-8 w-full min-w-0 rounded-md border border-input bg-background px-1 text-xs shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="true">{t('trueValue')}</option>
                <option value="false">{t('falseValue')}</option>
              </select>
            ) : (
              <input
                id={valueId}
                type={type === 'number' ? 'number' : 'text'}
                step={type === 'number' ? 'any' : undefined}
                value={rawValue}
                disabled={disabled}
                onChange={(event) => {
                  setRawValue(event.currentTarget.value)
                  setError(undefined)
                }}
                aria-invalid={error === 'metadataNumberInvalid'}
                aria-describedby={error === undefined ? undefined : errorId}
                className="h-8 w-full min-w-0 rounded-md border border-input bg-background px-2 text-xs shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
              />
            )}
          </div>
        </div>
        {error !== undefined ? (
          <p
            id={errorId}
            role="alert"
            className="mt-1 text-[11px] text-destructive"
          >
            {t(error)}
          </p>
        ) : null}
      </td>
    </tr>
  )
}

interface MetadataAddFormProps {
  existingKeys: string[]
  disabled?: boolean
  onAdd?: MetadataEditorProps['onAdd']
}

function MetadataAddForm({
  existingKeys,
  disabled = false,
  onAdd,
}: MetadataAddFormProps) {
  const { t } = useTranslation()
  const [key, setKey] = useState('')
  const [type, setType] = useState<MetadataType>('string')
  const [rawValue, setRawValue] = useState('')
  const [error, setError] = useState<MetadataValidationError | undefined>()

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    const normalizedKey = key.trim()

    if (normalizedKey === '') {
      setError('metadataKeyRequired')
      return
    }

    if (existingKeys.includes(normalizedKey)) {
      setError('metadataDuplicateKey')
      return
    }

    const parsed = parseMetadataValue(type, rawValue)
    if (parsed.error !== undefined || parsed.value === undefined) {
      setError(parsed.error ?? 'metadataNumberInvalid')
      return
    }

    onAdd?.(normalizedKey, parsed.value)
    setKey('')
    setRawValue('')
    setError(undefined)
  }

  return (
    <form className="mt-3 space-y-2" onSubmit={handleSubmit} noValidate>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="sr-only" htmlFor="new-metadata-key">
            {t('metadataKey')}
          </label>
          <input
            id="new-metadata-key"
            type="text"
            placeholder={t('metadataKeyPlaceholder')}
            value={key}
            disabled={disabled}
            onChange={(event) => {
              setKey(event.currentTarget.value)
              setError(undefined)
            }}
            aria-invalid={
              error === 'metadataKeyRequired' ||
              error === 'metadataDuplicateKey'
            }
            aria-describedby={
              error === undefined ? undefined : 'new-metadata-error'
            }
            className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>
        <div>
          <label className="sr-only" htmlFor="new-metadata-type">
            {t('metadataType')}
          </label>
          <select
            id="new-metadata-type"
            value={type}
            disabled={disabled}
            onChange={(event) => {
              const nextType = event.currentTarget.value as MetadataType
              setType(nextType)
              if (nextType === 'boolean') {
                setRawValue('false')
              }
              setError(undefined)
            }}
            className="h-8 w-full rounded-md border border-input bg-background px-1 text-xs shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="string">{t('metadataTypeString')}</option>
            <option value="number">{t('metadataTypeNumber')}</option>
            <option value="boolean">{t('metadataTypeBoolean')}</option>
          </select>
        </div>
      </div>
      <div>
        <label className="sr-only" htmlFor="new-metadata-value">
          {t('metadataValue')}
        </label>
        {type === 'boolean' ? (
          <select
            id="new-metadata-value"
            value={rawValue}
            disabled={disabled}
            onChange={(event) => {
              setRawValue(event.currentTarget.value)
              setError(undefined)
            }}
            className="h-8 w-full rounded-md border border-input bg-background px-1 text-xs shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="true">{t('trueValue')}</option>
            <option value="false">{t('falseValue')}</option>
          </select>
        ) : (
          <input
            id="new-metadata-value"
            type={type === 'number' ? 'number' : 'text'}
            step={type === 'number' ? 'any' : undefined}
            placeholder={t('metadataValuePlaceholder')}
            value={rawValue}
            disabled={disabled}
            onChange={(event) => {
              setRawValue(event.currentTarget.value)
              setError(undefined)
            }}
            aria-invalid={error === 'metadataNumberInvalid'}
            aria-describedby={
              error === undefined ? undefined : 'new-metadata-error'
            }
            className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
          />
        )}
      </div>
      {error !== undefined ? (
        <p
          id="new-metadata-error"
          role="alert"
          className="text-xs text-destructive"
        >
          {t(error)}
        </p>
      ) : null}
      <Button
        type="submit"
        variant="outline"
        size="sm"
        className="w-full"
        disabled={disabled}
      >
        <Plus aria-hidden="true" />
        {t('addMetadata')}
      </Button>
    </form>
  )
}

export function MetadataEditor({
  metadata,
  disabled = false,
  onAdd,
  onUpdate,
  onRemove,
}: MetadataEditorProps) {
  const { t } = useTranslation()
  const entries = Object.entries(metadata)
  const existingKeys = entries.map(([key]) => key)

  return (
    <section aria-labelledby="node-metadata-heading">
      <h3
        id="node-metadata-heading"
        className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"
      >
        {t('metadata')}
      </h3>
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('noMetadata')}</p>
      ) : (
        <div className="overflow-hidden rounded-md border bg-background/60 p-1">
          <table className="w-full table-fixed border-separate border-spacing-y-1 text-left">
            <caption className="sr-only">{t('metadata')}</caption>
            <thead className="sr-only">
              <tr>
                <th scope="col">{t('metadataKey')}</th>
                <th scope="col">{t('metadataType')}</th>
                <th scope="col">{t('metadataValue')}</th>
                <th scope="col">{t('metadataActions')}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(([key, value]) => (
                <MetadataEntryRow
                  key={key}
                  metadataKey={key}
                  value={value}
                  existingKeys={existingKeys}
                  disabled={disabled}
                  onUpdate={onUpdate}
                  onRemove={onRemove}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
      <MetadataAddForm
        existingKeys={existingKeys}
        disabled={disabled}
        onAdd={onAdd}
      />
    </section>
  )
}
