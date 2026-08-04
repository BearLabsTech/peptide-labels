import type { LabelFieldUpdater, LabelModelInput } from './labelModel'
import { resolveLabelMath } from './LabelMathResolver'
import { createLabelFormHandlers, type LabelFormHandlers } from './useLabelForm'
import {
    CALCULATOR_MODE_OPTIONS,
    calculatorModeFromLabel,
    calculatorModeLabel,
    concentrationUnitLabel,
} from './calculatorModeSwitch'
import {
    displayConcentration,
    displayDrawUnits,
    displayWaterAmount,
} from './calculatorDisplay'
import { SOLVE_STRATEGIES } from './domain/solveStrategy'
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
import { parseSyringeCapacityMl, type SyringeCapacityMl } from './syringe'
import { hasPositiveCompoundAmount, resolveCalculatorMode, type CalculatorSolveMode } from './peptideMath'

const NOT_READY_PLACEHOLDER = '—'

export interface CalculatorViewModelOptions {
    input: LabelModelInput
    updateField: LabelFieldUpdater
    vialCapacityMl: number
}

export interface CalculatorResultMetrics {
    protocolAmount: string
    drawUnits: string
    waterVolume: string
    concentration: string
    measuresPerVial: string
}

export interface CalculatorViewModel {
    handlers: LabelFormHandlers
    solveMode: CalculatorSolveMode
    modeOptions: readonly string[]
    activeModeLabel: string
    onModeSelect: (label: string) => void
    syringeCapacityMl: SyringeCapacityMl
    blocked: boolean
    readyForResults: boolean
    showHint: boolean
    showDrawField: boolean
    showTargetConcentrationField: boolean
    showWaterField: boolean
    showVialCapacityWarning: boolean
    measureOptions: string[]
    concentrationUnit: string
    compoundAmountPresets: readonly string[]
    compoundAmountChipSuffix: string
    protocolAmountPresets: readonly string[]
    protocolAmountChipSuffix: string
    drawUnitsPresets: string[]
    drawUnitsFieldValue: string
    targetConcentrationFieldValue: string
    waterPresets: readonly string[]
    results: CalculatorResultMetrics
    syringeDrawUnitsLabel: string
    onDrawUnitsChipChange: (value: string) => void
}

/** Extracts the leading numeric value from a chip label (e.g. "10 u") into a stored "10 units" value. */
export function parseDrawUnitsChipValue(value: string): string {
    const digits = value.match(/[\d.]+/)?.[0]
    return digits ? `${digits} units` : ''
}

/** Appends " ml" to a water-volume display value unless it already carries a unit. */
export function formatWaterVolumeDisplay(water: string): string {
    return /ml/i.test(water) ? water : `${water} ml`
}

/** Suffix shown on the compound-amount chip row, matching the vial's unit. */
export function compoundAmountChipSuffixFor(vialUnit: LabelModelInput['vialUnit']): string {
    return vialUnit === 'IU' ? ' IU' : ' mg'
}

/** Suffix shown on the protocol-amount chip row, matching whichever unit is authoritative. */
export function protocolAmountChipSuffixFor(
    vialUnit: LabelModelInput['vialUnit'],
    measureUnit: LabelModelInput['measureUnit'],
): string {
    if (vialUnit === 'IU' || measureUnit === 'IU') return ' IU'
    return measureUnit === 'mcg' ? ' mcg' : ' mg'
}

/**
 * Owns every derived value and dispatch wrapper for {@link CalculatorView.tsx}. The math
 * itself already lives in `LabelMathResolver` / `calculatorGuards` / `calculatorModeSwitch`;
 * this module's job is composing those into the exact render props the view needs, so no
 * domain rule or formatting decision is left encoded in JSX.
 */
export function calculatorViewModel({
    input,
    updateField,
    vialCapacityMl,
}: CalculatorViewModelOptions): CalculatorViewModel {
    const resolved = resolveLabelMath(input)
    const derivedState = {
        autoUnits: resolved.autoUnits,
        autoWater: resolved.autoWater,
        autoConcentration: resolved.autoConcentration,
    }
    const handlers = createLabelFormHandlers(input, updateField, vialCapacityMl)
    const solveMode = resolveCalculatorMode(input)
    const { authoritativeField } = SOLVE_STRATEGIES[solveMode]
    const syringeCapacityMl = parseSyringeCapacityMl(input.syringeCapacityMl)
    const blocked = isProtocolExceedsCompound(input)
    const hasCompound = hasPositiveCompoundAmount(input.compoundAmount)
    const hasProtocol = parseFloat(input.protocolAmount || '') > 0
    const readyForResults = hasCompound && hasProtocol && !blocked

    const water = displayWaterAmount(solveMode, input, derivedState)
    const units = displayDrawUnits(solveMode, input, derivedState)
    const concentration = displayConcentration(input, derivedState)
    const targetConcentration = input.targetConcentration || input.recommendedTargetConcentration || ''
    const measuresRaw = readyForResults ? computeMeasuresPerVialRaw(input) : null
    const measuresDisplay = measuresRaw != null
        ? formatMeasuresPerVialDisplay(measuresRaw)
        : NOT_READY_PLACEHOLDER

    return {
        handlers,
        solveMode,
        modeOptions: CALCULATOR_MODE_OPTIONS,
        activeModeLabel: calculatorModeLabel(solveMode),
        onModeSelect: (label) => handlers.handleCalculatorModeChange(calculatorModeFromLabel(label)),
        syringeCapacityMl,
        blocked,
        readyForResults,
        showHint: !hasCompound || !hasProtocol,
        showDrawField: authoritativeField === 'drawUnits',
        showTargetConcentrationField: authoritativeField === 'targetConcentration',
        showWaterField: authoritativeField === 'water',
        showVialCapacityWarning: isWaterAboveVialCapacity(input, vialCapacityMl),
        measureOptions: input.vialUnit === 'IU' ? ['IU'] : ['mg', 'mcg'],
        concentrationUnit: concentrationUnitLabel(input.vialUnit),
        compoundAmountPresets: compoundAmountPresets(input.vialUnit),
        compoundAmountChipSuffix: compoundAmountChipSuffixFor(input.vialUnit),
        protocolAmountPresets: protocolAmountPresets(input.measureUnit, input.vialUnit),
        protocolAmountChipSuffix: protocolAmountChipSuffixFor(input.vialUnit, input.measureUnit),
        drawUnitsPresets: drawUnitsPresets(syringeCapacityMl),
        drawUnitsFieldValue: units,
        targetConcentrationFieldValue: targetConcentration,
        waterPresets: WATER_PRESETS_ML,
        results: {
            protocolAmount: readyForResults
                ? `${input.protocolAmount} ${input.measureUnit || ''}`.trim()
                : NOT_READY_PLACEHOLDER,
            drawUnits: readyForResults && units ? units : NOT_READY_PLACEHOLDER,
            waterVolume: readyForResults && water ? formatWaterVolumeDisplay(water) : NOT_READY_PLACEHOLDER,
            concentration: readyForResults && concentration ? concentration : NOT_READY_PLACEHOLDER,
            measuresPerVial: measuresDisplay,
        },
        syringeDrawUnitsLabel: readyForResults ? units : '',
        onDrawUnitsChipChange: (value) => handlers.handleProtocolUnitsChange(parseDrawUnitsChipValue(value)),
    }
}
