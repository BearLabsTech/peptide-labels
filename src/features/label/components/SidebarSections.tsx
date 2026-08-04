import { TextInput, SelectInput, AccordionSection, SubAccordionSection, ImageUploadInput, DateField, ToggleInput } from './FormInputs'
import { ColumnWidthSlider } from './ColumnWidthSlider'
import {
    CALCULATOR_MODE_OPTIONS,
    calculatorModeFromLabel,
    calculatorModeLabel,
} from '../calculatorModeSwitch'
import { SyringeAssist } from '../syringe/SyringeAssist'
import type { LabelFieldUpdater, LabelModelInput } from '../labelModel'
import { LOGO_COLUMN_WIDTH, QR_COLUMN_WIDTH } from '../labelLayoutConstants'
import { TEST_STATUS_OPTIONS, TEST_TYPES, type TestResultStatus } from '../testIndicators'
import type { LabelFormHandlers } from '../useLabelForm'
import { VialCapacityWarning } from './VialCapacityWarning'
import {
    updateTestResult,
    sidebarSectionsViewModel,
    type SidebarSectionsDerivedState,
} from './sidebarSectionsViewModel'
import { COA_FIELD_LABELS, FIELD_LABELS } from '../uiStrings'
import { inputStyle } from './formStyles'

export interface SectionProps {
    input: LabelModelInput;
    updateField: LabelFieldUpdater;
    derivedState?: SidebarSectionsDerivedState;
    handlers?: LabelFormHandlers;
    vialCapacityMl?: number;
}

export function CompoundSection({ input, updateField, handlers }: SectionProps) {
    return (
        <AccordionSection title="Compound" defaultOpen={true}>
            <TextInput label="Compound Name" value={input.compoundName} onChange={(v) => updateField('compoundName', v)} placeholder="Tirzepatide" />
            <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}><TextInput label={FIELD_LABELS.compoundAmount} value={input.compoundAmount} onChange={handlers!.handleCompoundAmountChange} placeholder="20" /></div>
                <div style={{ width: '90px' }}><SelectInput label="Unit" value={input.vialUnit || 'mg'} onChange={handlers!.handleVialUnitChange} options={['mg', 'IU']} /></div>
            </div>
            <label style={{ marginTop: 8, padding: '12px', borderRadius: 'var(--radius-sm)', backgroundColor: input.isUntested ? 'var(--color-danger-bg)' : 'var(--color-background)', border: `1px solid ${input.isUntested ? 'var(--color-danger-border)' : 'var(--color-border)'}`, display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input type="checkbox" checked={input.isUntested || false} onChange={(event) => updateField('isUntested', event.target.checked)} style={{ marginRight: 10, cursor: 'pointer' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: input.isUntested ? 'var(--color-danger-text)' : 'var(--color-text-muted)' }}>Mark as UNTESTED (Danger Mode)</span>
            </label>
        </AccordionSection>
    )
}

export function SourceSection({ input, updateField }: SectionProps) {
    const vm = sidebarSectionsViewModel({ input }).source
    return (
        <AccordionSection title="Source">
            <ToggleInput label="Print Source on Label" checked={vm.isSectionActive} onChange={v => updateField('showSource', v)} />
            <TextInput label="Vendor Name" value={input.vendorName} onChange={v => updateField('vendorName', v)} placeholder="e.g. Bear Labs" printToggle={{ visible: input.showVendor !== false, onChange: v => updateField('showVendor', v), disabled: !vm.isSectionActive }} />
            <TextInput label="Group Buy" value={input.groupBuyName} onChange={v => updateField('groupBuyName', v)} placeholder="e.g. Alpha Testing" printToggle={{ visible: input.showGroup !== false, onChange: v => updateField('showGroup', v), disabled: !vm.isSectionActive }} />
            <TextInput label="Batch / Lot Number" value={input.batchNumber} onChange={v => updateField('batchNumber', v)} placeholder="e.g. BL-2026" printToggle={{ visible: input.showBatch !== false, onChange: v => updateField('showBatch', v), disabled: !vm.isSectionActive }} />
            <DateField label="Batch Date" value={input.batchDate || ''} onChange={v => updateField('batchDate', v)} isFreeText={!!input.batchDateIsFreeText} onFreeTextToggle={v => updateField('batchDateIsFreeText', v)} />
        </AccordionSection>
    )
}

export function ReconstitutionSection({
    input,
    updateField,
    derivedState,
    handlers,
    vialCapacityMl = 3,
}: SectionProps) {
    const vm = sidebarSectionsViewModel({ input, derivedState, vialCapacityMl }).reconstitution
    return (
        <AccordionSection title="Reconstitution">
            <ToggleInput label="Print Reconstitution on Label" checked={vm.isSectionActive} onChange={v => updateField('showReconstitution', v)} />
            <SelectInput
                label="Calculator assist"
                value={calculatorModeLabel(vm.solveMode)}
                onChange={(label) => handlers!.handleCalculatorModeChange(calculatorModeFromLabel(label))}
                options={[...CALCULATOR_MODE_OPTIONS]}
            />
            {vm.showRoundConcentrationHint && (
                <>
                    <TextInput
                        label={`Target concentration (${vm.concentrationUnitLabel})`}
                        value={vm.targetConcentration}
                        onChange={handlers!.handleTargetConcentrationChange}
                        placeholder="e.g. 10"
                    />
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: -8, marginBottom: 12, lineHeight: 1.4 }}>
                        Enter your target {vm.concentrationUnitLabel}. The app fills in water volume and draw units from your vial and protocol amount.
                    </div>
                </>
            )}
            {vm.showTargetUnitsHint && (
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 12, lineHeight: 1.4 }}>
                    Enter your protocol amount and draw units in the Protocol section. The app fills in water volume for you.
                </div>
            )}
            <TextInput label={FIELD_LABELS.waterVolume} value={vm.waterAmount} onChange={handlers!.handleWaterChange} placeholder="2" disabled={vm.waterDisabled} printToggle={{ visible: input.showWater !== false, onChange: v => updateField('showWater', v), disabled: !vm.isSectionActive }} />
            {vm.showVialCapacityWarning && (
                <VialCapacityWarning vialCapacityMl={vialCapacityMl} />
            )}
            <SelectInput label="Water Type" value={input.reconstitutionType || ''} onChange={(v) => updateField('reconstitutionType', v)} options={vm.reconstitutionTypeOptions} allowNone={true} />
            <TextInput label="Concentration" value={vm.concentrationDisplay} disabled={true} placeholder="e.g. 10mg per ml" onChange={() => { }} printToggle={{ visible: input.showConcentration !== false, onChange: v => updateField('showConcentration', v), disabled: !vm.isSectionActive }} />
            <DateField label="Reconstitution Date" value={input.reconstitutionDate || ''} onChange={v => updateField('reconstitutionDate', v)} isFreeText={!!input.reconstitutionDateIsFreeText} onFreeTextToggle={v => updateField('reconstitutionDateIsFreeText', v)} printToggle={{ visible: input.showReconDate !== false, onChange: v => updateField('showReconDate', v), disabled: !vm.isSectionActive }} />
        </AccordionSection>
    )
}

export function ProtocolSection({ input, updateField, derivedState, handlers }: SectionProps) {
    const vm = sidebarSectionsViewModel({ input, derivedState }).protocol

    return (
        <AccordionSection title="Protocol">
            <ToggleInput label="Print Protocol on Label" checked={vm.isSectionActive} onChange={v => updateField('showProtocol', v)} />
            <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}><TextInput label="Protocol Amount" value={input.protocolAmount} onChange={handlers!.handleProtocolAmountChange} placeholder="500" printToggle={{ visible: input.showProtocolAmount !== false, onChange: v => updateField('showProtocolAmount', v), disabled: !vm.isSectionActive }} /></div>
                <div style={{ width: '90px' }}><SelectInput label="Unit" value={input.measureUnit || 'mg'} onChange={handlers!.handleMeasureUnitChange} options={vm.measureUnitOptions} /></div>
            </div>

            <TextInput label={FIELD_LABELS.drawVolume} value={vm.drawLabel} onChange={handlers!.handleProtocolUnitsChange} placeholder="e.g. 10" disabled={vm.drawUnitsDisabled} printToggle={{ visible: input.showProtocolUnits !== false, onChange: v => updateField('showProtocolUnits', v), disabled: !vm.isSectionActive }} />

            <TextInput label="Frequency" value={input.protocolFrequency} onChange={(v) => updateField('protocolFrequency', v)} placeholder="Weekly" printToggle={{ visible: input.showProtocolFrequency !== false, onChange: v => updateField('showProtocolFrequency', v), disabled: !vm.isSectionActive }} />

            {vm.showSyringeAssist && (
                <div style={{ marginTop: 12 }}>
                    <SyringeAssist
                        syringeCapacityMl={vm.syringeCapacityMl}
                        onCapacityChange={(next) => updateField('syringeCapacityMl', next)}
                        drawUnitsLabel={vm.drawLabel}
                    />
                </div>
            )}
        </AccordionSection>
    )
}

export function MediaSection({ input, updateField }: SectionProps) {
    return (
        <AccordionSection title="Personalization">
            <SelectInput label="Date Format" value={input.dateFormat || 'YYYYMMDD'} onChange={v => updateField('dateFormat', v)} options={['YYYYMMDD', 'YYYY-MM-DD', 'MM/DD/YYYY', 'DD/MM/YYYY']} />
            <ImageUploadInput label="Logo Image" currentImage={input.customImage} onChange={(b64) => updateField('customImage', b64)} />
            {input.customImage && (
                <ColumnWidthSlider
                    label="Logo column width"
                    value={input.logoColumnWidthPercent}
                    onChange={(v) => updateField('logoColumnWidthPercent', v)}
                    bounds={LOGO_COLUMN_WIDTH}
                />
            )}
        </AccordionSection>
    )
}

export function TestingSection({ input, updateField }: SectionProps) {
    const vm = sidebarSectionsViewModel({ input }).testing

    return (
        <AccordionSection title="Testing">
            <SubAccordionSection title={vm.indicatorSubTitle} defaultOpen={vm.showTestIndicators}>
                <ToggleInput
                    label="Print test result indicators on label"
                    checked={vm.showTestIndicators}
                    onChange={(v) => updateField('showTestIndicators', v)}
                />
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 12, marginTop: -4, lineHeight: 1.4 }}>
                    Each test defaults to Do Not Print. Choose Pass, Fail, or Not Run only for checks you want on the label.
                </div>
                {TEST_TYPES.map((type) => (
                    <div key={type} style={{ marginBottom: 16 }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: 6 }}>{type}</label>
                        <select
                            value={vm.testResultFor(type)}
                            onChange={(e) => updateTestResult(updateField, type, e.target.value as TestResultStatus)}
                            style={{ ...inputStyle, cursor: 'pointer' }}
                        >
                            {TEST_STATUS_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </div>
                ))}
            </SubAccordionSection>

            <SubAccordionSection title={vm.coaSubTitle} defaultOpen={vm.showCoaQr && vm.qrCount > 0}>
                <ToggleInput
                    label="Print COA QR codes on label"
                    checked={vm.showCoaQr}
                    onChange={(v) => updateField('showCoaQr', v)}
                />
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 12, marginTop: -4, lineHeight: 1.4 }}>
                    COA links are saved here either way; QR codes print only when the toggle above is on.
                </div>

                <TextInput label={COA_FIELD_LABELS.vendor} value={input.vendorCoa} onChange={(v) => updateField('vendorCoa', v)} placeholder="https://..." />
                <TextInput label={COA_FIELD_LABELS.groupBuy} value={input.groupBuyCoa} onChange={(v) => updateField('groupBuyCoa', v)} placeholder="https://..." />
                <TextInput label={COA_FIELD_LABELS.testGroup} value={input.testGroupCoa} onChange={(v) => updateField('testGroupCoa', v)} placeholder="https://..." />
                <TextInput label={COA_FIELD_LABELS.my} value={input.myCoa} onChange={(v) => updateField('myCoa', v)} placeholder="https://..." />

                <SubAccordionSection title="Custom COAs">
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                        <div style={{ flex: 1 }}><TextInput label="COA 1 Name" value={input.customCoa1Name} onChange={v => updateField('customCoa1Name', v)} placeholder="Name" /></div>
                        <div style={{ flex: 2 }}><TextInput label="COA 1 Link" value={input.customCoa1Link} onChange={v => updateField('customCoa1Link', v)} placeholder="https://..." /></div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <div style={{ flex: 1 }}><TextInput label="COA 2 Name" value={input.customCoa2Name} onChange={v => updateField('customCoa2Name', v)} placeholder="Name" /></div>
                        <div style={{ flex: 2 }}><TextInput label="COA 2 Link" value={input.customCoa2Link} onChange={v => updateField('customCoa2Link', v)} placeholder="https://..." /></div>
                    </div>
                </SubAccordionSection>
            </SubAccordionSection>

            {vm.showTestingColumn && (
                <ColumnWidthSlider
                    label="Testing column width"
                    value={input.qrColumnWidthPercent}
                    onChange={(v) => updateField('qrColumnWidthPercent', v)}
                    bounds={QR_COLUMN_WIDTH}
                />
            )}
        </AccordionSection>
    )
}
