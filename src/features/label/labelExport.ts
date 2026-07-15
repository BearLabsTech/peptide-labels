import { toPng } from 'html-to-image'
import { buildExportSpec } from './print/exportSpec'
import { applyMonochromeThreshold } from './print/monochrome'
import { injectPngPhys } from './print/pngPhys'
import type { PrintTarget } from './print/types'

export async function exportLabelPng(
    element: HTMLDivElement,
    printTarget: PrintTarget,
    compoundName?: string,
): Promise<void> {
    const exportSpec = buildExportSpec(printTarget)
    const dataUrl = await toPng(element, {
        canvasWidth: exportSpec.canvasWidthPx,
        canvasHeight: exportSpec.canvasHeightPx,
        pixelRatio: exportSpec.pixelRatio,
        backgroundColor: '#ffffff',
    })
    const monochromeUrl = await applyMonochromeFilter(dataUrl, exportSpec.dpi)
    triggerDownload(monochromeUrl, compoundName)
}

export async function applyMonochromeFilter(dataUrl: string, dpi: number): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
            const canvas = document.createElement('canvas')
            canvas.width = img.width
            canvas.height = img.height
            const ctx = canvas.getContext('2d')
            if (!ctx) return reject(new Error('Canvas rendering is unavailable'))

            ctx.fillStyle = '#ffffff'
            ctx.fillRect(0, 0, canvas.width, canvas.height)
            ctx.drawImage(img, 0, 0)

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
            applyMonochromeThreshold(imageData.data)
            ctx.putImageData(imageData, 0, 0)

            canvas.toBlob(async (blob) => {
                if (!blob) return reject(new Error('PNG encoding failed'))
                try {
                    const bytes = new Uint8Array(await blob.arrayBuffer())
                    const withPhys = injectPngPhys(bytes, dpi)
                    resolve(bytesToDataUrl(withPhys))
                } catch (error) {
                    reject(error)
                }
            }, 'image/png')
        }
        img.onerror = () => reject(new Error('Export image could not be loaded'))
        img.src = dataUrl
    })
}

function bytesToDataUrl(bytes: Uint8Array): string {
    let binary = ''
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
    return `data:image/png;base64,${btoa(binary)}`
}

function triggerDownload(dataUrl: string, name?: string) {
    const link = document.createElement('a')
    link.download = `${name?.toLowerCase() || 'label'}-export.png`
    link.href = dataUrl
    link.click()
}
