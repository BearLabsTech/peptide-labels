import { useRef } from 'react'
import { toPng } from 'html-to-image'
import { LabelPreview } from './LabelPreview'
import type { LabelRenderModel } from './LabelComposer'

export interface LabelStageProps {
    model: LabelRenderModel
    compoundName?: string
    isExampleMode?: boolean
}

export function LabelStage({ model, compoundName, isExampleMode }: LabelStageProps) {
    const stageRef = useRef<HTMLDivElement>(null)

    async function downloadLabel() {
        if (!stageRef.current || isExampleMode) return

        // We will output an even higher resolution baseline (pixelRatio 3) 
        // to give the filter more raw pixels to work with.
        const dataUrl = await toPng(stageRef.current, {
            canvasWidth: 472,
            canvasHeight: 236,
            pixelRatio: 3,
            backgroundColor: '#ffffff'
        })

        const monochromeUrl = await applyMonochromeFilter(dataUrl)
        triggerDownload(monochromeUrl, compoundName)
    }

    return (
        <div className="stage-panel">
            <div
                className="stage-wrapper"
                ref={stageRef}
                style={{
                    opacity: isExampleMode ? 0.4 : 1,
                    transition: 'opacity 0.3s ease',
                    pointerEvents: isExampleMode ? 'none' : 'auto'
                }}
            >
                <LabelPreview model={model} />
            </div>
            <DownloadButton onClick={downloadLabel} disabled={isExampleMode} />
        </div>
    )
}

function applyMonochromeFilter(dataUrl: string): Promise<string> {
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
            const data = imageData.data

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i]
                const g = data[i + 1]
                const b = data[i + 2]
                const alpha = data[i + 3]

                const brightness = (r * 0.299 + g * 0.587 + b * 0.114)

                // By increasing the brightness threshold to 200, we force medium-light 
                // grays to become black, which fattens the text and lines for the printer.
                if (alpha < 128 || brightness > 200) {
                    data[i] = 255;
                    data[i + 1] = 255;
                    data[i + 2] = 255;
                    data[i + 3] = 255;
                } else {
                    data[i] = 0;
                    data[i + 1] = 0;
                    data[i + 2] = 0;
                    data[i + 3] = 255;
                }
            }

            ctx.putImageData(imageData, 0, 0)
            resolve(canvas.toDataURL('image/png'))
        }
        img.src = dataUrl
    })
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