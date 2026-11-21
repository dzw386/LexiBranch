import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PhyloFlowEdge, PhyloFlowNode } from '../../layout/layout'
import {
  buildExportTreeSvg,
  exportTreeImage,
  getExportImageSize,
} from './exportImage'

const nodes: PhyloFlowNode[] = [
  {
    id: 'root',
    type: 'phylo',
    position: { x: 0, y: 0 },
    measured: { width: 100, height: 40 },
    data: { label: 'Root', metadata: {} },
  },
  {
    id: 'child',
    type: 'phylo',
    position: { x: 400, y: 200 },
    measured: { width: 100, height: 40 },
    data: { label: 'Child', metadata: { source: 'test' } },
  },
]

const edges: PhyloFlowEdge[] = [
  {
    id: 'root-child',
    type: 'phylo',
    source: 'root',
    target: 'child',
    data: { branchLength: 1.5, branchLabelX: 250 },
  },
]

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('getExportImageSize', () => {
  it('scales the padded node bounds', () => {
    expect(getExportImageSize(nodes)).toEqual({
      width: 1192,
      height: 672,
    })
  })

  it('falls back to default node dimensions and minimum image size', () => {
    expect(
      getExportImageSize([{ id: 'root', position: { x: 0, y: 0 }, data: {} }]),
    ).toEqual({ width: 640, height: 480 })
  })

  it('keeps large trees at an integer scale that fits the pixel cap', () => {
    expect(
      getExportImageSize([
        {
          id: 'root',
          position: { x: 0, y: 0 },
          data: {},
          measured: { width: 5000, height: 5000 },
        },
      ]),
    ).toEqual({ width: 5096, height: 5096 })
  })

  it('falls back to smaller power-of-two scales for oversized trees', () => {
    expect(
      getExportImageSize([
        {
          id: 'root',
          position: { x: 0, y: 0 },
          data: {},
          measured: { width: 9000, height: 100 },
        },
      ]),
    ).toEqual({ width: 9096, height: 480 })

    expect(
      getExportImageSize([
        {
          id: 'root',
          position: { x: 0, y: 0 },
          data: {},
          measured: { width: 20_000, height: 1000 },
        },
      ]),
    ).toEqual({ width: 10048, height: 548 })
  })

  it('grows tall trees instead of shrinking text', () => {
    const size = getExportImageSize([
      {
        id: 'root',
        position: { x: 0, y: 0 },
        data: {},
        measured: { width: 100, height: 40 },
      },
      {
        id: 'tip',
        position: { x: 0, y: 80_000 },
        data: {},
        measured: { width: 100, height: 40 },
      },
    ])

    expect(size.height).toBeGreaterThan(4096)
    expect(size.height).toBeLessThanOrEqual(16384)
  })
})

describe('buildExportTreeSvg', () => {
  it('renders the padded tree as pure SVG', () => {
    const svg = buildExportTreeSvg(nodes, edges, 1192, 672)

    expect(svg).toContain('width="1192" height="672" viewBox="-48 -48 596 336"')
    expect(svg).toContain('d="M 0,20 L 0,220 L 400,220"')
    expect(svg).toContain('>Root</text>')
    expect(svg).toContain('>Child</text>')
    expect(svg).toContain('>1.5</text>')
    expect(svg).toContain('>1</text>')
    expect(svg).toContain(
      '<line x1="250" y1="202" x2="250" y2="220" stroke="#737373" stroke-width="1" stroke-dasharray="2 2" opacity="0.5"/>',
    )
    expect(svg).toContain('fill="#ffffff"')
    expect(svg).toContain('shape-rendering="crispEdges"')
    expect(svg).not.toContain('cursor')
    expect(svg).not.toContain('foreignObject')
  })

  it('renders the dark palette when requested', () => {
    const svg = buildExportTreeSvg(nodes, edges, 1192, 672, 'dark')

    expect(svg).toContain('fill="#0a0a0a"')
    expect(svg).toContain('fill="#171717"')
    expect(svg).toContain('fill="#fafafa"')
    expect(svg).toContain('stroke="#a3a3a3"')
    expect(svg).toContain('flood-opacity="0.6"')
  })

  it('truncates node labels that do not fit their node box', () => {
    const svg = buildExportTreeSvg(
      [
        {
          id: 'root',
          type: 'phylo',
          position: { x: 0, y: 0 },
          measured: { width: 100, height: 40 },
          data: {
            label: 'A very long language name that cannot fit',
            metadata: {},
          },
        },
      ],
      [],
      640,
      480,
    )

    expect(svg).toContain('…')
    expect(svg).not.toContain('that cannot fit')
  })

  it('marks collapsed nodes with a dashed box and hidden-node badge', () => {
    const svg = buildExportTreeSvg(
      [
        {
          id: 'branch',
          type: 'phylo',
          position: { x: 0, y: 0 },
          measured: { width: 140, height: 40 },
          data: {
            label: 'Branch',
            metadata: {},
            collapsed: true,
            hiddenDescendantCount: 3,
            hasChildren: true,
          },
        },
      ],
      [],
      640,
      480,
    )

    expect(svg).toContain('stroke-dasharray="4 3"')
    expect(svg).toContain('>+3</text>')
  })

  it('escapes labels and omits missing branch labels', () => {
    const svg = buildExportTreeSvg(
      [
        {
          id: 'root',
          type: 'phylo',
          position: { x: 0, y: 0 },
          measured: { width: 100, height: 40 },
          data: { label: 'A & B <C>', metadata: {} },
        },
      ],
      [
        {
          id: 'root-child',
          type: 'phylo',
          source: 'root',
          target: 'missing',
          data: { branchLength: 2, branchLabelX: 50 },
        },
      ],
      640,
      480,
    )

    expect(svg).toContain('A &amp; B &lt;C&gt;')
    expect(svg).not.toContain('>2</text>')
    expect(svg).not.toContain('stroke-dasharray')
  })
})

describe('exportTreeImage', () => {
  it('returns a standalone SVG data URL', async () => {
    const result = await exportTreeImage({ nodes, edges, format: 'svg' })

    expect(result.startsWith('data:image/svg+xml;charset=utf-8,')).toBe(true)
    const svg = decodeURIComponent(result.slice(result.indexOf(',') + 1))
    expect(svg).toBe(buildExportTreeSvg(nodes, edges, 1192, 672))
  })

  it('rasterizes the SVG to PNG', async () => {
    const context = {
      fillStyle: '',
      fillRect: vi.fn(),
      drawImage: vi.fn(),
    }
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      context as unknown as CanvasRenderingContext2D,
    )
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
      'data:image/png;base64,cG5n',
    )
    class FakeImage {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null

      set src(_value: string) {
        queueMicrotask(() => this.onload?.())
      }
    }
    vi.stubGlobal('Image', FakeImage)
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:tree'),
      revokeObjectURL: vi.fn(),
    })

    await expect(
      exportTreeImage({ nodes, edges, format: 'png' }),
    ).resolves.toBe('data:image/png;base64,cG5n')
    expect(context.fillRect).toHaveBeenCalledWith(0, 0, 1192, 672)
    expect(context.drawImage).toHaveBeenCalledTimes(1)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:tree')
  })
})
