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
    // We attach the ref to the wrapper so the PNG generator captures the bounding box
    const stageRef = useRef<HTMLDivElement>(null)

    async function downloadLabel() {
        if (!stageRef.current || isExampleMode) return
        const dataUrl = await toPng(stageRef.current, {
            canvasWidth: 472, canvasHeight: 236, pixelRatio: 1, backgroundColor: 'white'
        })
        triggerDownload(dataUrl, compoundName)
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
            style={{
                marginTop: 40, padding: '12px 24px',
                backgroundColor: disabled ? '#94a3b8' : '#0f172a',
                color: 'white', border: 'none', borderRadius: '6px', fontSize: '1rem',
                fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
                boxShadow: disabled ? 'none' : '0 4px 6px -1px rgba(0,0,0,0.1)',
                transition: 'all 0.2s ease'
            }}
        >
            Download Label PNG
        </button>
    )
}