import { TextInput, SelectInput, AccordionSection, SubAccordionSection, ImageUploadInput, DateField, ToggleInput } from './FormInputs'
import { ColumnWidthSlider } from './ColumnWidthSlider'
import { RECONSTITUTION_TYPES } from '../peptideMath'
import {
    CALCULATOR_MODE_OPTIONS,
    calculatorModeFromLabel,
    calculatorModeLabel,
    concentrationUnitLabel,
    displayDrawUnits,
    displayWaterAmount,
} from '../calculatorModeSwitch'
import { buildQrCodes } from '../coaLinks'
import type { LabelModelInput } from '../labelModel'
import { LOGO_COLUMN_WIDTH, QR_COLUMN_WIDTH } from '../labelLayoutConstants'
import {
    TEST_RESULT_FIELDS,
    TEST_STATUS_OPTIONS,
    TEST_TYPES,
    countPrintableTestResults,
    getTestResult,
    hasTestingColumnContent,
    type TestResultStatus,
    type TestType,
} from '../testIndicators'
import type { LabelFormHandlers } from '../useLabelForm'

export interface SectionProps {
    input: LabelModelInput;
    updateField: <K extends keyof LabelModelInput>(field: K, value: any) => void;
    derivedState?: { autoUnits: string; autoWater: string; autoConcentration: string; };
    handlers?: LabelFormHandlers;
}

export function CompoundSection({ input, updateField, handlers }: SectionProps) {
    return (
        <AccordionSection title="Compound" defaultOpen={true}>
            <TextInput label="Compound Name" value={input.compoundName} onChange={(v) => updateField('compoundName', v)} placeholder="Tirzepatide" />
            <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}><TextInput label="Vial Amount" value={input.compoundAmount} onChange={handlers!.handleCompoundAmountChange} placeholder="20" /></div>
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
    const isSectionActive = input.showSource !== false;
    return (
        <AccordionSection title="Source">
            <ToggleInput label="Print Source on Label" checked={isSectionActive} onChange={v => updateField('showSource', v)} />
            <TextInput label="Vendor Name" value={input.vendorName} onChange={v => updateField('vendorName', v)} placeholder="e.g. Bear Labs" printToggle={{ visible: input.showVendor !== false, onChange: v => updateField('showVendor', v), disabled: !isSectionActive }} />
            <TextInput label="Group Buy" value={input.groupBuyName} onChange={v => updateField('groupBuyName', v)} placeholder="e.g. Alpha Testing" printToggle={{ visible: input.showGroup !== false, onChange: v => updateField('showGroup', v), disabled: !isSectionActive }} />
            <TextInput label="Batch / Lot Number" value={input.batchNumber} onChange={v => updateField('batchNumber', v)} placeholder="e.g. BL-2026" printToggle={{ visible: input.showBatch !== false, onChange: v => updateField('showBatch', v), disabled: !isSectionActive }} />
            <DateField label="Batch Date" value={input.batchDate || ''} onChange={v => updateField('batchDate', v)} isFreeText={!!input.batchDateIsFreeText} onFreeTextToggle={v => updateField('batchDateIsFreeText', v)} />
        </AccordionSection>
    )
}

export function ReconstitutionSection({ input, updateField, derivedState, handlers }: SectionProps) {
    const isSectionActive = input.showReconstitution !== false;
    const solveMode = input.calculatorSolveMode || 'standard';
    const waterDisabled = solveMode !== 'standard';
    const concUnitLabel = concentrationUnitLabel(input.vialUnit);
    return (
        <AccordionSection title="Reconstitution">
            <ToggleInput label="Print Reconstitution on Label" checked={isSectionActive} onChange={v => updateField('showReconstitution', v)} />
            <SelectInput
                label="Calculator assist"
                value={calculatorModeLabel(solveMode)}
                onChange={(label) => handlers!.handleCalculatorModeChange(calculatorModeFromLabel(label))}
                options={[...CALCULATOR_MODE_OPTIONS]}
            />
            {solveMode === 'round_concentration' && (
                <>
                    <TextInput
                        label={`Target concentration (${concUnitLabel})`}
                        value={input.targetConcentration || ''}
                        onChange={handlers!.handleTargetConcentrationChange}
                        placeholder="e.g. 10"
                    />
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: -8, marginBottom: 12, lineHeight: 1.4 }}>
                        Enter your target {concUnitLabel}. The app fills in water volume and draw units from your vial and protocol amount.
                    </div>
                </>
            )}
            {solveMode === 'target_units' && (
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 12, lineHeight: 1.4 }}>
                    Enter your protocol amount and draw units in the Protocol section. The app fills in water volume for you.
                </div>
            )}
            <TextInput label="Water Amount (ml)" value={displayWaterAmount(solveMode, input, derivedState)} onChange={handlers!.handleWaterChange} placeholder="2" disabled={waterDisabled} printToggle={{ visible: input.showWater !== false, onChange: v => updateField('showWater', v), disabled: !isSectionActive }} />
            <SelectInput label="Water Type" value={input.reconstitutionType || ''} onChange={(v) => updateField('reconstitutionType', v)} options={RECONSTITUTION_TYPES} allowNone={true} />
            <TextInput label="Concentration" value={input.concentration || derivedState?.autoConcentration} disabled={true} placeholder="e.g. 10mg per ml" onChange={() => { }} printToggle={{ visible: input.showConcentration !== false, onChange: v => updateField('showConcentration', v), disabled: !isSectionActive }} />
            <DateField label="Reconstitution Date" value={input.reconstitutionDate || ''} onChange={v => updateField('reconstitutionDate', v)} isFreeText={!!input.reconstitutionDateIsFreeText} onFreeTextToggle={v => updateField('reconstitutionDateIsFreeText', v)} printToggle={{ visible: input.showReconDate !== false, onChange: v => updateField('showReconDate', v), disabled: !isSectionActive }} />
        </AccordionSection>
    )
}

export function ProtocolSection({ input, updateField, derivedState, handlers }: SectionProps) {
    const isSectionActive = input.showProtocol !== false;
    const measureUnitOptions = input.vialUnit === 'IU' ? ['IU'] : ['mcg', 'mg'];
    const solveMode = input.calculatorSolveMode || 'standard';
    const drawUnitsDisabled = solveMode === 'round_concentration';

    return (
        <AccordionSection title="Protocol">
            <ToggleInput label="Print Protocol on Label" checked={isSectionActive} onChange={v => updateField('showProtocol', v)} />
            <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}><TextInput label="Protocol Amount" value={input.protocolAmount} onChange={handlers!.handleProtocolAmountChange} placeholder="500" printToggle={{ visible: input.showProtocolAmount !== false, onChange: v => updateField('showProtocolAmount', v), disabled: !isSectionActive }} /></div>
                <div style={{ width: '90px' }}><SelectInput label="Unit" value={input.measureUnit || 'mcg'} onChange={handlers!.handleMeasureUnitChange} options={measureUnitOptions} /></div>
            </div>

            <TextInput label="Draw Volume (Units)" value={displayDrawUnits(solveMode, input, derivedState)} onChange={handlers!.handleDrawVolumeChange} placeholder="e.g. 10" disabled={drawUnitsDisabled} printToggle={{ visible: input.showProtocolUnits !== false, onChange: v => updateField('showProtocolUnits', v), disabled: !isSectionActive }} />

            <TextInput label="Frequency" value={input.protocolFrequency} onChange={(v) => updateField('protocolFrequency', v)} placeholder="Weekly" printToggle={{ visible: input.showProtocolFrequency !== false, onChange: v => updateField('showProtocolFrequency', v), disabled: !isSectionActive }} />
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
    const qrCount = buildQrCodes(input).length
    const showCoaQr = input.showCoaQr !== false
    const showTestIndicators = input.showTestIndicators === true
    const showTestingColumn = hasTestingColumnContent(input, qrCount)
    const printableTestCount = countPrintableTestResults(input)
    const indicatorSubTitle = printableTestCount > 0
        ? `Test result indicators (${printableTestCount} selected)`
        : 'Test result indicators'
    const coaSubTitle = qrCount > 0 ? `COA links (${qrCount} saved)` : 'COA links'

    function updateTestResult(type: TestType, status: TestResultStatus) {
        const field = TEST_RESULT_FIELDS[type]
        updateField(field, status)
    }

    return (
        <AccordionSection title="Testing">
            <SubAccordionSection title={indicatorSubTitle} defaultOpen={showTestIndicators}>
                <ToggleInput
                    label="Print test result indicators on label"
                    checked={showTestIndicators}
                    onChange={(v) => updateField('showTestIndicators', v)}
                />
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 12, marginTop: -4, lineHeight: 1.4 }}>
                    Each test defaults to Do Not Print. Choose Pass, Fail, or Not Run only for checks you want on the label.
                </div>
                {TEST_TYPES.map((type) => (
                    <div key={type} style={{ marginBottom: 16 }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: 6 }}>{type}</label>
                        <select
                            value={getTestResult(input, type)}
                            onChange={(e) => updateTestResult(type, e.target.value as TestResultStatus)}
                            style={{
                                width: '100%', padding: '10px 12px', border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-sm)', fontSize: '1rem', boxSizing: 'border-box',
                                color: 'var(--color-text-main)', backgroundColor: 'var(--color-surface)', cursor: 'pointer',
                            }}
                        >
                            {TEST_STATUS_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </div>
                ))}
            </SubAccordionSection>

            <SubAccordionSection title={coaSubTitle} defaultOpen={showCoaQr && qrCount > 0}>
                <ToggleInput
                    label="Print COA QR codes on label"
                    checked={showCoaQr}
                    onChange={(v) => updateField('showCoaQr', v)}
                />
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 12, marginTop: -4, lineHeight: 1.4 }}>
                    COA links are saved here either way; QR codes print only when the toggle above is on.
                </div>

                <TextInput label="Vendor COA Link" value={input.vendorCoa} onChange={(v) => updateField('vendorCoa', v)} placeholder="https://..." />
                <TextInput label="Group Buy COA Link" value={input.groupBuyCoa} onChange={(v) => updateField('groupBuyCoa', v)} placeholder="https://..." />
                <TextInput label="Test Group COA Link" value={input.testGroupCoa} onChange={(v) => updateField('testGroupCoa', v)} placeholder="https://..." />
                <TextInput label="My COA Link" value={input.myCoa} onChange={(v) => updateField('myCoa', v)} placeholder="https://..." />

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

            {showTestingColumn && (
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