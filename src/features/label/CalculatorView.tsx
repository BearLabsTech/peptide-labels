import type { LabelFieldUpdater, LabelModelInput } from './labelModel'
import { ChipSelect } from './components/ChipSelect'
import { CompactUnitSelect } from './components/CompactUnitSelect'
import { SyringeAssist } from './syringe/SyringeAssist'
import type { SyringeCapacityMl } from './syringe'
import { VialCapacityControl } from './components/VialCapacityControl'
import { VialCapacityWarning } from './components/VialCapacityWarning'
import { useCalculatorViewModel } from './useCalculatorViewModel'
import { FIELD_LABELS, HANDOFF_PROMPT } from './uiStrings'
import './CalculatorView.css'

export interface CalculatorViewProps {
    input: LabelModelInput
    updateField: LabelFieldUpdater
    vialCapacityMl: number
    onVialCapacityChange: (vialCapacityMl: number) => void
    onRequestLabelHandoff: () => void
}

export function CalculatorView({
    input,
    updateField,
    vialCapacityMl,
    onVialCapacityChange,
    onRequestLabelHandoff,
}: CalculatorViewProps) {
    const vm = useCalculatorViewModel({ input, updateField, vialCapacityMl })

    return (
        <div className="calculator-view">
            <div className="calculator-view__inner">
                <section className="calculator-card">
                    <h2>Calculator assist</h2>
                    <div className="calculator-assist-row">
                        <div className="mode-segment" role="group" aria-label="Calculator assist mode">
                            {vm.modeOptions.map((label) => {
                                const active = vm.activeModeLabel === label
                                return (
                                    <button
                                        key={label}
                                        type="button"
                                        className={active ? 'mode-segment__btn mode-segment__btn--active' : 'mode-segment__btn'}
                                        aria-pressed={active}
                                        onClick={() => vm.onModeSelect(label)}
                                    >
                                        {label}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </section>

                <section className="calculator-card calculator-card--tight">
                    <h2>Inputs</h2>
                    <div className="calculator-input-rows">
                        <ChipSelect
                            label={FIELD_LABELS.compoundAmount}
                            value={input.compoundAmount || ''}
                            presets={vm.compoundAmountPresets}
                            chipSuffix={vm.compoundAmountChipSuffix}
                            placeholder="Amt"
                            onChange={vm.handlers.handleCompoundAmountChange}
                            trailing={
                                <CompactUnitSelect
                                    label="Vial unit"
                                    value={input.vialUnit || 'mg'}
                                    onChange={vm.handlers.handleVialUnitChange}
                                    options={['mg', 'IU']}
                                />
                            }
                        />
                        <div className="chip-row">
                            <div className="chip-row__label">Vial capacity</div>
                            <VialCapacityControl
                                value={vialCapacityMl}
                                onChange={(next) => {
                                    vm.handlers.handleVialCapacityChange(next)
                                    onVialCapacityChange(next)
                                }}
                            />
                        </div>
                        <ChipSelect
                            label="Protocol"
                            value={input.protocolAmount || ''}
                            presets={vm.protocolAmountPresets}
                            chipSuffix={vm.protocolAmountChipSuffix}
                            placeholder="Amt"
                            onChange={vm.handlers.handleProtocolAmountChange}
                            trailing={
                                <CompactUnitSelect
                                    label="Protocol unit"
                                    value={input.measureUnit || 'mg'}
                                    onChange={vm.handlers.handleMeasureUnitChange}
                                    options={vm.measureOptions}
                                />
                            }
                        />

                        {vm.showDrawField && (
                            <ChipSelect
                                label={FIELD_LABELS.drawVolumeShort}
                                value={vm.drawUnitsFieldValue}
                                presets={vm.drawUnitsPresets}
                                chipSuffix=" u"
                                placeholder="Units"
                                onChange={vm.onDrawUnitsChipChange}
                            />
                        )}

                        {vm.showTargetConcentrationField && (
                            <div className="chip-row">
                                <div className="chip-row__label">Target conc.</div>
                                <div className="chip-row__controls">
                                    <input
                                        className="chip-row__custom chip-row__custom--wide"
                                        type="text"
                                        inputMode="decimal"
                                        placeholder={vm.concentrationUnit}
                                        value={input.targetConcentration || ''}
                                        aria-label={`Target concentration (${vm.concentrationUnit})`}
                                        onChange={(e) => vm.handlers.handleTargetConcentrationChange(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                        {vm.showWaterField && (
                            <ChipSelect
                                label={FIELD_LABELS.waterVolumeShort}
                                value={input.reconstitutionAmount || ''}
                                presets={vm.waterPresets}
                                chipSuffix=" ml"
                                placeholder="ml"
                                onChange={vm.handlers.handleWaterChange}
                            />
                        )}

                        <div className="chip-row">
                            <div className="chip-row__label">Name</div>
                            <div className="chip-row__controls">
                                <input
                                    className="chip-row__custom chip-row__custom--grow"
                                    type="text"
                                    placeholder="Compound (optional)"
                                    value={input.compoundName || ''}
                                    aria-label="Compound name (optional)"
                                    onChange={(e) => updateField('compoundName', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </section>

                <section className="calculator-card calculator-results">
                    <h2>Results</h2>
                    {vm.showHint && (
                        <p className="calculator-hint">
                            Enter compound amount and protocol amount to see water, concentration, and draw volume.
                        </p>
                    )}
                    {vm.blocked && (
                        <p className="calculator-block" role="alert">
                            Protocol amount cannot be greater than the compound amount. Adjust the values to continue.
                        </p>
                    )}
                    {vm.showVialCapacityWarning && (
                        <VialCapacityWarning vialCapacityMl={vialCapacityMl} />
                    )}
                    <div className="calculator-results__grid">
                        <ResultMetric label="Protocol amount" value={vm.results.protocolAmount} />
                        <ResultMetric label={FIELD_LABELS.drawVolume} value={vm.results.drawUnits} />
                        <ResultMetric label={FIELD_LABELS.waterVolume} value={vm.results.waterVolume} />
                        <ResultMetric label="Concentration" value={vm.results.concentration} />
                        <ResultMetric label="Measures per vial" value={vm.results.measuresPerVial} />
                    </div>

                    <SyringeAssist
                        syringeCapacityMl={vm.syringeCapacityMl}
                        onCapacityChange={(next: SyringeCapacityMl) => updateField('syringeCapacityMl', next)}
                        drawUnitsLabel={vm.syringeDrawUnitsLabel}
                    />
                </section>

                <div className="calculator-handoff">
                    <button type="button" className="btn-primary" onClick={onRequestLabelHandoff}>
                        {HANDOFF_PROMPT}
                    </button>
                </div>
            </div>
        </div>
    )
}

function ResultMetric({ label, value }: { label: string; value: string }) {
    return (
        <div className="calculator-results__metric">
            <span className="calculator-results__value">{value}</span>
            <span className="calculator-results__label">{label}</span>
        </div>
    )
}
