import { forwardRef } from 'react'
import type { LabelModelInput } from './labelModel'

export interface ControlSidebarProps {
    input: LabelModelInput
    updateField: <K extends keyof LabelModelInput>(field: K, value: string) => void
    selectedDate: string
    updateDateFromPicker: (value: string) => void
    isFreeTextDate: boolean
    setIsFreeTextDate: (value: boolean) => void
}

export function ControlSidebar(props: ControlSidebarProps) {
    return (
        <div style={sidebarStyle}>
            <SidebarHeader />
            <div style={scrollAreaStyle}>
                <CompoundSection {...props} />
                <ReconstitutionSection {...props} />
                <ProtocolSection {...props} />
            </div>
        </div>
    )
}

function CompoundSection({ input, updateField }: ControlSidebarProps) {
    return (
        <div style={{ marginBottom: 24 }}>
            <SectionTitle title="Compound" />
            <TextInput label="Compound Name" value={input.compoundName} onChange={v => updateField('compoundName', v)} placeholder="Tirzepatide" />
            <TextInput label="Compound Amount" value={input.compoundAmount} onChange={v => updateField('compoundAmount', v)} placeholder="20mg" />
        </div>
    )
}

function ReconstitutionSection(props: ControlSidebarProps) {
    return (
        <div style={{ marginBottom: 24 }}>
            <SectionTitle title="Reconstitution" />
            <TextInput label="Amount" value={props.input.reconstitutionAmount} onChange={v => props.updateField('reconstitutionAmount', v)} placeholder="2ml" />
            <TextInput label="Type" value={props.input.reconstitutionType} onChange={v => props.updateField('reconstitutionType', v)} placeholder="BAC" />
            <TextInput label="Concentration" value={props.input.concentration} onChange={v => props.updateField('concentration', v)} placeholder="1mg per 10 units" />
            <DateField {...props} />
        </div>
    )
}

function ProtocolSection({ input, updateField }: ControlSidebarProps) {
    return (
        <div style={{ marginBottom: 24 }}>
            <SectionTitle title="Protocol" />
            <TextInput label="Protocol Units" value={input.protocolUnits} onChange={v => updateField('protocolUnits', v)} placeholder="40 Units" />
            <TextInput label="Protocol Amount" value={input.protocolAmount} onChange={v => updateField('protocolAmount', v)} placeholder="4mg" />
            <TextInput label="Frequency" value={input.protocolFrequency} onChange={v => updateField('protocolFrequency', v)} placeholder="Weekly" />
        </div>
    )
}

function SectionTitle({ title }: { title: string }) {
    return <h2 style={{ fontSize: '0.9rem', color: '#222', borderBottom: '2px solid #eee', paddingBottom: 4, marginBottom: 12 }}>{title}</h2>
}

function SidebarHeader() {
    return (
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e0e0e0', backgroundColor: '#fafafa' }}>
            <h1 style={{ margin: 0, fontSize: '1.2rem', color: '#333' }}>Label Builder</h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#666' }}>3ml Vial Setup</p>
        </div>
    )
}

function TextInput({ label, value, onChange, placeholder }: { label: string, value?: string, onChange: (v: string) => void, placeholder: string }) {
    return (
        <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#555', marginBottom: 4 }}>{label}</label>
            <input value={value ?? ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={inputStyle} />
        </div>
    )
}

function DateField({ input, updateField, selectedDate, updateDateFromPicker, isFreeTextDate, setIsFreeTextDate }: ControlSidebarProps) {
    return (
        <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#555' }}>Reconstitution Date</label>
                <label style={{ fontSize: '0.75rem', color: '#666', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input type="checkbox" checked={isFreeTextDate} onChange={e => setIsFreeTextDate(e.target.checked)} style={{ marginRight: 4 }} />
                    Free text
                </label>
            </div>
            {isFreeTextDate
                ? <input value={input.reconstitutionDate ?? ''} onChange={e => updateField('reconstitutionDate', e.target.value)} placeholder="YYYYMMDD" style={inputStyle} />
                : <input type="date" value={selectedDate} onChange={e => updateDateFromPicker(e.target.value)} style={inputStyle} />
            }
        </div>
    )
}

const sidebarStyle: React.CSSProperties = {
    width: '340px', backgroundColor: '#ffffff', borderRight: '1px solid #e0e0e0',
    display: 'flex', flexDirection: 'column', boxShadow: '2px 0 8px rgba(0,0,0,0.05)', zIndex: 10
}

const scrollAreaStyle: React.CSSProperties = { flex: 1, overflowY: 'auto', padding: '24px' }

const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '0.95rem'
}