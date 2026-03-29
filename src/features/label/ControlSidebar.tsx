import React from 'react'
import type { LabelModelInput } from './labelModel'
import { calculateDrawVolume, calculateReverseWater, RECONSTITUTION_TYPES } from './peptideMath'

export interface ControlSidebarProps {
    input: LabelModelInput
    updateField: <K extends keyof LabelModelInput>(field: K, value: any) => void
    selectedDate: string
    updateDateFromPicker: (value: string) => void
    isFreeTextDate: boolean
    setIsFreeTextDate: (value: boolean) => void
}

export function ControlSidebar(props: ControlSidebarProps) {
    const { input } = props;

    // --- DERIVED STATE ENGINE ---
    const vial = parseFloat(input.compoundAmount || '0');
    const water = parseFloat(input.reconstitutionAmount || '0');
    const dose = parseFloat(input.protocolAmount || '0');

    const unitsStr = input.protocolUnits || '';
    const unitsMatch = unitsStr.match(/[\d.]+/);
    const units = unitsMatch ? parseFloat(unitsMatch[0]) : 0;

    const safeVialUnit = (input.vialUnit || 'mg') as 'mg' | 'IU';
    const safeDoseUnit = (safeVialUnit === 'IU' ? 'IU' : (input.doseUnit || 'mcg')) as 'mg' | 'mcg' | 'IU';

    let autoUnits = '';
    let autoWater = '';
    let autoConcentration = '';

    if (water > 0 && vial > 0 && dose > 0) {
        const res = calculateDrawVolume({ vialAmount: vial, vialUnit: safeVialUnit, waterMl: water, doseAmount: dose, doseUnit: safeDoseUnit });
        if (res) {
            autoUnits = `${res.drawUnits} units`;
            const conc = Math.round((vial / water) * 100) / 100;
            autoConcentration = `${conc}${safeVialUnit === 'IU' ? 'IU per ml' : 'mg per ml'}`;
        }
    } else if (units > 0 && vial > 0 && dose > 0) {
        const resWater = calculateReverseWater({ vialAmount: vial, vialUnit: safeVialUnit, drawUnits: units, doseAmount: dose, doseUnit: safeDoseUnit });
        if (resWater) {
            autoWater = resWater.toString();
            const conc = Math.round((vial / resWater) * 100) / 100;
            autoConcentration = `${conc}${safeVialUnit === 'IU' ? 'IU per ml' : 'mg per ml'}`;
        }
    }

    const derivedState = { autoUnits, autoWater, autoConcentration };
    const smartProps = { ...props, derivedState };

    return (
        <div className="sidebar-panel">
            <SidebarHeader />
            <div className="sidebar-scroll-area">
                <CompoundSection {...smartProps} />
                <ReconstitutionSection {...smartProps} />
                <ProtocolSection {...smartProps} />
                <MediaSection {...smartProps} />
                <CoaSection {...smartProps} />
            </div>
        </div>
    )
}

function CompoundSection({ input, updateField }: ControlSidebarProps & { derivedState: any }) {
    const handleVialUnitChange = (unit: string) => {
        updateField('vialUnit', unit);
        if (unit === 'IU') updateField('doseUnit', 'IU');
        else if (unit === 'mg' && input.doseUnit === 'IU') updateField('doseUnit', 'mcg');
    }

    return (
        <div style={{ marginBottom: 24 }}>
            <SectionTitle title="Compound" />
            <TextInput label="Compound Name" value={input.compoundName} onChange={v => updateField('compoundName', v)} placeholder="Tirzepatide" />
            <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                    <TextInput label="Vial Amount" value={input.compoundAmount} onChange={v => updateField('compoundAmount', v)} placeholder="20" />
                </div>
                <div style={{ width: '90px' }}>
                    <SelectInput label="Unit" value={input.vialUnit || 'mg'} onChange={handleVialUnitChange} options={['mg', 'IU']} />
                </div>
            </div>

            <div style={{
                marginTop: 16, padding: '12px', borderRadius: '6px',
                backgroundColor: input.isUntested ? '#fef2f2' : '#f8fafc',
                border: `1px solid ${input.isUntested ? '#fee2e2' : '#e2e8f0'}`,
                display: 'flex', alignItems: 'center', cursor: 'pointer', transition: 'all 0.2s ease'
            }} onClick={() => updateField('isUntested', !input.isUntested)}>
                <input type="checkbox" checked={input.isUntested || false} onChange={() => { }} style={{ marginRight: 10, cursor: 'pointer' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: input.isUntested ? '#991b1b' : '#475569' }}>
                    Mark as UNTESTED (Danger Mode)
                </span>
            </div>
        </div>
    )
}

function ReconstitutionSection({ input, updateField, derivedState, ...props }: ControlSidebarProps & { derivedState: any }) {
    return (
        <div style={{ marginBottom: 24 }}>
            <SectionTitle title="Reconstitution" />
            <TextInput
                label="Water Amount (ml)"
                value={input.reconstitutionAmount || derivedState.autoWater}
                onChange={v => {
                    updateField('reconstitutionAmount', v);
                    if (v) updateField('protocolUnits', ''); // Wipe units to force forward math
                }}
                placeholder="2"
            />
            <SelectInput label="Water Type" value={input.reconstitutionType || ''} onChange={v => updateField('reconstitutionType', v)} options={RECONSTITUTION_TYPES} allowNone={true} />
            <TextInput label="Concentration (Auto-calculated)" value={input.concentration || derivedState.autoConcentration} onChange={() => { }} placeholder="e.g. 10mg per ml" disabled={true} />
            <DateField input={input} updateField={updateField} {...props} />
        </div>
    )
}

function ProtocolSection({ input, updateField, derivedState }: ControlSidebarProps & { derivedState: any }) {
    const doseUnitOptions = input.vialUnit === 'IU' ? ['IU'] : ['mcg', 'mg'];

    return (
        <div style={{ marginBottom: 24 }}>
            <SectionTitle title="Protocol" />
            <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                    <TextInput
                        label="Dose Amount"
                        value={input.protocolAmount}
                        onChange={v => {
                            updateField('protocolAmount', v);
                            updateField('protocolUnits', ''); // Wipe units so math stays aligned to Water
                        }}
                        placeholder="500"
                    />
                </div>
                <div style={{ width: '90px' }}>
                    <SelectInput label="Unit" value={input.doseUnit || 'mcg'} onChange={v => updateField('doseUnit', v)} options={doseUnitOptions} />
                </div>
            </div>

            <TextInput
                label="Draw Volume (Units)"
                value={input.protocolUnits || derivedState.autoUnits}
                onChange={v => {
                    updateField('protocolUnits', v);
                    if (v) updateField('reconstitutionAmount', ''); // Wipe water to force reverse math
                }}
                placeholder="e.g. 10"
            />
            <TextInput label="Frequency" value={input.protocolFrequency} onChange={v => updateField('protocolFrequency', v)} placeholder="Weekly" />
        </div>
    )
}

function MediaSection({ input, updateField }: ControlSidebarProps & { derivedState: any }) {
    return (
        <div style={{ marginBottom: 24 }}>
            <SectionTitle title="Personalization" />
            <ImageUploadInput label="Mascot Image" currentImage={input.customImage} onChange={base64 => updateField('customImage', base64)} />
        </div>
    )
}

function CoaSection({ input, updateField }: ControlSidebarProps & { derivedState: any }) {
    return (
        <div style={{ marginBottom: 24 }}>
            <SectionTitle title="Certificates of Analysis (Optional)" />
            <TextInput label="Vendor COA Link" value={input.vendorCoa} onChange={v => updateField('vendorCoa', v)} placeholder="https://..." />
            <TextInput label="Group COA Link" value={input.groupCoa} onChange={v => updateField('groupCoa', v)} placeholder="https://..." />
            <TextInput label="My COA Link" value={input.myCoa} onChange={v => updateField('myCoa', v)} placeholder="https://..." />
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

function SelectInput({ label, value, onChange, options, allowNone }: { label: string, value: string, onChange: (v: string) => void, options: string[] | readonly string[], allowNone?: boolean }) {
    return (
        <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#555', marginBottom: 4 }}>{label}</label>
            <select value={value} onChange={e => onChange(e.target.value)} style={{ ...inputStyle, backgroundColor: 'white', cursor: 'pointer' }}>
                {allowNone && <option value="">(None)</option>}
                {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
        </div>
    )
}

function TextInput({ label, value, onChange, placeholder, disabled }: { label: string, value?: string, onChange: (v: string) => void, placeholder: string, disabled?: boolean }) {
    return (
        <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#555', marginBottom: 4 }}>{label}</label>
            <input
                value={value ?? ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
                style={{ ...inputStyle, backgroundColor: disabled ? '#f1f5f9' : 'white', color: disabled ? '#64748b' : 'inherit', cursor: disabled ? 'not-allowed' : 'text', borderColor: disabled ? '#e2e8f0' : '#ccc' }}
            />
        </div>
    )
}

function ImageUploadInput({ label, onChange, currentImage }: { label: string, onChange: (base64: string) => void, currentImage?: string }) {
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onloadend = () => onChange(reader.result as string)
        reader.readAsDataURL(file)
    }

    return (
        <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#555', marginBottom: 2 }}>{label}</label>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 8 }}>Ideal ratio: 1:2 (Portrait) or 1:1 (Square)</div>
            <input type="file" accept="image/*" onChange={handleFileChange} style={{ ...inputStyle, padding: '4px', cursor: 'pointer', backgroundColor: 'white' }} />
            {currentImage && (
                <button onClick={() => onChange('')} style={{ marginTop: 8, padding: '6px 12px', fontSize: '0.8rem', cursor: 'pointer', backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #f87171', borderRadius: '4px' }}>
                    Remove Image
                </button>
            )}
        </div>
    )
}

function DateField({ input, updateField, selectedDate, updateDateFromPicker, isFreeTextDate, setIsFreeTextDate }: ControlSidebarProps) {
    return (
        <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#555' }}>Reconstitution Date</label>
                <label style={{ fontSize: '0.75rem', color: '#666', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input type="checkbox" checked={isFreeTextDate} onChange={e => setIsFreeTextDate(e.target.checked)} style={{ marginRight: 4 }} /> Free text
                </label>
            </div>
            {isFreeTextDate ? (
                <input value={input.reconstitutionDate ?? ''} onChange={e => updateField('reconstitutionDate', e.target.value)} placeholder="YYYYMMDD" style={inputStyle} />
            ) : (
                <input type="date" value={selectedDate} onChange={e => updateDateFromPicker(e.target.value)} style={inputStyle} />
            )}
        </div>
    )
}

const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '0.95rem', boxSizing: 'border-box'
}