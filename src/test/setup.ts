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
