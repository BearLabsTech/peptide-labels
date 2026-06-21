import { useRef } from 'react'
import { toPng } from 'html-to-image'
import { LabelPreview } from './LabelPreview'
import type { LabelRenderModel } from './LabelComposer'
import { buildExportSpec } from './print/exportSpec'
import { applyMonochromeThreshold } from './print/monochrome'
import { injectPngPhys } from './print/pngPhys'
import type { PrintTarget } from './print/types'
import { PrintTargetBanner } from './components/PrintTargetBanner'

export interface LabelStageProps {
    model: LabelRenderModel
    printTarget: PrintTarget
    compoundName?: string
    isExampleMode?: boolean
    onChangePrintSetup?: () => void
}

export function LabelStage({ model, printTarget, compoundName, isExampleMode, onChangePrintSetup }: LabelStageProps) {
    const stageRef = useRef<HTMLDivElement>(null)

    async function downloadLabel() {
        if (!stageRef.current || isExampleMode) return

        const exportSpec = buildExportSpec(printTarget)
        const dataUrl = await toPng(stageRef.current, {
            canvasWidth: exportSpec.canvasWidthPx,
            canvasHeight: exportSpec.canvasHeightPx,
            pixelRatio: exportSpec.pixelRatio,
            backgroundColor: '#ffffff',
        })

        const monochromeUrl = await applyMonochromeFilter(dataUrl, exportSpec.dpi)
        triggerDownload(monochromeUrl, compoundName)
    }

    return (
        <div className="stage-panel">
            <PrintTargetBanner printTarget={printTarget} onChange={onChangePrintSetup} />
            <div
                className="stage-wrapper"
                ref={stageRef}
                style={{
                    opacity: isExampleMode ? 0.4 : 1,
                    transition: 'opacity 0.3s ease',
                    pointerEvents: isExampleMode ? 'none' : 'auto',
                    aspectRatio: `${printTarget.labelWidthMm} / ${printTarget.labelHeightMm}`,
                }}
            >
                <LabelPreview model={model} printTarget={printTarget} />
            </div>
            <DownloadButton onClick={downloadLabel} disabled={isExampleMode} />
        </div>
    )
}

async function applyMonochromeFilter(dataUrl: string, dpi: number): Promise<string> {
    return new Promise((resolve) => {
        const img = new Image()
        img.onload = () => {
            const canvas = document.createElement('canvas')
            canvas.width = img.width
            canvas.height = img.height
            const ctx = canvas.getContext('2d')
            if (!ctx) return resolve(dataUrl)

            ctx.fillStyle = '#ffffff'
            ctx.fillRect(0, 0, canvas.width, canvas.height)
            ctx.drawImage(img, 0, 0)

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
            applyMonochromeThreshold(imageData.data)
            ctx.putImageData(imageData, 0, 0)

            canvas.toBlob(async (blob) => {
                if (!blob) return resolve(canvas.toDataURL('image/png'))
                const bytes = new Uint8Array(await blob.arrayBuffer())
                const withPhys = injectPngPhys(bytes, dpi)
                resolve(bytesToDataUrl(withPhys))
            }, 'image/png')
        }
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

function DownloadButton({ onClick, disabled }: { onClick: () => void, disabled?: boolean }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className="btn-primary"
        >
            Download Label PNG
        </button>
    )
}
