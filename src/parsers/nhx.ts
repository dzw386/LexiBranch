import type { MetadataValue, PhyloTree } from '../domain/types'
import {
  ParseError,
  parseWithNodeMetadata,
  serializeWithNodeComments,
} from './newick'

export { ParseError }

const NHX_COMMENT_PREFIX = '&&NHX:'
// Keep scalar-looking strings distinguishable from typed metadata values.
const NHX_STRING_PREFIX = '~s~'
const NHX_NUMBER_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/u
const NHX_ESCAPED_CHARACTERS: Record<string, string> = {
  '%': '%25',
  ':': '%3A',
  '=': '%3D',
  '[': '%5B',
  ']': '%5D',
}
const NHX_DECODED_CHARACTERS: Record<string, string> = {
  '%25': '%',
  '%3A': ':',
  '%3D': '=',
  '%5B': '[',
  '%5D': ']',
}

function decodeFieldPart(value: string): string {
  return value.replace(
    /%(25|3A|3D|5B|5D)/giu,
    (escape) => NHX_DECODED_CHARACTERS[escape.toUpperCase()] ?? escape,
  )
}

function encodeFieldPart(value: string): string {
  return value.replace(
    /[%:=\x5B\x5D]/gu,
    (character) => NHX_ESCAPED_CHARACTERS[character] ?? character,
  )
}

function parseMetadataValue(value: string): MetadataValue {
  if (value.startsWith(NHX_STRING_PREFIX)) {
    return decodeFieldPart(value.slice(NHX_STRING_PREFIX.length))
  }

  const decodedValue = decodeFieldPart(value)

  if (decodedValue === 'true') {
    return true
  }
  if (decodedValue === 'false') {
    return false
  }

  if (NHX_NUMBER_PATTERN.test(decodedValue)) {
    const numberValue = Number(decodedValue)
    if (Number.isFinite(numberValue) && String(numberValue) === decodedValue) {
      return numberValue
    }
  }

  return decodedValue
}

function serializeMetadataValue(value: MetadataValue): string {
  if (typeof value !== 'string') {
    return String(value)
  }

  const inferredValue = parseMetadataValue(value)
  const needsStringPrefix =
    typeof inferredValue !== 'string' || value.startsWith(NHX_STRING_PREFIX)
  const encodedValue = encodeFieldPart(value)

  return needsStringPrefix
    ? `${NHX_STRING_PREFIX}${encodedValue}`
    : encodedValue
}

function parseMetadata(
  comments: readonly string[],
  commentPositions: readonly number[],
): Record<string, MetadataValue> {
  const metadata = new Map<string, MetadataValue>()

  comments.forEach((comment, commentIndex) => {
    if (!comment.startsWith(NHX_COMMENT_PREFIX)) {
      return
    }

    const fieldsText = comment.slice(NHX_COMMENT_PREFIX.length)
    if (fieldsText === '') {
      return
    }

    let fieldOffset = NHX_COMMENT_PREFIX.length

    for (const field of fieldsText.split(':')) {
      const separatorIndex = field.indexOf('=')
      const position = (commentPositions[commentIndex] ?? 0) + 1 + fieldOffset

      if (field === '' || separatorIndex <= 0) {
        throw new ParseError(`Invalid NHX metadata field "${field}"`, position)
      }

      const key = decodeFieldPart(field.slice(0, separatorIndex))
      if (key === '') {
        throw new ParseError('NHX metadata keys cannot be empty', position)
      }

      const value = parseMetadataValue(field.slice(separatorIndex + 1))
      metadata.set(key, value)
      fieldOffset += field.length + 1
    }
  })

  return Object.fromEntries(metadata)
}

/** Parse NHX comments, inferring scalar types where their text is unambiguous. */
export function parse(text: string): PhyloTree {
  return parseWithNodeMetadata(text, parseMetadata)
}

function serializeMetadata(metadata: Record<string, MetadataValue>): string {
  const fields = Object.entries(metadata).map(
    ([key, value]) =>
      `${encodeFieldPart(key)}=${serializeMetadataValue(value)}`,
  )

  return fields.length === 0 ? '' : `[${NHX_COMMENT_PREFIX}${fields.join(':')}]`
}

/** Serialize a tree with each node's metadata in an NHX comment. */
export function serialize(tree: PhyloTree): string {
  return serializeWithNodeComments(tree, (node) =>
    serializeMetadata(node.metadata),
  )
}
