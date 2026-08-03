import type { LabelFieldUpdater, LabelModelInput } from './labelModel'
import { resolveLabelMath } from './LabelMathResolver'
import { createLabelFormHandlers } from './useLabelForm'
import {
    CALCULATOR_MODE_OPTIONS,
    calculatorModeFromLabel,
    calculatorModeLabel,
    concentrationUnitLabel,
    displayConcentration,
    displayDrawUnits,
    displayWaterAmount,
} from './calculatorModeSwitch'
import {
    computeMeasuresPerVialRaw,
    formatMeasuresPerVialDisplay,
    isProtocolExceedsCompound,
    isWaterAboveVialCapacity,
} from './calculatorGuards'
import {
    drawUnitsPresets,
    protocolAmountPresets,
    compoundAmountPresets,
    WATER_PRESETS_ML,
} from './calculatorPresets'
import { ChipSelect } from './components/ChipSelect'
import { CompactUnitSelect } from './components/CompactUnitSelect'
import {
    parseSyringeCapacityMl,
    type SyringeCapacityMl,
} from './syringe'
import { SyringeAssist } from './syringe/SyringeAssist'
import { hasPositiveCompoundAmount, resolveCalculatorMode } from './peptideMath'
import { VialCapacityControl } from './components/VialCapacityControl'
import { VialCapacityWarning } from './components/VialCapacityWarning'
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
    const resolved = resolveLabelMath(input)
    const derivedState = {
        autoUnits: resolved.autoUnits,
        autoWater: resolved.autoWater,
        autoConcentration: resolved.autoConcentration,
    }
    const handlers = createLabelFormHandlers(input, updateField, vialCapacityMl)
    const solveMode = resolveCalculatorMode(input)
    const syringeCapacityMl = parseSyringeCapacityMl(input.syringeCapacityMl)
    const blocked = isProtocolExceedsCompound(input)
    const hasCompound = hasPositiveCompoundAmount(input.compoundAmount)
    const hasProtocol = parseFloat(input.protocolAmount || '') > 0
    const readyForResults = hasCompound && hasProtocol && !blocked

    const water = displayWaterAmount(solveMode, input, derivedState)
    const units = displayDrawUnits(solveMode, input, derivedState)
    const concentration = displayConcentration(input, derivedState)
    const measuresRaw = readyForResults ? computeMeasuresPerVialRaw(input) : null
    const measuresDisplay = measuresRaw != null ? formatMeasuresPerVialDisplay(measuresRaw) : '—'

    const measureOptions = input.vialUnit === 'IU' ? ['IU'] : ['mg', 'mcg']
    const concUnit = concentrationUnitLabel(input.vialUnit)

    return (
        <div className="calculator-view">
            <div className="calculator-view__inner">
                <section className="calculator-card">
                    <h2>Calculator assist</h2>
                    <div className="calculator-assist-row">
                        <div className="mode-segment" role="group" aria-label="Calculator assist mode">
                            {CALCULATOR_MODE_OPTIONS.map((label) => {
                                const active = calculatorModeLabel(solveMode) === label
                                return (
                                    <button
                                        key={label}
                                        type="button"
                                        className={active ? 'mode-segment__btn mode-segment__btn--active' : 'mode-segment__btn'}
                                        aria-pressed={active}
                                        onClick={() => handlers.handleCalculatorModeChange(calculatorModeFromLabel(label))}
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
                            label="Compound amount"
                            value={input.compoundAmount || ''}
                            presets={compoundAmountPresets(input.vialUnit)}
                            chipSuffix={input.vialUnit === 'IU' ? ' IU' : ' mg'}
                            placeholder="Amt"
                            onChange={handlers.handleCompoundAmountChange}
                            trailing={
                                <CompactUnitSelect
                                    label="Vial unit"
                                    value={input.vialUnit || 'mg'}
                                    onChange={handlers.handleVialUnitChange}
                                    options={['mg', 'IU']}
                                />
                            }
                        />
                        <div className="chip-row">
                            <div className="chip-row__label">Vial capacity</div>
                            <VialCapacityControl
                                value={vialCapacityMl}
                                onChange={(next) => {
                                    handlers.handleVialCapacityChange(next)
                                    onVialCapacityChange(next)
                                }}
                            />
                        </div>
                        <ChipSelect
                            label="Protocol"
                            value={input.protocolAmount || ''}
                            presets={protocolAmountPresets(input.measureUnit, input.vialUnit)}
                            chipSuffix={
                                input.vialUnit === 'IU' || input.measureUnit === 'IU'
                                    ? ' IU'
                                    : input.measureUnit === 'mcg'
                                      ? ' mcg'
                                      : ' mg'
                            }
                            placeholder="Amt"
                            onChange={handlers.handleProtocolAmountChange}
                            trailing={
                                <CompactUnitSelect
                                    label="Protocol unit"
                                    value={input.measureUnit || 'mg'}
                                    onChange={handlers.handleMeasureUnitChange}
                                    options={measureOptions}
                                />
                            }
                        />

                        {solveMode === 'target_units' && (
                            <ChipSelect
                                label="Draw"
                                value={units}
                                presets={drawUnitsPresets(syringeCapacityMl)}
                                chipSuffix=" u"
                                placeholder="Units"
                                onChange={(v) => {
                                    const n = v.match(/[\d.]+/)?.[0]
                                    handlers.handleProtocolUnitsChange(n ? `${n} units` : '')
                                }}
                            />
                        )}

                        {solveMode === 'round_concentration' && (
                            <div className="chip-row">
                                <div className="chip-row__label">Target conc.</div>
                                <div className="chip-row__controls">
                                    <input
                                        className="chip-row__custom chip-row__custom--wide"
                                        type="text"
                                        inputMode="decimal"
                                        placeholder={concUnit}
                                        value={input.targetConcentration || ''}
                                        aria-label={`Target concentration (${concUnit})`}
                                        onChange={(e) => handlers.handleTargetConcentrationChange(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                        {solveMode === 'standard' && (
                            <ChipSelect
                                label="Water"
                                value={input.reconstitutionAmount || ''}
                                presets={WATER_PRESETS_ML}
                                chipSuffix=" ml"
                                placeholder="ml"
                                onChange={handlers.handleWaterChange}
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
                    {!hasCompound || !hasProtocol ? (
                        <p className="calculator-hint">
                            Enter compound amount and protocol amount to see water, concentration, and draw volume.
                        </p>
                    ) : null}
                    {blocked && (
                        <p className="calculator-block" role="alert">
                            Protocol amount cannot be greater than the compound amount. Adjust the values to continue.
                        </p>
                    )}
                    {isWaterAboveVialCapacity(input, vialCapacityMl) && (
                        <VialCapacityWarning vialCapacityMl={vialCapacityMl} />
                    )}
                    <div className="calculator-results__grid">
                        <ResultMetric
                            label="Protocol amount"
                            value={
                                readyForResults
                                    ? `${input.protocolAmount} ${input.measureUnit || ''}`.trim()
                                    : '—'
                            }
                        />
                        <ResultMetric
                            label="Draw units"
                            value={readyForResults && units ? units : '—'}
                        />
                        <ResultMetric
                            label="Water volume"
                            value={readyForResults && water ? `${water}${/ml/i.test(water) ? '' : ' ml'}` : '—'}
                        />
                        <ResultMetric
                            label="Concentration"
                            value={readyForResults && concentration ? concentration : '—'}
                        />
                        <ResultMetric label="Measures per vial" value={measuresDisplay} />
                    </div>

                    <SyringeAssist
                        syringeCapacityMl={syringeCapacityMl}
                        onCapacityChange={(next: SyringeCapacityMl) => updateField('syringeCapacityMl', next)}
                        drawUnitsLabel={readyForResults ? units : ''}
                    />
                </section>

                <div className="calculator-handoff">
                    <button type="button" className="btn-primary" onClick={onRequestLabelHandoff}>
                        Turn this into a label?
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
