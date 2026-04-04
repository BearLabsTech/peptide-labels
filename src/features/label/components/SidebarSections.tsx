import { TextInput, SelectInput, AccordionSection, ImageUploadInput, DateField } from './FormInputs'
import { RECONSTITUTION_TYPES } from '../peptideMath'
import type { LabelModelInput } from '../labelModel'
import type { LabelFormHandlers } from '../useLabelForm'

export interface SectionProps {
    input: LabelModelInput;
    updateField: <K extends keyof LabelModelInput>(field: K, value: any) => void;
    derivedState?: { autoUnits: string; autoWater: string; autoConcentration: string; };
    handlers?: LabelFormHandlers;
}

export function CompoundSection({ input, updateField, handlers }: SectionProps) {
    return (
        <AccordionSection title="Compound">
            <TextInput label="Compound Name" value={input.compoundName} onChange={(v) => updateField('compoundName', v)} placeholder="Tirzepatide" />
            <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}><TextInput label="Vial Amount" value={input.compoundAmount} onChange={(v) => updateField('compoundAmount', v)} placeholder="20" /></div>
                <div style={{ width: '90px' }}><SelectInput label="Unit" value={input.vialUnit || 'mg'} onChange={handlers!.handleVialUnitChange} options={['mg', 'IU']} /></div>
            </div>
            <div style={{ marginTop: 8, padding: '12px', borderRadius: '6px', backgroundColor: input.isUntested ? '#fef2f2' : '#f8fafc', border: `1px solid ${input.isUntested ? '#fee2e2' : '#e2e8f0'}`, display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => updateField('isUntested', !input.isUntested)}>
                <input type="checkbox" checked={input.isUntested || false} onChange={() => { }} style={{ marginRight: 10, cursor: 'pointer' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: input.isUntested ? '#991b1b' : '#475569' }}>Mark as UNTESTED (Danger Mode)</span>
            </div>
        </AccordionSection>
    )
}

export function SourceSection({ input, updateField }: SectionProps) {
    return (
        <AccordionSection title="Source">
            <TextInput label="Vendor Name" value={input.vendorName} onChange={v => updateField('vendorName', v)} placeholder="e.g. Bear Labs" />
            <TextInput label="Group Buy" value={input.groupBuyName} onChange={v => updateField('groupBuyName', v)} placeholder="e.g. Alpha Testing" />
            <TextInput label="Batch / Lot Number" value={input.batchNumber} onChange={v => updateField('batchNumber', v)} placeholder="e.g. BL-2026" />
            <DateField
                label="Batch Date"
                value={input.batchDate || ''}
                onChange={v => updateField('batchDate', v)}
                isFreeText={!!input.batchDateIsFreeText}
                onFreeTextToggle={v => updateField('batchDateIsFreeText', v)}
            />
        </AccordionSection>
    )
}

export function ReconstitutionSection({ input, updateField, derivedState, handlers }: SectionProps) {
    return (
        <AccordionSection title="Reconstitution">
            <TextInput label="Water Amount (ml)" value={input.reconstitutionAmount || derivedState?.autoWater} onChange={handlers!.handleWaterChange} placeholder="2" />
            <SelectInput label="Water Type" value={input.reconstitutionType || ''} onChange={(v) => updateField('reconstitutionType', v)} options={RECONSTITUTION_TYPES} allowNone={true} />
            <TextInput label="Concentration" value={input.concentration || derivedState?.autoConcentration} disabled={true} placeholder="e.g. 10mg per ml" onChange={() => { }} />

            <DateField
                label="Reconstitution Date"
                value={input.reconstitutionDate || ''}
                onChange={v => updateField('reconstitutionDate', v)}
                isFreeText={!!input.reconstitutionDateIsFreeText}
                onFreeTextToggle={v => updateField('reconstitutionDateIsFreeText', v)}
            />
        </AccordionSection>
    )
}

export function ProtocolSection({ input, updateField, derivedState, handlers }: SectionProps) {
    const measureUnitOptions = input.vialUnit === 'IU' ? ['IU'] : ['mcg', 'mg'];
    return (
        <AccordionSection title="Protocol">
            <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}><TextInput label="Protocol Amount" value={input.protocolAmount} onChange={handlers!.handleProtocolAmountChange} placeholder="500" /></div>
                <div style={{ width: '90px' }}><SelectInput label="Unit" value={input.measureUnit || 'mcg'} onChange={(v) => updateField('measureUnit', v)} options={measureUnitOptions} /></div>
            </div>
            <TextInput label="Draw Volume (Units)" value={input.protocolUnits || derivedState?.autoUnits} onChange={handlers!.handleDrawVolumeChange} placeholder="e.g. 10" />
            <TextInput label="Frequency" value={input.protocolFrequency} onChange={(v) => updateField('protocolFrequency', v)} placeholder="Weekly" />
        </AccordionSection>
    )
}

export function MediaSection({ input, updateField }: SectionProps) {
    return (
        <AccordionSection title="Personalization">
            <SelectInput
                label="Date Format"
                value={input.dateFormat || 'YYYYMMDD'}
                onChange={v => updateField('dateFormat', v)}
                options={['YYYYMMDD', 'YYYY-MM-DD', 'MM/DD/YYYY', 'DD/MM/YYYY']}
            />
            <ImageUploadInput label="Logo Image" currentImage={input.customImage} onChange={(b64) => updateField('customImage', b64)} />
        </AccordionSection>
    )
}

export function CoaSection({ input, updateField }: SectionProps) {
    return (
        <AccordionSection title="Certificates of Analysis">
            <TextInput label="Vendor COA Link" value={input.vendorCoa} onChange={(v) => updateField('vendorCoa', v)} placeholder="https://..." />
            <TextInput label="Group Buy COA Link" value={input.groupBuyCoa} onChange={(v) => updateField('groupBuyCoa', v)} placeholder="https://..." />
            <TextInput label="Test Group COA Link" value={input.testGroupCoa} onChange={(v) => updateField('testGroupCoa', v)} placeholder="https://..." />
            <TextInput label="My COA Link" value={input.myCoa} onChange={(v) => updateField('myCoa', v)} placeholder="https://..." />

            <div style={{ marginTop: '24px', borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '12px' }}>Custom COAs</div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ flex: 1 }}><TextInput label="COA 1 Name" value={input.customCoa1Name} onChange={v => updateField('customCoa1Name', v)} placeholder="Name" /></div>
                    <div style={{ flex: 2 }}><TextInput label="COA 1 Link" value={input.customCoa1Link} onChange={v => updateField('customCoa1Link', v)} placeholder="https://..." /></div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ flex: 1 }}><TextInput label="COA 2 Name" value={input.customCoa2Name} onChange={v => updateField('customCoa2Name', v)} placeholder="Name" /></div>
                    <div style={{ flex: 2 }}><TextInput label="COA 2 Link" value={input.customCoa2Link} onChange={v => updateField('customCoa2Link', v)} placeholder="https://..." /></div>
                </div>
            </div>
        </AccordionSection>
    )
}