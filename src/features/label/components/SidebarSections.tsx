import { TextInput, SelectInput, AccordionSection, ImageUploadInput, DateField } from './FormInputs'
import { RECONSTITUTION_TYPES } from '../peptideMath'
import type { LabelModelInput } from '../labelModel'
import type { LabelFormHandlers } from '../useLabelForm'

export interface SectionProps {
    input: LabelModelInput;
    updateField: <K extends keyof LabelModelInput>(field: K, value: any) => void;
    derivedState?: { autoUnits: string; autoWater: string; autoConcentration: string; };
    handlers: LabelFormHandlers;

    selectedDate: string;
    updateDateFromPicker: (value: string) => void;
    isFreeTextDate: boolean;
    setIsFreeTextDate: (value: boolean) => void;
}

export function CompoundSection({ input, updateField, handlers }: SectionProps) {
    return (
        <AccordionSection title="Compound">
            <TextInput label="Compound Name" value={input.compoundName} onChange={(v) => updateField('compoundName', v)} placeholder="Tirzepatide" />
            <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}><TextInput label="Vial Amount" value={input.compoundAmount} onChange={(v) => updateField('compoundAmount', v)} placeholder="20" /></div>
                <div style={{ width: '90px' }}><SelectInput label="Unit" value={input.vialUnit || 'mg'} onChange={handlers.handleVialUnitChange} options={['mg', 'IU']} /></div>
            </div>
            <div style={{ marginTop: 8, padding: '12px', borderRadius: '6px', backgroundColor: input.isUntested ? '#fef2f2' : '#f8fafc', border: `1px solid ${input.isUntested ? '#fee2e2' : '#e2e8f0'}`, display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => updateField('isUntested', !input.isUntested)}>
                <input type="checkbox" checked={input.isUntested || false} onChange={() => { }} style={{ marginRight: 10, cursor: 'pointer' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: input.isUntested ? '#991b1b' : '#475569' }}>Mark as UNTESTED (Danger Mode)</span>
            </div>
        </AccordionSection>
    )
}

export function ReconstitutionSection({
    input, updateField, derivedState, handlers,
    selectedDate, updateDateFromPicker, isFreeTextDate, setIsFreeTextDate
}: SectionProps) {
    return (
        <AccordionSection title="Reconstitution">
            <TextInput label="Water Amount (ml)" value={input.reconstitutionAmount || derivedState?.autoWater} onChange={handlers.handleWaterChange} placeholder="2" />
            <SelectInput label="Water Type" value={input.reconstitutionType || ''} onChange={(v) => updateField('reconstitutionType', v)} options={RECONSTITUTION_TYPES} allowNone={true} />
            <TextInput label="Concentration" value={input.concentration || derivedState?.autoConcentration} disabled={true} placeholder="e.g. 10mg per ml" onChange={() => { }} />

            <DateField
                input={input}
                updateField={updateField}
                selectedDate={selectedDate}
                updateDateFromPicker={updateDateFromPicker}
                isFreeTextDate={isFreeTextDate}
                setIsFreeTextDate={setIsFreeTextDate}
            />
        </AccordionSection>
    )
}

export function ProtocolSection({ input, updateField, derivedState, handlers }: SectionProps) {
    const doseUnitOptions = input.vialUnit === 'IU' ? ['IU'] : ['mcg', 'mg'];
    return (
        <AccordionSection title="Protocol">
            <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}><TextInput label="Dose Amount" value={input.protocolAmount} onChange={handlers.handleDoseChange} placeholder="500" /></div>
                <div style={{ width: '90px' }}><SelectInput label="Unit" value={input.doseUnit || 'mcg'} onChange={(v) => updateField('doseUnit', v)} options={doseUnitOptions} /></div>
            </div>
            <TextInput label="Draw Volume (Units)" value={input.protocolUnits || derivedState?.autoUnits} onChange={handlers.handleDrawVolumeChange} placeholder="e.g. 10" />
            <TextInput label="Frequency" value={input.protocolFrequency} onChange={(v) => updateField('protocolFrequency', v)} placeholder="Weekly" />
        </AccordionSection>
    )
}

export function MediaSection({ input, updateField }: SectionProps) {
    return (
        <AccordionSection title="Personalization">
            <ImageUploadInput label="Mascot Image" currentImage={input.customImage} onChange={(b64) => updateField('customImage', b64)} />
        </AccordionSection>
    )
}

export function CoaSection({ input, updateField }: SectionProps) {
    return (
        <AccordionSection title="Certificates of Analysis (Optional)">
            <TextInput label="Vendor COA Link" value={input.vendorCoa} onChange={(v) => updateField('vendorCoa', v)} placeholder="https://..." />
            <TextInput label="Group COA Link" value={input.groupCoa} onChange={(v) => updateField('groupCoa', v)} placeholder="https://..." />
            <TextInput label="My COA Link" value={input.myCoa} onChange={(v) => updateField('myCoa', v)} placeholder="https://..." />
        </AccordionSection>
    )
}