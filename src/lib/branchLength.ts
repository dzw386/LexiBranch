export const MAX_BRANCH_LENGTH = 1_000_000

function trimTrailingZeros(value: string): string {
  return value.includes('.') ? value.replace(/\.?0+$/, '') : value
}

export function formatBranchLength(value: number): string {
  const magnitude = Math.abs(value)

  if (magnitude >= MAX_BRANCH_LENGTH) {
    return value.toExponential(2)
  }

  if (magnitude !== 0 && magnitude < 0.001) {
    return trimTrailingZeros(value.toPrecision(2))
  }

  return trimTrailingZeros(value.toFixed(3))
}
