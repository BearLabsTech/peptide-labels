import { useRef } from 'react'
import { toPng } from 'html-to-image'
import { LabelPreview } from './LabelPreview'
import type { LabelRenderModel } from './LabelComposer'

export interface LabelStageProps {
    model: LabelRenderModel
    compoundName?: string
}

export function LabelStage({ model, compoundName }: LabelStageProps) {
    const previewRef = useRef<HTMLDivElement>(null)

    const stageStyle: React.CSSProperties = {
        flex: 1, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        backgroundColor: '#f0f2f5', padding: '40px'
    }

    const wrapperStyle: React.CSSProperties = {
        width: '100%', maxWidth: '500px', backgroundColor: 'white',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)'
    }

    async function downloadLabel() {
        if (!previewRef.current) return
        const dataUrl = await toPng(previewRef.current, {
            canvasWidth: 472, canvasHeight: 236, pixelRatio: 1, backgroundColor: 'white'
        })
        triggerDownload(dataUrl, compoundName)
    }

    return (
        <div style={stageStyle}>
            <div style={wrapperStyle}>
                <LabelPreview ref={previewRef} model={model} />
            </div>
            <DownloadButton onClick={downloadLabel} />
        </div>
    )
}

function triggerDownload(dataUrl: string, name?: string) {
    const link = document.createElement('a')
    link.download = `${name?.toLowerCase() || 'label'}-export.png`
    link.href = dataUrl
    link.click()
}

function DownloadButton({ onClick }: { onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            style={{
                marginTop: 40, padding: '12px 24px', backgroundColor: '#0f172a',
                color: 'white', border: 'none', borderRadius: '6px', fontSize: '1rem',
                fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
            }}
        >
            Download Label PNG
        </button>
    )
}