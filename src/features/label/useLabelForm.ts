import type { LabelFieldUpdater, LabelModelInput } from './labelModel'
import type { CalculatorSolveMode } from './peptideMath'
import {
    DEFAULT_CALCULATOR_SOLVE_MODE,
    applyCalculatorModeSwitch,
    applyFieldUpdates,
    applyProtocolAmountChange,
    applyStandardModeEntry,
    applyStandardVialAmountChange,
    applyStandardWaterChange,
    applyVialCapacityRecommendationChange,
    syncCalculatorModeSwitchFields,
    type CalculatorModeDerivedState,
} from './calculatorModeSwitch'
import { DEFAULT_VIAL_CAPACITY_ML } from './vialCapacity'
import {
    resolveAssistModeUpdates,
    type SyncAssistReason,
} from './calculatorAssistSync'
import { parseMeasureUnit, parseVialUnit } from './domain/units'

export interface LabelFormHandlers {
    handleVialUnitChange: (unit: string) => void;
    handleCompoundAmountChange: (v: string) => void;
    handleWaterChange: (v: string) => void;
    handleProtocolAmountChange: (v: string) => void;
    handleMeasureUnitChange: (unit: string) => void;
    handleDrawVolumeChange: (v: string) => void;
    handleCalculatorModeChange: (mode: CalculatorSolveMode) => void;
    handleTargetConcentrationChange: (v: string) => void;
    handleVialCapacityChange: (vialCapacityMl: number) => void;
}

function syncAssistModeDerivedFields(
    draft: LabelModelInput,
    updateField: LabelFieldUpdater,
    reason: SyncAssistReason = 'mode',
    vialCapacityMl: number = DEFAULT_VIAL_CAPACITY_ML,
): void {
    applyFieldUpdates(
        updateField,
        resolveAssistModeUpdates(draft, reason, vialCapacityMl),
    );
}

export function createLabelFormHandlers(
    input: LabelModelInput,
    updateField: LabelFieldUpdater,
    derived?: CalculatorModeDerivedState,
    vialCapacityMl: number = DEFAULT_VIAL_CAPACITY_ML,
): LabelFormHandlers {
    const mode = input.calculatorSolveMode || DEFAULT_CALCULATOR_SOLVE_MODE;

    const handleVialUnitChange = (unit: string) => {
        const vialUnit = parseVialUnit(unit)
        if (vialUnit === undefined) return
        const measureUnit = vialUnit === 'IU'
            ? 'IU'
            : input.measureUnit === 'IU'
                ? 'mcg'
                : input.measureUnit;
        updateField('vialUnit', vialUnit);
        if (measureUnit !== input.measureUnit) updateField('measureUnit', measureUnit);
        if (mode === 'target_units' || mode === 'round_concentration') {
            syncAssistModeDerivedFields(
                { ...input, vialUnit, measureUnit },
                updateField,
                'vial',
                vialCapacityMl,
            );
        }
    };

    const handleCompoundAmountChange = (v: string) => {
        if (mode === 'standard') {
            applyFieldUpdates(updateField, applyStandardVialAmountChange(input, v));
            return;
        }
        updateField('compoundAmount', v);
        if (mode === 'target_units' || mode === 'round_concentration') {
            syncAssistModeDerivedFields(
                { ...input, compoundAmount: v }, updateField, 'vial', vialCapacityMl,
            );
        }
    };

    const handleCalculatorModeChange = (nextMode: CalculatorSolveMode) => {
        const next = applyCalculatorModeSwitch(input, nextMode, derived, vialCapacityMl);
        syncCalculatorModeSwitchFields(input, next, updateField);
        if (nextMode === 'standard') {
            applyFieldUpdates(updateField, applyStandardModeEntry({ ...input, ...next }));
            return;
        }
        syncAssistModeDerivedFields(
            { ...input, ...next, calculatorSolveMode: nextMode },
            updateField,
            'mode',
            vialCapacityMl,
        );
    };

    const handleTargetConcentrationChange = (v: string) => {
        updateField('targetConcentration', v);
        updateField('targetConcentrationOrigin', v ? 'user' : 'recommended');
        updateField('reconstitutionAmount', '');
        updateField('concentration', '');
        updateField('protocolUnits', '');
        if (mode === 'round_concentration') {
            syncAssistModeDerivedFields(
                {
                    ...input,
                    targetConcentration: v,
                    targetConcentrationOrigin: v ? 'user' : 'recommended',
                    reconstitutionAmount: '',
                    concentration: '',
                    protocolUnits: '',
                    calculatorSolveMode: 'round_concentration',
                },
                updateField,
                'target_concentration',
                vialCapacityMl,
            );
        }
    };

    const handleWaterChange = (v: string) => {
        if (mode === 'round_concentration') return;
        if (mode === 'standard') {
            applyFieldUpdates(updateField, applyStandardWaterChange(input, v));
            return;
        }
        updateField('reconstitutionAmount', v);
        if (v) updateField('protocolUnits', '');
    };

    const handleProtocolAmountChange = (v: string) => {
        const updates = applyProtocolAmountChange(input, v, vialCapacityMl);
        applyFieldUpdates(updateField, updates);
        if (mode === 'round_concentration' || mode === 'target_units') {
            syncAssistModeDerivedFields(
                { ...input, ...updates, calculatorSolveMode: mode },
                updateField,
                'protocol',
                vialCapacityMl,
            );
        }
    };

    const handleMeasureUnitChange = (unit: string) => {
        const measureUnit = parseMeasureUnit(unit)
        if (measureUnit === undefined) return
        updateField('measureUnit', measureUnit);
        if (mode === 'target_units' || mode === 'round_concentration') {
            syncAssistModeDerivedFields(
                { ...input, measureUnit }, updateField, 'measure', vialCapacityMl,
            );
        }
    };

    const handleDrawVolumeChange = (v: string) => {
        if (mode === 'round_concentration') return;
        updateField('protocolUnits', v);
        updateField('protocolUnitsOrigin', v ? 'user' : 'recommended');
        if (mode === 'target_units') {
            syncAssistModeDerivedFields(
                { ...input, protocolUnits: v, reconstitutionAmount: '' },
                updateField,
                'draw',
                vialCapacityMl,
            );
        } else if (v) {
            updateField('reconstitutionAmount', '');
        }
    };

    const handleVialCapacityChange = (nextVialCapacityMl: number) => {
        if (mode === 'target_units' || mode === 'round_concentration') {
            const recommendationUpdates = applyVialCapacityRecommendationChange(
                input,
                nextVialCapacityMl,
            );
            applyFieldUpdates(updateField, recommendationUpdates);
            syncAssistModeDerivedFields(
                { ...input, ...recommendationUpdates },
                updateField,
                'capacity',
                nextVialCapacityMl,
            );
        }
    };

    return {
        handleVialUnitChange,
        handleCompoundAmountChange,
        handleWaterChange,
        handleProtocolAmountChange,
        handleMeasureUnitChange,
        handleDrawVolumeChange,
        handleCalculatorModeChange,
        handleTargetConcentrationChange,
        handleVialCapacityChange,
    };
}
