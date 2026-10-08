import type { PhyloTree, TreeNodeData } from '../domain/types'
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
    this.consumeTrivia(trailingComments)
    root.comments.push(...trailingComments)

    if (this.offset !== this.source.length) {
      this.fail('Unexpected content after the Newick tree')
    }

    return root
  }

  private parseSubtree(): ParsedNewickSyntaxNode {
    const comments: string[] = []
    this.consumeTrivia(comments)

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

    this.consumeTrivia(comments)

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

    this.consumeTrivia(comments)

    let branchLength: number | null = null
    let branchLengthPosition: number | null = null

    if (this.peek() === ':') {
      this.offset += 1
      this.consumeTrivia(comments)
      branchLengthPosition = this.offset
      branchLength = this.readBranchLength()
      this.consumeTrivia(comments)
    }

    return {
      label,
      branchLength,
      children,
      comments,
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

  private consumeTrivia(comments: string[]): void {
    while (true) {
      this.skipWhitespace()

      if (this.peek() !== '[') {
        return
      }

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

/** Parse a Newick tree into the application's normalized tree model. */
export function parse(text: string): PhyloTree {
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
    const id = globalThis.crypto.randomUUID()
    const childIds = parsedNode.children.map((child) => addNode(child, id))

    nodes[id] = {
      id,
      parentId,
      childIds,
      label: parsedNode.label,
      branchLength: parentId === null ? null : parsedNode.branchLength,
      metadata: {},
    }

    return id
  }

  const rootId = addNode(root, null)

  return { rootId, nodes }
}
