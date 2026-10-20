function uuidV4FromGetRandomValues(webCrypto: Crypto): string {
  const bytes = new Uint8Array(16)
  webCrypto.getRandomValues(bytes)

  const hex = Array.from(bytes, (byte, index) => {
    const value =
      index === 6
        ? (byte & 0x0f) | 0x40
        : index === 8
          ? (byte & 0x3f) | 0x80
          : byte
    return value.toString(16).padStart(2, '0')
  }).join('')

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export function newId(): string {
  const webCrypto = globalThis.crypto

  if (typeof webCrypto?.randomUUID === 'function') {
    return webCrypto.randomUUID()
  }

  return uuidV4FromGetRandomValues(webCrypto)
}
