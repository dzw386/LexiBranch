import { afterEach, describe, expect, it, vi } from 'vitest'
import { newId } from './id'

const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('newId', () => {
  it('returns a v4 UUID on the crypto.randomUUID fast path', () => {
    expect(newId()).toMatch(UUID_V4_PATTERN)
  })

  it('prefers crypto.randomUUID when it is available', () => {
    const randomUUID = vi.fn(() => '11111111-1111-4111-8111-111111111111')
    vi.stubGlobal('crypto', {
      getRandomValues: vi.fn(),
      randomUUID,
    })

    expect(newId()).toBe('11111111-1111-4111-8111-111111111111')
    expect(randomUUID).toHaveBeenCalledOnce()
  })

  it('falls back to crypto.getRandomValues when randomUUID is unavailable', () => {
    vi.stubGlobal('crypto', {
      getRandomValues: (array: Uint8Array) => array.fill(0),
    })

    expect(newId()).toBe('00000000-0000-4000-8000-000000000000')
  })

  it('sets the v4 version and variant bits in the fallback', () => {
    vi.stubGlobal('crypto', {
      getRandomValues: (array: Uint8Array) => array.fill(0xff),
    })

    expect(newId()).toBe('ffffffff-ffff-4fff-bfff-ffffffffffff')
  })

  it('produces unique ids in the fallback path', () => {
    const getRandomValues = globalThis.crypto.getRandomValues.bind(
      globalThis.crypto,
    )
    vi.stubGlobal('crypto', { getRandomValues })

    const ids = new Set(Array.from({ length: 1000 }, () => newId()))
    expect(ids.size).toBe(1000)
    for (const id of ids) {
      expect(id).toMatch(UUID_V4_PATTERN)
    }
  })
})
