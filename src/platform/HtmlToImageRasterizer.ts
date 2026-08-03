import { toPng } from 'html-to-image'
import type { PngBytes, Rasterizer } from '../shared/ports'
import type { ExportSpec } from '../print/types'

function dataUrlToPngBytes(dataUrl: string): PngBytes {
  const comma = dataUrl.indexOf(',')
  const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/** Captures a DOM element to PNG bytes via html-to-image. */
export class HtmlToImageRasterizer implements Rasterizer {
  async capture(element: HTMLElement, spec: ExportSpec): Promise<PngBytes> {
    const dataUrl = await toPng(element, {
      canvasWidth: spec.canvasWidthPx,
      canvasHeight: spec.canvasHeightPx,
      pixelRatio: spec.pixelRatio,
      backgroundColor: '#ffffff',
    })
    return dataUrlToPngBytes(dataUrl)
  }
}
