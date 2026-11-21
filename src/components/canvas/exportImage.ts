import type { Node } from '@xyflow/react'
import type { PhyloFlowEdge, PhyloFlowNode } from '../../layout/layout'
import { formatBranchLength } from '../../lib/branchLength'
import type { ResolvedTheme } from '../../theme/theme'

export type ExportImageFormat = 'png' | 'svg'

export interface ExportTreeImageOptions {
  nodes: PhyloFlowNode[]
  edges: PhyloFlowEdge[]
  format: ExportImageFormat
  theme?: ResolvedTheme
}

const EXPORT_IMAGE_SCALES = [2, 1, 0.5, 0.25, 0.125, 0.0625, 0.03125]
const EXPORT_IMAGE_MARGIN = 48
const EXPORT_IMAGE_MIN_WIDTH = 640
const EXPORT_IMAGE_MAX_WIDTH = 16384
const EXPORT_IMAGE_MIN_HEIGHT = 480
const EXPORT_IMAGE_MAX_HEIGHT = 16384
const EXPORT_IMAGE_MAX_PIXELS = 40_000_000
const FALLBACK_NODE_WIDTH = 144
const FALLBACK_NODE_HEIGHT = 38
const NODE_PADDING = 12
const NODE_GAP = 8
const BADGE_SIZE = 20
const COLLAPSED_BADGE_HEIGHT = 20
const COLLAPSED_BADGE_MIN_WIDTH = 24
const BRANCH_LABEL_OFFSET = 18
const BRANCH_LABEL_HEIGHT = 19
const FONT_FAMILY = 'ui-sans-serif, system-ui, sans-serif'
const NODE_FONT = `500 14px ${FONT_FAMILY}`
const BRANCH_LABEL_FONT = `400 11px ${FONT_FAMILY}`
const COLLAPSED_BADGE_FONT = `600 10px ${FONT_FAMILY}`
interface ExportPalette {
  background: string
  nodeBackground: string
  text: string
  muted: string
  border: string
  badge: string
  shadowOpacity: string
}

const EXPORT_PALETTES: Record<ResolvedTheme, ExportPalette> = {
  light: {
    background: '#ffffff',
    nodeBackground: '#ffffff',
    text: '#262626',
    muted: '#737373',
    border: '#e5e5e5',
    badge: '#f5f5f5',
    shadowOpacity: '0.1',
  },
  dark: {
    background: '#0a0a0a',
    nodeBackground: '#171717',
    text: '#fafafa',
    muted: '#a3a3a3',
    border: '#2e2e2e',
    badge: '#262626',
    shadowOpacity: '0.6',
  },
}

interface ExportBounds {
  x: number
  y: number
  width: number
  height: number
}

interface ExportNode {
  id: string
  x: number
  y: number
  width: number
  height: number
  label: string
  metadataCount: number
  collapsed: boolean
  hiddenDescendantCount: number
}

let textMeasureContext: CanvasRenderingContext2D | null | undefined

function getTextMeasureContext(): CanvasRenderingContext2D | null {
  if (textMeasureContext === undefined) {
    textMeasureContext = document.createElement('canvas').getContext('2d')
  }

  return textMeasureContext
}

function measureText(text: string, font: string): number {
  const context = getTextMeasureContext()

  if (context === null) {
    const fontSize = Number(font.match(/([\d.]+)px/u)?.[1] ?? 14)

    return text.length * fontSize * 0.55
  }

  context.font = font

  return context.measureText(text).width
}

function truncateText(text: string, maxWidth: number, font: string): string {
  if (maxWidth <= 0) {
    return ''
  }

  if (measureText(text, font) <= maxWidth) {
    return text
  }

  const ellipsis = '…'
  let low = 0
  let high = text.length

  while (low < high) {
    const middle = Math.ceil((low + high) / 2)
    const candidate = `${text.slice(0, middle)}${ellipsis}`

    if (measureText(candidate, font) <= maxWidth) {
      low = middle
    } else {
      high = middle - 1
    }
  }

  return `${text.slice(0, low)}${ellipsis}`
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function formatNumber(value: number): string {
  return String(Number(value.toFixed(2)))
}

function prepareNodes(nodes: Node[]): ExportNode[] {
  return nodes.map((node) => ({
    id: node.id,
    x: node.position.x,
    y: node.position.y,
    width: Math.round(
      node.measured?.width ?? node.width ?? FALLBACK_NODE_WIDTH,
    ),
    height: Math.round(
      node.measured?.height ?? node.height ?? FALLBACK_NODE_HEIGHT,
    ),
    label: String(node.data?.label ?? ''),
    metadataCount: Object.keys(
      (node.data?.metadata as Record<string, unknown> | undefined) ?? {},
    ).length,
    collapsed: node.data?.collapsed === true,
    hiddenDescendantCount: Number(node.data?.hiddenDescendantCount ?? 0),
  }))
}

function getTreeBounds(nodes: ExportNode[]): ExportBounds {
  if (nodes.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 }
  }

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const node of nodes) {
    minX = Math.min(minX, node.x)
    minY = Math.min(minY, node.y)
    maxX = Math.max(maxX, node.x + node.width)
    maxY = Math.max(maxY, node.y + node.height)
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

function getExportBounds(nodes: ExportNode[]): ExportBounds {
  const bounds = getTreeBounds(nodes)
  const x = Math.floor(bounds.x - EXPORT_IMAGE_MARGIN)
  const y = Math.floor(bounds.y - EXPORT_IMAGE_MARGIN)
  const maxX = Math.ceil(bounds.x + bounds.width + EXPORT_IMAGE_MARGIN)
  const maxY = Math.ceil(bounds.y + bounds.height + EXPORT_IMAGE_MARGIN)

  return { x, y, width: maxX - x, height: maxY - y }
}

function getScale(bounds: ExportBounds): number {
  const fits = (scale: number): boolean => {
    const width = bounds.width * scale
    const height = bounds.height * scale

    return (
      width <= EXPORT_IMAGE_MAX_WIDTH &&
      height <= EXPORT_IMAGE_MAX_HEIGHT &&
      width * height <= EXPORT_IMAGE_MAX_PIXELS
    )
  }

  return (
    EXPORT_IMAGE_SCALES.find(fits) ??
    Math.min(
      EXPORT_IMAGE_MAX_WIDTH / bounds.width,
      EXPORT_IMAGE_MAX_HEIGHT / bounds.height,
      Math.sqrt(EXPORT_IMAGE_MAX_PIXELS / (bounds.width * bounds.height)),
    )
  )
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function getExportImageSize(nodes: Node[]): {
  width: number
  height: number
} {
  const bounds = getExportBounds(prepareNodes(nodes))
  const scale = getScale(bounds)
  const width = clamp(
    Math.round(bounds.width * scale),
    EXPORT_IMAGE_MIN_WIDTH,
    EXPORT_IMAGE_MAX_WIDTH,
  )
  const height = clamp(
    Math.round(bounds.height * scale),
    EXPORT_IMAGE_MIN_HEIGHT,
    EXPORT_IMAGE_MAX_HEIGHT,
  )

  return { width, height }
}

function nodeCenterY(node: ExportNode): number {
  return node.y + node.height / 2
}

function buildNodeMarkup(node: ExportNode, palette: ExportPalette): string {
  const hasMetadataBadge = node.metadataCount > 0
  const hasCollapsedBadge = node.collapsed && node.hiddenDescendantCount > 0
  const collapsedLabel = `+${node.hiddenDescendantCount}`
  const collapsedBadgeWidth = Math.max(
    COLLAPSED_BADGE_MIN_WIDTH,
    Math.ceil(measureText(collapsedLabel, COLLAPSED_BADGE_FONT)) + 10,
  )
  const badgeWidth =
    (hasMetadataBadge ? BADGE_SIZE + NODE_GAP : 0) +
    (hasCollapsedBadge ? collapsedBadgeWidth + NODE_GAP : 0)
  const labelWidth = node.width - NODE_PADDING * 2 - badgeWidth
  const label = truncateText(node.label, labelWidth, NODE_FONT)
  const centerY = nodeCenterY(node)
  const dashArray = node.collapsed ? ' stroke-dasharray="4 3"' : ''
  const parts = [
    `<rect x="${formatNumber(node.x)}" y="${formatNumber(node.y)}" width="${node.width}" height="${node.height}" rx="8" fill="${palette.nodeBackground}" stroke="${palette.border}" stroke-opacity="0.8"${dashArray} filter="url(#node-shadow)"/>`,
  ]

  if (label !== '') {
    parts.push(
      `<text x="${formatNumber(node.x + NODE_PADDING)}" y="${formatNumber(centerY)}" font-size="14" font-weight="500" fill="${palette.text}" dominant-baseline="central">${escapeXml(label)}</text>`,
    )
  }

  let badgeRight = node.x + node.width - NODE_PADDING

  if (hasCollapsedBadge) {
    const badgeX = badgeRight - collapsedBadgeWidth
    const badgeY = centerY - COLLAPSED_BADGE_HEIGHT / 2
    parts.push(
      `<rect x="${formatNumber(badgeX)}" y="${formatNumber(badgeY)}" width="${formatNumber(collapsedBadgeWidth)}" height="${COLLAPSED_BADGE_HEIGHT}" rx="${COLLAPSED_BADGE_HEIGHT / 2}" fill="${palette.badge}" stroke="${palette.border}"/>`,
      `<text x="${formatNumber(badgeX + collapsedBadgeWidth / 2)}" y="${formatNumber(centerY)}" font-size="10" font-weight="600" fill="${palette.text}" text-anchor="middle" dominant-baseline="central">${escapeXml(collapsedLabel)}</text>`,
    )
    badgeRight = badgeX - NODE_GAP
  }

  if (hasMetadataBadge) {
    const centerX = badgeRight - BADGE_SIZE / 2
    parts.push(
      `<circle cx="${formatNumber(centerX)}" cy="${formatNumber(centerY)}" r="${BADGE_SIZE / 2}" fill="${palette.badge}"/>`,
      `<text x="${formatNumber(centerX)}" y="${formatNumber(centerY)}" font-size="10" font-weight="600" fill="${palette.muted}" text-anchor="middle" dominant-baseline="central">${node.metadataCount}</text>`,
    )
  }

  return parts.join('')
}

function buildEdgeMarkup(
  edge: PhyloFlowEdge,
  nodes: Map<string, ExportNode>,
): string {
  const source = nodes.get(edge.source)
  const target = nodes.get(edge.target)

  if (source === undefined || target === undefined) {
    return ''
  }

  const sourceX = source.x
  const targetX = target.x
  const targetY = nodeCenterY(target)

  return `<path d="M ${formatNumber(sourceX)},${formatNumber(nodeCenterY(source))} L ${formatNumber(sourceX)},${formatNumber(targetY)} L ${formatNumber(targetX)},${formatNumber(targetY)}"/>`
}

function buildBranchLabelMarkup(
  edge: PhyloFlowEdge,
  nodes: Map<string, ExportNode>,
  palette: ExportPalette,
): string {
  const source = nodes.get(edge.source)
  const target = nodes.get(edge.target)
  const branchLength = edge.data?.branchLength ?? null

  if (source === undefined || target === undefined || branchLength === null) {
    return ''
  }

  const label = formatBranchLength(branchLength)
  const textWidth = measureText(label, BRANCH_LABEL_FONT)
  const boxWidth = textWidth + 12
  const centerX =
    edge.data?.branchLabelX ?? (source.x + source.width + target.x) / 2
  const bottom = nodeCenterY(target) - BRANCH_LABEL_OFFSET
  const top = bottom - BRANCH_LABEL_HEIGHT
  const parts = [
    `<line x1="${formatNumber(centerX)}" y1="${formatNumber(bottom)}" x2="${formatNumber(centerX)}" y2="${formatNumber(nodeCenterY(target))}" stroke="${palette.muted}" stroke-width="1" stroke-dasharray="2 2" opacity="0.5"/>`,
    `<rect x="${formatNumber(centerX - boxWidth / 2)}" y="${formatNumber(top)}" width="${formatNumber(boxWidth)}" height="${BRANCH_LABEL_HEIGHT}" rx="3" fill="${palette.background}" stroke="${palette.border}"/>`,
    `<text x="${formatNumber(centerX)}" y="${formatNumber(top + BRANCH_LABEL_HEIGHT / 2)}" font-size="11" fill="${palette.muted}" text-anchor="middle" dominant-baseline="central">${escapeXml(label)}</text>`,
  ]

  return parts.join('')
}

export function buildExportTreeSvg(
  nodes: PhyloFlowNode[],
  edges: PhyloFlowEdge[],
  width: number,
  height: number,
  theme: ResolvedTheme = 'light',
): string {
  const palette = EXPORT_PALETTES[theme]
  const preparedNodes = prepareNodes(nodes)
  const bounds = getExportBounds(preparedNodes)
  const nodeMap = new Map(preparedNodes.map((node) => [node.id, node]))
  const edgeMarkup = edges
    .map((edge) => buildEdgeMarkup(edge, nodeMap))
    .join('')
  const branchLabelMarkup = edges
    .map((edge) => buildBranchLabelMarkup(edge, nodeMap, palette))
    .join('')
  const nodeMarkup = preparedNodes
    .map((node) => buildNodeMarkup(node, palette))
    .join('')

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${formatNumber(bounds.x)} ${formatNumber(bounds.y)} ${bounds.width} ${bounds.height}" font-family="${FONT_FAMILY}">`,
    `<defs><filter id="node-shadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-color="#000000" flood-opacity="${palette.shadowOpacity}"/></filter></defs>`,
    `<rect x="${formatNumber(bounds.x)}" y="${formatNumber(bounds.y)}" width="${bounds.width}" height="${bounds.height}" fill="${palette.background}"/>`,
    `<g fill="none" stroke="${palette.muted}" stroke-width="1.5" stroke-linecap="square" stroke-linejoin="miter" shape-rendering="crispEdges">${edgeMarkup}</g>`,
    branchLabelMarkup,
    nodeMarkup,
    '</svg>',
  ].join('')
}

async function rasterizeSvg(
  svg: string,
  width: number,
  height: number,
  palette: ExportPalette,
): Promise<string> {
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  try {
    const image = new Image()
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('Could not render the SVG image.'))
      image.src = url
    })

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d', {
      alpha: false,
      willReadFrequently: true,
    })

    if (context === null) {
      throw new Error('Canvas is not available.')
    }

    context.fillStyle = palette.background
    context.fillRect(0, 0, width, height)
    context.drawImage(image, 0, 0, width, height)

    return canvas.toDataURL('image/png')
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function exportTreeImage({
  nodes,
  edges,
  format,
  theme = 'light',
}: ExportTreeImageOptions): Promise<string> {
  const { width, height } = getExportImageSize(nodes)
  const svg = buildExportTreeSvg(nodes, edges, width, height, theme)

  if (format === 'svg') {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  }

  return rasterizeSvg(svg, width, height, EXPORT_PALETTES[theme])
}
