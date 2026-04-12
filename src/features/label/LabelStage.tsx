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

        // 1. Generate the initial high-res PNG from the browser
        const dataUrl = await toPng(stageRef.current, {
            canvasWidth: 472,
            canvasHeight: 236,
            pixelRatio: 2,
            backgroundColor: '#ffffff'
        })

        // 2. Run it through our custom monochrome filter to destroy all anti-aliasing (gray pixels)
        const monochromeUrl = await applyMonochromeFilter(dataUrl)

        // 3. Download the pure 1-bit image
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

// --- NEW: Image Processing Engine ---
function applyMonochromeFilter(dataUrl: string): Promise<string> {
    return new Promise((resolve) => {
        const img = new Image()
        img.onload = () => {
            const canvas = document.createElement('canvas')
            canvas.width = img.width
            canvas.height = img.height
            const ctx = canvas.getContext('2d')
            if (!ctx) return resolve(dataUrl) // Fallback if canvas fails

            // Fill white background
            ctx.fillStyle = '#ffffff'
            ctx.fillRect(0, 0, canvas.width, canvas.height)
            ctx.drawImage(img, 0, 0)

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
            const data = imageData.data

            // Aggressive Thresholding: Scan every pixel
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i]
                const g = data[i + 1]
                const b = data[i + 2]
                const alpha = data[i + 3]

                // Calculate perceived brightness of the pixel
                const brightness = (r * 0.299 + g * 0.587 + b * 0.114)

                // If pixel is mostly transparent, or lighter than a medium-dark gray -> make pure white
                // We use 150 to ensure we aggressively erase the light-gray anti-aliasing edge pixels
                if (alpha < 128 || brightness > 150) {
                    data[i] = 255;     // R
                    data[i + 1] = 255; // G
                    data[i + 2] = 255; // B
                    data[i + 3] = 255; // Alpha
                } else {
                    // Otherwise, it's dark enough -> make pure black
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