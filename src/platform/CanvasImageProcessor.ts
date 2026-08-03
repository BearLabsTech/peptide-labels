import type { ImageProcessor, PngBytes } from '../features/label/domain/ports'
import { applyMonochromeThreshold } from '../print/monochrome'
import { injectPngPhys } from '../print/pngPhys'

function bytesToDataUrl(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return `data:image/png;base64,${btoa(binary)}`
}

/**
 * Decodes a PNG, applies the thermal monochrome threshold, re-encodes, and
 * injects a pHYs chunk for the given DPI.
 */
export class CanvasImageProcessor implements ImageProcessor {
  async toMonochrome(bytes: PngBytes, dpi: number): Promise<PngBytes> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas rendering is unavailable'))
          return
        }

        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0)

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        applyMonochromeThreshold(imageData.data)
        ctx.putImageData(imageData, 0, 0)

        canvas.toBlob(async (blob) => {
          if (!blob) {
            reject(new Error('PNG encoding failed'))
            return
          }
          try {
            const encoded = new Uint8Array(await blob.arrayBuffer())
            resolve(injectPngPhys(encoded, dpi))
          } catch (error) {
            reject(error)
          }
        }, 'image/png')
      }
      img.onerror = () => reject(new Error('Export image could not be loaded'))
      img.src = bytesToDataUrl(bytes)
    })
  }
}
