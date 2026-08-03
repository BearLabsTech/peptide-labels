import { useMemo } from 'react'
import { LabelComposer } from './LabelComposer'
import type { LabelFieldUpdater, LabelModelInput } from './labelModel'
import { withReconstitutionMlSuffix } from './labelContent'
import { getExampleInput } from './labelModelFixtures'
import { ControlSidebar } from './ControlSidebar'
import { LabelStage } from './LabelStage'
import type { PrintSetupSelection, PrintTarget } from '../../print/types'

function getTodayDateString(): string {
    return new Date().toISOString().slice(0, 10)
}

export interface LabelDesignerViewProps {
    input: LabelModelInput
    updateField: LabelFieldUpdater
    printSelection: PrintSetupSelection
    onPrintSelectionChange: (next: PrintSetupSelection) => void
    printTarget: PrintTarget
    isExampleMode: boolean
    setupOpen: boolean
    onSetupOpenChange: (open: boolean) => void
    openPrintSetup: () => void
    printPersistError?: string | null
}

export function LabelDesignerView({
    input,
    updateField,
    printSelection,
    onPrintSelectionChange,
    printTarget,
    isExampleMode,
    setupOpen,
    onSetupOpenChange,
    openPrintSetup,
    printPersistError = null,
}: LabelDesignerViewProps) {
    const composer = useMemo(() => new LabelComposer(printTarget), [printTarget])
    const today = getTodayDateString()

    const labelInput = isExampleMode
        ? getExampleInput(today)
        : withReconstitutionMlSuffix(input)

    const model = composer.compose(labelInput)

    return (
        <div className="app-container" style={{ height: '100%', width: '100%' }}>
            <ControlSidebar
                input={input}
                updateField={updateField}
                printSelection={printSelection}
                onPrintSelectionChange={onPrintSelectionChange}
                setupOpen={setupOpen}
                onSetupOpenChange={onSetupOpenChange}
                printPersistError={printPersistError}
            />
            <LabelStage
                model={model}
                printTarget={printTarget}
                compoundName={input.compoundName}
                isExampleMode={isExampleMode}
                onChangePrintSetup={openPrintSetup}
            />
        </div>
    )
}
