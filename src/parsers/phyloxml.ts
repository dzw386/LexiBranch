import { XMLParser, XMLValidator } from 'fast-xml-parser'
import type { MetadataValue, PhyloTree, TreeNodeData } from '../domain/types'
import { ParseError } from './parseError'

export { ParseError }

type XmlRecord = Record<string, unknown>

const XML_PARSER_OPTIONS = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  parseTagValue: false,
  trimValues: true,
  removeNSPrefix: true,
}

const XML_NUMBER_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/u
const NUMERIC_DATATYPES = new Set([
  'byte',
  'decimal',
  'double',
  'float',
  'int',
  'integer',
  'long',
  'negativeinteger',
  'nonnegativeinteger',
  'nonpositiveinteger',
  'positiveinteger',
  'short',
  'unsignedbyte',
  'unsignedint',
  'unsignedlong',
  'unsignedshort',
])

function positionFromLineColumn(
  source: string,
  targetLine: number,
  targetColumn: number,
): number {
  let line = 1
  let offset = 0

  while (line < targetLine && offset < source.length) {
    const character = source[offset]

    if (character === '\r' || character === '\n') {
      offset += 1
      if (character === '\r' && source[offset] === '\n') {
        offset += 1
      }
      line += 1
    } else {
      offset += 1
    }
  }

  return Math.min(offset + Math.max(targetColumn - 1, 0), source.length)
}

function isRecord(value: unknown): value is XmlRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requireRecord(value: unknown, message: string): XmlRecord {
  if (!isRecord(value)) {
    throw new ParseError(message, 0)
  }

  return value
}

function asArray(value: unknown): unknown[] {
  if (value === undefined) {
    return []
  }

  return Array.isArray(value) ? value : [value]
}

function readText(value: unknown): string | null {
  if (typeof value === 'string') {
    return value.trim()
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  if (isRecord(value)) {
    const text = value['#text']

    if (typeof text === 'string') {
      return text.trim()
    }

    if (typeof text === 'number' || typeof text === 'boolean') {
      return String(text)
    }
  }

  return null
}

function parseBranchLength(
  clade: XmlRecord,
  parentId: string | null,
): number | null {
  const branchLengths = asArray(clade.branch_length)

  if (branchLengths.length === 0) {
    return null
  }

  if (branchLengths.length > 1) {
    throw new ParseError('A clade can only have one branch length', 0)
  }

  const rawLength = readText(branchLengths[0])
  if (rawLength === null || !XML_NUMBER_PATTERN.test(rawLength)) {
    throw new ParseError('Invalid phyloXML branch length', 0)
  }

  const branchLength = Number(rawLength)
  if (!Number.isFinite(branchLength) || branchLength < 0) {
    throw new ParseError('Branch length must be finite and non-negative', 0)
  }

  if (parentId === null) {
    throw new ParseError('A root clade cannot have a branch length', 0)
  }

  return branchLength
}

function parseMetadataValue(
  rawValue: string,
  datatype: string | undefined,
): MetadataValue {
  const datatypeName = datatype?.split(/[#:]/u).at(-1)?.toLowerCase()

  if (datatypeName === 'boolean') {
    if (rawValue === 'true' || rawValue === '1') {
      return true
    }

    if (rawValue === 'false' || rawValue === '0') {
      return false
    }

    throw new ParseError(`Invalid phyloXML boolean value "${rawValue}"`, 0)
  }

  if (datatypeName !== undefined && NUMERIC_DATATYPES.has(datatypeName)) {
    if (!XML_NUMBER_PATTERN.test(rawValue)) {
      throw new ParseError(`Invalid phyloXML numeric value "${rawValue}"`, 0)
    }

    const numberValue = Number(rawValue)
    if (!Number.isFinite(numberValue)) {
      throw new ParseError(`Invalid phyloXML numeric value "${rawValue}"`, 0)
    }

    return numberValue
  }

  return rawValue
}

function parseMetadata(clade: XmlRecord): Record<string, MetadataValue> {
  const metadata = new Map<string, MetadataValue>()

  for (const value of asArray(clade.property)) {
    const property = requireRecord(value, 'Invalid phyloXML property')
    const reference = property['@_ref']

    if (typeof reference !== 'string' || reference.trim() === '') {
      throw new ParseError('A phyloXML property must have a non-empty ref', 0)
    }

    const rawValue = readText(property) ?? ''
    const datatype = property['@_datatype']
    metadata.set(
      reference,
      parseMetadataValue(
        rawValue,
        typeof datatype === 'string' ? datatype : undefined,
      ),
    )
  }

  return Object.fromEntries(metadata)
}

/** Parse a phyloXML document into the application's normalized tree model. */
export function parse(text: string): PhyloTree {
  const validation = XMLValidator.validate(text)
  if (validation !== true) {
    const { msg, line, col } = validation.err
    throw new ParseError(
      `Invalid phyloXML: ${msg}`,
      positionFromLineColumn(text, line, col),
    )
  }

  let parsed: unknown
  try {
    parsed = new XMLParser(XML_PARSER_OPTIONS).parse(text)
  } catch (error) {
    const message = error instanceof Error ? `: ${error.message}` : ''
    throw new ParseError(`Unable to parse phyloXML${message}`, 0)
  }

  const document = requireRecord(parsed, 'Expected a phyloXML document')
  const phyloxml = requireRecord(
    document.phyloxml,
    'Missing <phyloxml> root element',
  )
  const phylogenies = asArray(phyloxml.phylogeny)

  if (phylogenies.length !== 1) {
    throw new ParseError('Expected exactly one <phylogeny> element', 0)
  }

  const phylogeny = requireRecord(phylogenies[0], 'Invalid <phylogeny> element')
  const rootClades = asArray(phylogeny.clade)

  if (rootClades.length !== 1) {
    throw new ParseError('Expected exactly one root <clade> element', 0)
  }

  const nodes: Record<string, TreeNodeData> = {}

  function addClade(value: unknown, parentId: string | null): string {
    const clade = requireRecord(value, 'Invalid <clade> element')
    const id = globalThis.crypto.randomUUID()
    const childIds = asArray(clade.clade).map((child) => addClade(child, id))

    nodes[id] = {
      id,
      parentId,
      childIds,
      label: asArray(clade.name).map(readText)[0] ?? '',
      branchLength: parseBranchLength(clade, parentId),
      metadata: parseMetadata(clade),
    }

    return id
  }

  const rootId = addClade(rootClades[0], null)

  return { rootId, nodes }
}
