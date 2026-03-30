import type { LabelModelInput } from './labelModel'
import { resolveLabelMath } from './LabelMathResolver'
import { useLabelForm } from './useLabelForm'
import { CompoundSection, ReconstitutionSection, ProtocolSection, MediaSection, CoaSection } from './components/SidebarSections'

export interface ControlSidebarProps {
    input: LabelModelInput
    updateField: <K extends keyof LabelModelInput>(field: K, value: any) => void
    selectedDate: string
    updateDateFromPicker: (value: string) => void
    isFreeTextDate: boolean
    setIsFreeTextDate: (value: boolean) => void
}

export function ControlSidebar(props: ControlSidebarProps) {
    const { autoUnits, autoWater, autoConcentration } = resolveLabelMath(props.input);
    const derivedState = { autoUnits, autoWater, autoConcentration };

    // Inject our new clean business logic hook
    const handlers = useLabelForm(props.input, props.updateField);

    return (
        <div className="sidebar-panel">
            <SidebarHeader />
            <div className="sidebar-scroll-area">
                <CompoundSection {...props} handlers={handlers} />
                <ReconstitutionSection {...props} derivedState={derivedState} handlers={handlers} />
                <ProtocolSection {...props} derivedState={derivedState} handlers={handlers} />
                <MediaSection {...props} handlers={handlers} />
                <CoaSection {...props} handlers={handlers} />
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