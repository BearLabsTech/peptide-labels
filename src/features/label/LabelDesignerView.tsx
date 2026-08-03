import { useMemo } from 'react'
import { LabelComposer } from './LabelComposer'
import type { LabelFieldUpdater, LabelModelInput } from './labelModel'
import { ControlSidebar } from './ControlSidebar'
import { LabelStage } from './LabelStage'
import { DEFAULT_CALCULATOR_SOLVE_MODE } from './peptideMath'
import type { PrintSetupSelection, PrintTarget } from './print/types'
import exampleLogoUrl from '../../assets/bear-labs-logo.png'

function getTodayDateString(): string {
    return new Date().toISOString().slice(0, 10)
}

function getExampleInput(today: string): LabelModelInput {
    return {
        compoundName: 'Tirzepatide',
        compoundAmount: '20',
        vialUnit: 'mg',
        reconstitutionAmount: '2',
        reconstitutionType: 'BAC Water',
        protocolAmount: '5',
        measureUnit: 'mg',
        protocolFrequency: 'Weekly',
        reconstitutionDate: today,
        dateFormat: 'YYYYMMDD',
        showSource: false,
        showTestIndicators: true,
        testPurity: 'pass',
        testEndotoxin: 'pass',
        showCoaQr: true,
        vendorCoa: 'https://github.com',
        customImage: exampleLogoUrl,
        calculatorSolveMode: DEFAULT_CALCULATOR_SOLVE_MODE,
        syringeCapacityMl: 1.0,
    }
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
}: LabelDesignerViewProps) {
    const composer = useMemo(() => new LabelComposer(printTarget), [printTarget])
    const today = getTodayDateString()

    let labelInput: LabelModelInput
    if (isExampleMode) {
        labelInput = getExampleInput(today)
    } else if (input.reconstitutionAmount && !input.reconstitutionAmount.includes('ml')) {
        labelInput = {
            ...input,
            reconstitutionAmount: `${input.reconstitutionAmount}ml`,
        }
    } else {
        labelInput = { ...input }
    }

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
