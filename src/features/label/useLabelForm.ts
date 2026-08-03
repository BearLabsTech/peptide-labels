import type { LabelFieldUpdater, LabelModelInput } from './labelModel'
import type { CalculatorSolveMode } from './peptideMath'
import { calculatorReducer, type CalculatorEvent } from './calculatorReducer'
import { DEFAULT_VIAL_CAPACITY_ML } from './vialCapacity'

export interface LabelFormHandlers {
    handleVialUnitChange: (unit: string) => void;
    handleCompoundAmountChange: (v: string) => void;
    handleWaterChange: (v: string) => void;
    handleProtocolAmountChange: (v: string) => void;
    handleMeasureUnitChange: (unit: string) => void;
    handleProtocolUnitsChange: (v: string) => void;
    handleCalculatorModeChange: (mode: CalculatorSolveMode) => void;
    handleTargetConcentrationChange: (v: string) => void;
    handleVialCapacityChange: (vialCapacityMl: number) => void;
}

/** Writes only the fields the reducer actually changed — never a stale, unchanged value. */
function applyChangedFields(
    updateField: LabelFieldUpdater,
    current: LabelModelInput,
    next: LabelModelInput,
): void {
    for (const key of Object.keys(next) as (keyof LabelModelInput)[]) {
        const value = next[key]
        if (value !== current[key]) updateField(key, value)
    }
}

/** Dispatch wrappers over {@link calculatorReducer}; the reducer owns every decision. */
export function createLabelFormHandlers(
    input: LabelModelInput,
    updateField: LabelFieldUpdater,
    vialCapacityMl: number = DEFAULT_VIAL_CAPACITY_ML,
): LabelFormHandlers {
    const dispatch = (event: CalculatorEvent) => {
        applyChangedFields(updateField, input, calculatorReducer(input, event))
    }
    return {
        handleVialUnitChange: (unit) => dispatch({ type: 'VialUnitChanged', unit, vialCapacityMl }),
        handleCompoundAmountChange: (value) => dispatch({ type: 'CompoundAmountChanged', value, vialCapacityMl }),
        handleWaterChange: (value) => dispatch({ type: 'WaterChanged', value }),
        handleProtocolAmountChange: (value) => dispatch({ type: 'ProtocolAmountChanged', value, vialCapacityMl }),
        handleMeasureUnitChange: (unit) => dispatch({ type: 'MeasureUnitChanged', unit, vialCapacityMl }),
        handleProtocolUnitsChange: (value) => dispatch({ type: 'ProtocolUnitsChanged', value, vialCapacityMl }),
        handleCalculatorModeChange: (mode) => dispatch({ type: 'ModeChanged', mode, vialCapacityMl }),
        handleTargetConcentrationChange: (value) => dispatch({ type: 'TargetConcentrationChanged', value, vialCapacityMl }),
        handleVialCapacityChange: (nextVialCapacityMl) =>
            dispatch({ type: 'VialCapacityChanged', vialCapacityMl: nextVialCapacityMl }),
    }
}
