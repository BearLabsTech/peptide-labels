import type { PrintTarget } from './types'

export function parsePositiveMm(value: string): number | undefined {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

/** Single source of truth: mm + DPI → pixel count. */
export function mmToPx(mm: number, dpi: number): number {
  return Math.round((mm / 25.4) * dpi)
}

export function resolvePixelSize(
  widthMm: number,
  heightMm: number,
  dpi: number,
): { widthPx: number; heightPx: number } {
  return {
    widthPx: mmToPx(widthMm, dpi),
    heightPx: mmToPx(heightMm, dpi),
  }
}

/** Preview typography base width matches export canvas width at pixelRatio 1. */
export function previewBaseWidthPx(target: PrintTarget): number {
  return mmToPx(target.labelWidthMm, target.effectiveDpi)
}
