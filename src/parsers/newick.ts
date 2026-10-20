import type { MetadataValue, PhyloTree, TreeNodeData } from '../domain/types'
import { newId } from '../lib/id'
import { ParseError } from './parseError'

export { ParseError }

export interface NewickSyntaxNode {
  label: string
  branchLength: number | null
  children: NewickSyntaxNode[]
  /** Comment contents without the surrounding square brackets. */
  comments: string[]
}

interface ParsedNewickSyntaxNode extends NewickSyntaxNode {
  children: ParsedNewickSyntaxNode[]
  commentPositions: number[]
  branchLengthPosition: number | null
}

const BRANCH_LENGTH_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/

class NewickParser {
  private offset = 0
  private readonly source: string

  constructor(source: string) {
    this.source = source
  }

  parse(): ParsedNewickSyntaxNode {
    const root = this.parseSubtree()

    this.skipWhitespace()
    if (this.peek() === ';') {
      this.offset += 1
    }

    const trailingComments: string[] = []
    const trailingCommentPositions: number[] = []
    this.consumeTrivia(trailingComments, trailingCommentPositions)
    root.comments.push(...trailingComments)
    root.commentPositions.push(...trailingCommentPositions)

    if (this.offset !== this.source.length) {
      this.fail('Unexpected content after the Newick tree')
    }

    return root
  }

  private parseSubtree(): ParsedNewickSyntaxNode {
    const comments: string[] = []
    const commentPositions: number[] = []
    this.consumeTrivia(comments, commentPositions)

    const children: ParsedNewickSyntaxNode[] = []
    const isInternalNode = this.peek() === '('

    if (isInternalNode) {
      this.offset += 1
      this.skipWhitespace()

      if (this.peek() === ')') {
        this.fail('Expected at least one child inside parentheses')
      }

      children.push(this.parseSubtree())

      while (true) {
        this.skipWhitespace()

        if (this.peek() === ',') {
          this.offset += 1
          children.push(this.parseSubtree())
          continue
        }

        if (this.peek() === ')') {
          this.offset += 1
          break
        }

        if (this.peek() === undefined) {
          this.fail('Expected ")" to close this subtree')
        }

        this.fail('Expected "," or ")" after a child subtree')
      }
    }

    this.consumeTrivia(comments, commentPositions)

    let label = ''
    let hasLabel = false

    if (this.peek() === "'") {
      label = this.readQuotedLabel()
      hasLabel = true
    } else if (this.canStartUnquotedLabel()) {
      label = this.readUnquotedLabel()
      hasLabel = true
    }

    if (!isInternalNode && !hasLabel) {
      this.fail('Expected a label for the leaf node')
    }

    this.consumeTrivia(comments, commentPositions)

    let branchLength: number | null = null
    let branchLengthPosition: number | null = null

    if (this.peek() === ':') {
      this.offset += 1
      this.consumeTrivia(comments, commentPositions)
      branchLengthPosition = this.offset
      branchLength = this.readBranchLength()
      this.consumeTrivia(comments, commentPositions)
    }

    return {
      label,
      branchLength,
      children,
      comments,
      commentPositions,
      branchLengthPosition,
    }
  }

  private readQuotedLabel(): string {
    const openingPosition = this.offset
    this.offset += 1
    const characters: string[] = []

    while (this.offset < this.source.length) {
      const character = this.source[this.offset]

      if (character === "'") {
        if (this.source[this.offset + 1] === "'") {
          characters.push("'")
          this.offset += 2
          continue
        }

        this.offset += 1
        return characters.join('')
      }

      if (character !== undefined) {
        characters.push(character)
      }
      this.offset += 1
    }

    throw new ParseError('Unterminated quoted label', openingPosition)
  }

  private readUnquotedLabel(): string {
    const start = this.offset

    while (this.canStartUnquotedLabel()) {
      this.offset += 1
    }

    return this.source.slice(start, this.offset)
  }

  private readBranchLength(): number {
    const start = this.offset

    while (this.offset < this.source.length) {
      const character = this.source[this.offset]

      if (
        character === undefined ||
        /\s/u.test(character) ||
        ',);['.includes(character)
      ) {
        break
      }

      this.offset += 1
    }

    const rawLength = this.source.slice(start, this.offset)

    if (rawLength === '') {
      this.fail('Expected a branch length after ":"', start)
    }

    if (!BRANCH_LENGTH_PATTERN.test(rawLength)) {
      this.fail(`Invalid branch length "${rawLength}"`, start)
    }

    const branchLength = Number(rawLength)

    if (!Number.isFinite(branchLength)) {
      this.fail(`Branch length "${rawLength}" must be finite`, start)
    }

    if (branchLength < 0) {
      this.fail('Branch length cannot be negative', start)
    }

    return branchLength
  }

  private consumeTrivia(comments: string[], commentPositions: number[]): void {
    while (true) {
      this.skipWhitespace()

      if (this.peek() !== '[') {
        return
      }

      commentPositions.push(this.offset)
      comments.push(this.readComment())
    }
  }

  private readComment(): string {
    const openingPosition = this.offset
    this.offset += 1
    const contentStart = this.offset
    let depth = 1

    while (this.offset < this.source.length) {
      const character = this.source[this.offset]

      if (character === '[') {
        depth += 1
      } else if (character === ']') {
        depth -= 1

        if (depth === 0) {
          const comment = this.source.slice(contentStart, this.offset)
          this.offset += 1
          return comment
        }
      }

      this.offset += 1
    }

    throw new ParseError('Unterminated bracket comment', openingPosition)
  }

  private canStartUnquotedLabel(): boolean {
    const character = this.peek()

    return (
      character !== undefined &&
      !/\s/u.test(character) &&
      !"(),:;[]'".includes(character)
    )
  }

  private skipWhitespace(): void {
    while (this.offset < this.source.length) {
      const character = this.source[this.offset]

      if (character === undefined || !/\s/u.test(character)) {
        return
      }

      this.offset += 1
    }
  }

  private peek(): string | undefined {
    return this.source[this.offset]
  }

  private fail(message: string, position = this.offset): never {
    throw new ParseError(message, position)
  }
}

/** Parse Newick syntax while retaining bracket comments on their nodes. */
export function parseNewickSyntax(text: string): NewickSyntaxNode {
  return new NewickParser(text).parse()
}

/**
 * Parse a Newick tree, allowing a format layer to interpret comments as metadata.
 */
export function parseWithNodeMetadata(
  text: string,
  metadataFromComments: (
    comments: readonly string[],
    commentPositions: readonly number[],
  ) => Record<string, MetadataValue>,
): PhyloTree {
  const root = new NewickParser(text).parse()

  if (root.branchLength !== null) {
    throw new ParseError(
      'A root branch length cannot be represented in the tree model',
      root.branchLengthPosition ?? 0,
    )
  }

  const nodes: Record<string, TreeNodeData> = {}

  function addNode(
    parsedNode: ParsedNewickSyntaxNode,
    parentId: string | null,
  ): string {
    const id = newId()
    const childIds = parsedNode.children.map((child) => addNode(child, id))

    nodes[id] = {
      id,
      parentId,
      childIds,
      label: parsedNode.label,
      branchLength: parentId === null ? null : parsedNode.branchLength,
      metadata: metadataFromComments(
        parsedNode.comments,
        parsedNode.commentPositions,
      ),
    }

    return id
  }

  const rootId = addNode(root, null)

  return { rootId, nodes }
}

/** Parse a Newick tree into the application's normalized tree model. */
export function parse(text: string): PhyloTree {
  return parseWithNodeMetadata(text, () => ({}))
}

function serializeLabel(label: string): string {
  const needsQuotes =
    label === '' ||
    /[\s(),:;']/u.test(label) ||
    label.includes('[') ||
    label.includes(']')

  if (!needsQuotes) {
    return label
  }

  return `'${label.replace(/'/g, "''")}'`
}

function serializeSubtree(
  tree: PhyloTree,
  nodeId: string,
  commentForNode: (node: TreeNodeData) => string,
): string {
  const node = tree.nodes[nodeId]

  if (node === undefined) {
    throw new Error(`Node "${nodeId}" does not exist.`)
  }

  if (nodeId === tree.rootId && node.branchLength !== null) {
    throw new Error('The root node cannot have a branch length.')
  }

  const children = node.childIds.map((childId) =>
    serializeSubtree(tree, childId, commentForNode),
  )
  const childGroup = children.length > 0 ? `(${children.join(',')})` : ''
  const branchLength =
    nodeId !== tree.rootId && node.branchLength !== null
      ? `:${node.branchLength}`
      : ''

  return `${childGroup}${serializeLabel(node.label)}${branchLength}${commentForNode(node)}`
}

/** Serialize a normalized tree with optional comments appended to each node. */
export function serializeWithNodeComments(
  tree: PhyloTree,
  commentForNode: (node: TreeNodeData) => string,
): string {
  return `${serializeSubtree(tree, tree.rootId, commentForNode)};`
}

/** Serialize a normalized tree as a Newick string with a terminal semicolon. */
export function serialize(tree: PhyloTree): string {
  return serializeWithNodeComments(tree, () => '')
}
