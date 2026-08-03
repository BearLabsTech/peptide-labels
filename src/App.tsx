import { useState } from 'react'
import type { LabelModelInput } from './features/label/labelModel'
import { getEmptyInput } from './features/label/labelModelFixtures'
import { LabelDesignerView } from './features/label/LabelDesignerView'
import { CalculatorView } from './features/label/CalculatorView'
import { ApplyDesignView } from './features/customDesign/ApplyDesignView'
import { WorkspaceChrome, type WorkspaceMode } from './features/label/WorkspaceChrome'
import { LabelHandoffDialog } from './features/label/LabelHandoffDialog'
import { usePrintSetup } from './features/label/usePrintSetup'
import { LandingPage, type LandingEntry } from './features/landing/LandingPage'
import {
    hasCurrentAgreementAcknowledgment,
    persistAgreementAcknowledgment,
} from './features/landing/landingPersistence'
import './App.css'
import './features/label/CalculatorView.css'

type AppView = 'landing' | 'workspace'

export default function App() {
    const {
        selection,
        setSelection,
        printTarget,
        setupOpen,
        setSetupOpen,
        openPrintSetup,
    } = usePrintSetup()
    const [input, setInput] = useState<LabelModelInput>(getEmptyInput)
    const [hasStartedEditing, setHasStartedEditing] = useState(false)
    const [view, setView] = useState<AppView>('landing')
    const [mode, setMode] = useState<WorkspaceMode>('calculator')
    const [needsAcknowledgment, setNeedsAcknowledgment] = useState(
        () => !hasCurrentAgreementAcknowledgment(),
    )
    const [handoffOpen, setHandoffOpen] = useState(false)

    function updateField<K extends keyof LabelModelInput>(field: K, value: LabelModelInput[K]) {
        setHasStartedEditing(true)
        setInput((prev) => ({ ...prev, [field]: value }))
    }

    function handleAcknowledge() {
        persistAgreementAcknowledgment()
        setNeedsAcknowledgment(false)
    }

    function handleChoose(entry: LandingEntry) {
        if (needsAcknowledgment) return
        setMode(entry)
        setView('workspace')
    }

    return (
        <>
            {view === 'landing' && (
                <LandingPage
                    needsAcknowledgment={needsAcknowledgment}
                    onAcknowledge={handleAcknowledge}
                    onChoose={handleChoose}
                />
            )}
            {view === 'workspace' && (
                <WorkspaceChrome mode={mode} onModeChange={setMode}>
                    {mode === 'calculator' && (
                        <CalculatorView
                            input={input}
                            updateField={updateField}
                            vialCapacityMl={printTarget.vialCapacityMl}
                            onVialCapacityChange={(vialCapacityMl) => {
                                setSelection({ ...selection, vialCapacityMl })
                            }}
                            onRequestLabelHandoff={() => setHandoffOpen(true)}
                        />
                    )}
                    {mode === 'designer' && (
                        <LabelDesignerView
                            input={input}
                            updateField={updateField}
                            printSelection={selection}
                            onPrintSelectionChange={setSelection}
                            printTarget={printTarget}
                            isExampleMode={!hasStartedEditing}
                            setupOpen={setupOpen}
                            onSetupOpenChange={setSetupOpen}
                            openPrintSetup={openPrintSetup}
                        />
                    )}
                    {mode === 'customDesign' && (
                        <ApplyDesignView printSelection={selection} />
                    )}
                </WorkspaceChrome>
            )}
            {handoffOpen && (
                <LabelHandoffDialog
                    onCancel={() => setHandoffOpen(false)}
                    onConfirm={() => {
                        setHandoffOpen(false)
                        setMode('designer')
                        setView('workspace')
                    }}
                />
            )}
        </>
    )
}
