import type { PrintTarget } from './types'

export function parsePositiveMm(value: string): number | undefined {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

/** Millimeters per inch — the only place this conversion factor should live. */
export const MM_PER_INCH = 25.4

/** Single source of truth: mm + DPI → pixel count. */
export function mmToPx(mm: number, dpi: number): number {
  return Math.round((mm / MM_PER_INCH) * dpi)
}

/** Single source of truth: pixel count + DPI → mm. */
export function pxToMm(px: number, dpi: number): number {
  if (!(dpi > 0) || !Number.isFinite(dpi)) {
    throw new Error(`pxToMm requires a positive finite dpi, got ${String(dpi)}`)
  }
  return (px * MM_PER_INCH) / dpi
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
