import { describe, expect, it } from 'vitest'
import { formatBranchLength, MAX_BRANCH_LENGTH } from './branchLength'

describe('formatBranchLength', () => {
  it('limits precision to three decimals and trims zeros', () => {
    expect(formatBranchLength(0)).toBe('0')
    expect(formatBranchLength(1.5)).toBe('1.5')
    expect(formatBranchLength(0.8)).toBe('0.8')
    expect(formatBranchLength(2)).toBe('2')
    expect(formatBranchLength(0.1111111111111111)).toBe('0.111')
    expect(formatBranchLength(123.456789)).toBe('123.457')
  })

  it('keeps tiny values readable instead of rounding them to zero', () => {
    expect(formatBranchLength(0.001)).toBe('0.001')
    expect(formatBranchLength(0.0004)).toBe('0.0004')
    expect(formatBranchLength(0.000456)).toBe('0.00046')
  })

  it('switches to exponential notation for huge values', () => {
    expect(formatBranchLength(MAX_BRANCH_LENGTH)).toBe('1.00e+6')
    expect(formatBranchLength(999999999999999900000)).toBe('1.00e+21')
  })
})
