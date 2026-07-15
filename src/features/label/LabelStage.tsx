import { useRef, useState } from 'react'
import { LabelPreview } from './LabelPreview'
import type { LabelRenderModel } from './LabelComposer'
import type { PrintTarget } from './print/types'
import { PrintTargetBanner } from './components/PrintTargetBanner'
import { exportLabelPng } from './labelExport'

export interface LabelStageProps {
    model: LabelRenderModel
    printTarget: PrintTarget
    compoundName?: string
    isExampleMode?: boolean
    onChangePrintSetup?: () => void
}

export function LabelStage({ model, printTarget, compoundName, isExampleMode, onChangePrintSetup }: LabelStageProps) {
    const labelRef = useRef<HTMLDivElement>(null)
    const [isExporting, setIsExporting] = useState(false)
    const [exportError, setExportError] = useState<string | null>(null)

    async function downloadLabel() {
        if (!labelRef.current || isExampleMode || isExporting) return
        setIsExporting(true)
        setExportError(null)
        try {
            await exportLabelPng(labelRef.current, printTarget, compoundName)
        } catch {
            setExportError('Couldn’t download the label. Try again.')
        } finally {
            setIsExporting(false)
        }
    }

    return (
        <div className="stage-panel">
            <PrintTargetBanner printTarget={printTarget} onChange={onChangePrintSetup} />
            <div className="label-stage-mat">
                <LabelPreview
                    ref={labelRef}
                    model={model}
                    printTarget={printTarget}
                    style={{
                        opacity: isExampleMode ? 0.4 : 1,
                        transition: 'opacity 0.3s ease',
                        pointerEvents: isExampleMode ? 'none' : 'auto',
                    }}
                />
            </div>
            <DownloadButton
                onClick={downloadLabel}
                disabled={isExampleMode || isExporting}
                isExporting={isExporting}
            />
            {exportError && <p className="label-export-error" role="alert">{exportError}</p>}
        </div>
    )
}

function DownloadButton({
    onClick,
    disabled,
    isExporting,
}: {
    onClick: () => void
    disabled?: boolean
    isExporting: boolean
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className="btn-primary"
        >
            {isExporting ? 'Preparing PNG…' : 'Download Label PNG'}
        </button>
    )
}
