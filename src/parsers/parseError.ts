/** A parser error with a zero-based offset into the source text. */
export class ParseError extends Error {
  readonly position: number

  constructor(message: string, position: number) {
    super(`${message} (at position ${position})`)
    this.name = 'ParseError'
    this.position = position
  }
}
