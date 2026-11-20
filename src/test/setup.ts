import { afterEach } from 'vitest'

class ResizeObserverMock {
  callback: ResizeObserverCallback

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
  }

  observe(target: Element): void {
    this.callback(
      [
        {
          target,
          contentRect: target.getBoundingClientRect(),
        } as ResizeObserverEntry,
      ],
      this as unknown as ResizeObserver,
    )
  }

  unobserve(): void {}

  disconnect(): void {}
}

const storageItems = new Map<string, string>()
const localStorageMock: Storage = {
  get length() {
    return storageItems.size
  },
  clear: () => storageItems.clear(),
  getItem: (key) => storageItems.get(key) ?? null,
  key: (index) => [...storageItems.keys()][index] ?? null,
  removeItem: (key) => {
    storageItems.delete(key)
  },
  setItem: (key, value) => {
    storageItems.set(key, String(value))
  },
}

Object.defineProperty(window, 'localStorage', {
  configurable: true,
  value: localStorageMock,
})

afterEach(() => {
  localStorageMock.clear()
})

class DOMMatrixReadOnlyMock {
  m22: number

  constructor(transform?: string) {
    const scale = transform?.match(/scale\(([0-9.]+)\)/)?.[1]
    this.m22 = scale !== undefined ? Number(scale) : 1
  }
}

globalThis.DOMMatrixReadOnly =
  DOMMatrixReadOnlyMock as unknown as typeof DOMMatrixReadOnly

globalThis.ResizeObserver =
  ResizeObserverMock as unknown as typeof ResizeObserver

const canvasContext = {
  font: '',
  fillStyle: '',
  fillRect: () => {},
  drawImage: () => {},
  measureText: (text: string) => ({ width: text.length * 7 }),
}

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  configurable: true,
  value: () => canvasContext,
})
