import { useLabelComposer } from './useLabelComposer'
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
    printLoadNotice?: string | null
    onDismissPrintLoadNotice?: () => void
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
    printLoadNotice = null,
    onDismissPrintLoadNotice,
}: LabelDesignerViewProps) {
    const composer = useLabelComposer(printTarget)
    const today = getTodayDateString()

    const labelInput = isExampleMode
        ? getExampleInput(today)
        : withReconstitutionMlSuffix(input)

    const model = composer.compose(labelInput)

    return (
        <div className="app-container">
            <ControlSidebar
                input={input}
                updateField={updateField}
                printSelection={printSelection}
                onPrintSelectionChange={onPrintSelectionChange}
                setupOpen={setupOpen}
                onSetupOpenChange={onSetupOpenChange}
                printPersistError={printPersistError}
                printLoadNotice={printLoadNotice}
                onDismissPrintLoadNotice={onDismissPrintLoadNotice}
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
