import { XMLParser, XMLValidator } from 'fast-xml-parser'
import type { MetadataValue, PhyloTree, TreeNodeData } from '../domain/types'
import { newId } from '../lib/id'
import { ParseError } from './parseError'

export { ParseError }

type XmlRecord = Record<string, unknown>

const XML_PARSER_OPTIONS = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  parseTagValue: false,
  trimValues: false,
  removeNSPrefix: true,
}

const PHYLOXML_NAMESPACE = 'http://www.phyloxml.org'
const XML_SCHEMA_NAMESPACE = 'http://www.w3.org/2001/XMLSchema'
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
    return value
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  if (isRecord(value)) {
    const text = value['#text']

    if (typeof text === 'string') {
      return text
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

  const rawLength = readText(branchLengths[0])?.trim() ?? null
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
  const datatypeName = datatype?.trim().split(/[#:]/u).at(-1)?.toLowerCase()
  const normalizedValue = rawValue.trim()

  if (datatypeName === 'boolean') {
    if (normalizedValue === 'true' || normalizedValue === '1') {
      return true
    }

    if (normalizedValue === 'false' || normalizedValue === '0') {
      return false
    }

    throw new ParseError(`Invalid phyloXML boolean value "${rawValue}"`, 0)
  }

  if (datatypeName !== undefined && NUMERIC_DATATYPES.has(datatypeName)) {
    if (!XML_NUMBER_PATTERN.test(normalizedValue)) {
      throw new ParseError(`Invalid phyloXML numeric value "${rawValue}"`, 0)
    }

    const numberValue = Number(normalizedValue)
    if (!Number.isFinite(numberValue)) {
      throw new ParseError(`Invalid phyloXML numeric value "${rawValue}"`, 0)
    }

    return numberValue
  }

  return rawValue
}

function isValidXmlCodePoint(codePoint: number): boolean {
  return (
    codePoint === 0x9 ||
    codePoint === 0xa ||
    codePoint === 0xd ||
    (codePoint >= 0x20 && codePoint <= 0xd7ff) ||
    (codePoint >= 0xe000 && codePoint <= 0xfffd) ||
    (codePoint >= 0x10000 && codePoint <= 0x10ffff)
  )
}

function escapeXml(value: string, context: 'text' | 'attribute'): string {
  let escaped = ''

  for (const character of value) {
    const codePoint = character.codePointAt(0)

    if (codePoint === undefined || !isValidXmlCodePoint(codePoint)) {
      throw new Error(
        'phyloXML values cannot contain characters forbidden by XML 1.0.',
      )
    }

    switch (character) {
      case '&':
        escaped += '&amp;'
        break
      case '<':
        escaped += '&lt;'
        break
      case '>':
        escaped += '&gt;'
        break
      case '"':
        escaped += '&quot;'
        break
      case "'":
        escaped += '&apos;'
        break
      case '\n':
        escaped += context === 'attribute' ? '&#10;' : character
        break
      case '\r':
        escaped += '&#13;'
        break
      case '\t':
        escaped += context === 'attribute' ? '&#9;' : character
        break
      default:
        escaped += character
    }
  }

  return escaped
}

function serializeNumber(value: number): string {
  if (!Number.isFinite(value)) {
    throw new Error('phyloXML cannot serialize non-finite numbers.')
  }

  return Object.is(value, -0) ? '-0' : String(value)
}

function serializeMetadata(
  metadata: Record<string, MetadataValue>,
  indentation: string,
): string[] {
  return Object.entries(metadata).map(([reference, value]) => {
    if (reference.trim() === '') {
      throw new Error('phyloXML property refs must be non-empty.')
    }

    let datatype: string
    let textValue: string

    if (typeof value === 'string') {
      datatype = 'string'
      textValue = value
    } else if (typeof value === 'boolean') {
      datatype = 'boolean'
      textValue = String(value)
    } else {
      datatype = 'double'
      textValue = serializeNumber(value)
    }

    return `${indentation}<property ref="${escapeXml(reference, 'attribute')}" datatype="xsd:${datatype}">${escapeXml(textValue, 'text')}</property>`
  })
}

function serializeClade(
  tree: PhyloTree,
  nodeId: string,
  depth: number,
): string {
  const node = tree.nodes[nodeId]

  if (node === undefined) {
    throw new Error(`Node "${nodeId}" does not exist.`)
  }

  if (nodeId === tree.rootId && node.branchLength !== null) {
    throw new Error('The root node cannot have a branch length.')
  }

  const indentation = '  '.repeat(depth)
  const childIndentation = `${indentation}  `
  const lines = [
    `${indentation}<clade>`,
    `${childIndentation}<name>${escapeXml(node.label, 'text')}</name>`,
  ]

  if (nodeId !== tree.rootId && node.branchLength !== null) {
    if (node.branchLength < 0) {
      throw new Error('Branch lengths must be non-negative.')
    }

    lines.push(
      `${childIndentation}<branch_length>${serializeNumber(node.branchLength)}</branch_length>`,
    )
  }

  lines.push(...serializeMetadata(node.metadata, childIndentation))

  for (const childId of node.childIds) {
    lines.push(serializeClade(tree, childId, depth + 1))
  }

  lines.push(`${indentation}</clade>`)
  return lines.join('\n')
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
    const id = newId()
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

/** Serialize a normalized tree as a phyloXML document. */
export function serialize(tree: PhyloTree): string {
  const root = tree.nodes[tree.rootId]

  if (root === undefined) {
    throw new Error(`Root node "${tree.rootId}" does not exist.`)
  }

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<phyloxml xmlns="${PHYLOXML_NAMESPACE}" xmlns:xsd="${XML_SCHEMA_NAMESPACE}">`,
    '  <phylogeny rooted="true">',
    serializeClade(tree, tree.rootId, 2),
    '  </phylogeny>',
    '</phyloxml>',
  ].join('\n')
}
