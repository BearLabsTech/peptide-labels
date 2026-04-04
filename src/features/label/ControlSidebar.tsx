import type { LabelModelInput } from './labelModel'
import { resolveLabelMath } from './LabelMathResolver'
import { useLabelForm } from './useLabelForm'
import { CompoundSection, SourceSection, ReconstitutionSection, ProtocolSection, MediaSection, CoaSection } from './components/SidebarSections'

export interface ControlSidebarProps {
    input: LabelModelInput
    updateField: <K extends keyof LabelModelInput>(field: K, value: any) => void
}

export function ControlSidebar({ input, updateField }: ControlSidebarProps) {
    const { autoUnits, autoWater, autoConcentration } = resolveLabelMath(input);
    const derivedState = { autoUnits, autoWater, autoConcentration };
    const handlers = useLabelForm(input, updateField);

    return (
        <div className="sidebar-panel">
            <SidebarHeader />
            <div className="sidebar-scroll-area">
                <CompoundSection input={input} updateField={updateField} handlers={handlers} />
                <SourceSection input={input} updateField={updateField} />
                <ReconstitutionSection input={input} updateField={updateField} derivedState={derivedState} handlers={handlers} />
                <ProtocolSection input={input} updateField={updateField} derivedState={derivedState} handlers={handlers} />
                <MediaSection input={input} updateField={updateField} />
                <CoaSection input={input} updateField={updateField} />
            </div>
        </div>
    )
}

const SidebarHeader = () => (
    <div style={{ padding: '20px 24px', borderBottom: '1px solid #e0e0e0', backgroundColor: '#fafafa' }}>
        <h1 style={{ margin: 0, fontSize: '1.2rem', color: '#333' }}>Label Builder</h1>
        <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#666' }}>Smart Layout Engine</p>
    </div>
)