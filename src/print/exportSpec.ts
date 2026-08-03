import { resolvePixelSize } from './dimensions'
import type { ExportSpec, PrintTarget } from './types'

export function buildExportSpec(target: PrintTarget): ExportSpec {
  const { widthPx, heightPx } = resolvePixelSize(
    target.labelWidthMm,
    target.labelHeightMm,
    target.effectiveDpi,
  )

  return {
    canvasWidthPx: widthPx,
    canvasHeightPx: heightPx,
    pixelRatio: 1,
    dpi: target.effectiveDpi,
  }
}
