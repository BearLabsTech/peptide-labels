import type { PrintTarget } from './types'

/** Container-query padding from mm so preview matches export. */
export function paddingMmToCqw(paddingMm: number, labelWidthMm: number): string {
  return `${(paddingMm / labelWidthMm) * 100}cqw`
}

/** Corner radius as % of label width (sticker is the query container; self-referential cqw is unreliable). */
export function cornerRadiusToPercent(cornerRadiusMm: number, labelWidthMm: number): string {
  return `${(cornerRadiusMm / labelWidthMm) * 100}%`
}

/** Outer sticker shell — exact stock aspect ratio; preview mat sits outside this. */
export function labelStickerStyle(target: PrintTarget): Record<string, string> {
  const style: Record<string, string> = {
    width: '100%',
    aspectRatio: `${target.labelWidthMm} / ${target.labelHeightMm}`,
    backgroundColor: '#ffffff',
    boxSizing: 'border-box',
  }

  if (target.shape === 'rounded' && target.cornerRadiusMm > 0) {
    style.borderRadius = cornerRadiusToPercent(target.cornerRadiusMm, target.labelWidthMm)
    style.overflow = 'hidden'
  }

  return style
}

/** Inner layout surface — fills sticker; padding matches stock profile. */
export function labelContentStyle(target: PrintTarget): Record<string, string> {
  const pad = paddingMmToCqw(target.paddingMm, target.labelWidthMm)
  return {
    '--label-pad': pad,
    width: '100%',
    height: '100%',
  }
}

/** @deprecated Use labelStickerStyle + labelContentStyle */
export function labelSurfaceStyle(target: PrintTarget): Record<string, string> {
  return { ...labelStickerStyle(target), ...labelContentStyle(target) }
}
