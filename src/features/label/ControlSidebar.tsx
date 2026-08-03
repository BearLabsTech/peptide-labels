import type { LabelFieldUpdater, LabelModelInput } from './labelModel'
import { resolveLabelMath } from './LabelMathResolver'
import { createLabelFormHandlers } from './useLabelForm'
import { CompoundSection, SourceSection, ReconstitutionSection, ProtocolSection, MediaSection, TestingSection } from './components/SidebarSections'
import { PrintSetupSection } from './components/PrintSetupSection'
import type { PrintSetupSelection } from '../../print/types'

export interface ControlSidebarProps {
    input: LabelModelInput
    updateField: LabelFieldUpdater
    printSelection: PrintSetupSelection
    onPrintSelectionChange: (next: PrintSetupSelection) => void
    setupOpen?: boolean
    onSetupOpenChange?: (open: boolean) => void
    printPersistError?: string | null
}

export function ControlSidebar({
    input,
    updateField,
    printSelection,
    onPrintSelectionChange,
    setupOpen,
    onSetupOpenChange,
    printPersistError = null,
}: ControlSidebarProps) {
    const { autoUnits, autoWater, autoConcentration } = resolveLabelMath(input);
    const derivedState = { autoUnits, autoWater, autoConcentration };
    const vialCapacityMl = printSelection.vialCapacityMl ?? 3;
    const handlers = createLabelFormHandlers(input, updateField, vialCapacityMl);

    function handlePrintSelectionChange(next: PrintSetupSelection) {
        const nextCapacity = next.vialCapacityMl ?? 3;
        if (nextCapacity !== vialCapacityMl) {
            handlers.handleVialCapacityChange(nextCapacity);
        }
        onPrintSelectionChange(next);
    }

    return (
        <div className="sidebar-panel">
            <SidebarHeader />
            <div className="sidebar-scroll-area">
                <PrintSetupSection
                    selection={printSelection}
                    onChange={handlePrintSelectionChange}
                    defaultOpen={setupOpen ?? true}
                    open={setupOpen}
                    onOpenChange={onSetupOpenChange}
                    persistError={printPersistError}
                />
                <CompoundSection input={input} updateField={updateField} handlers={handlers} />
                <ReconstitutionSection
                    input={input}
                    updateField={updateField}
                    derivedState={derivedState}
                    handlers={handlers}
                    vialCapacityMl={vialCapacityMl}
                />
                <ProtocolSection input={input} updateField={updateField} derivedState={derivedState} handlers={handlers} />
                <MediaSection input={input} updateField={updateField} />
                <TestingSection input={input} updateField={updateField} />
                <SourceSection input={input} updateField={updateField} />
            </div>
        </div>
    )
}

const SidebarHeader = () => (
    <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-muted)' }}>
        <h1 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--color-text-main)' }}>Label Builder</h1>
        <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Smart Layout Engine</p>
    </div>
)
