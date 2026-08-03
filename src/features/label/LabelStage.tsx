import { useRef } from 'react'
import { LabelPreview } from './LabelPreview'
import type { LabelRenderModel } from './LabelComposer'
import type { PrintTarget } from '../../print/types'
import { PrintTargetBanner } from './components/PrintTargetBanner'
import { useLabelStageViewModel } from './useLabelStageViewModel'

export interface LabelStageProps {
    model: LabelRenderModel
    printTarget: PrintTarget
    compoundName?: string
    isExampleMode?: boolean
    onChangePrintSetup?: () => void
}

export function LabelStage({ model, printTarget, compoundName, isExampleMode, onChangePrintSetup }: LabelStageProps) {
    const labelRef = useRef<HTMLDivElement>(null)
    const vm = useLabelStageViewModel({ printTarget, compoundName, isExampleMode })

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
                onClick={() => void vm.downloadLabel(labelRef.current)}
                disabled={vm.downloadDisabled}
                isExporting={vm.isExporting}
            />
            {vm.exportError && <p className="label-export-error" role="alert">{vm.exportError}</p>}
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
