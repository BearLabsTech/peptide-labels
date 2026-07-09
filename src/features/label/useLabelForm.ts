import type { LabelModelInput } from './labelModel'
import type { CalculatorSolveMode } from './peptideMath'
import { resolveLabelMath } from './LabelMathResolver'
import {
    applyCalculatorModeSwitch,
    applyFieldUpdates,
    applyProtocolAmountChange,
    ensureReconstitutionPrintForAssist,
    syncCalculatorModeSwitchFields,
    type CalculatorModeDerivedState,
} from './calculatorModeSwitch'
import { hasPositiveDrawUnits, hasPositiveVialAmount, resolveDefaultDrawUnitsLabel } from './peptideMath'

export type SyncAssistReason = 'protocol' | 'vial' | 'measure' | 'draw' | 'mode' | 'target_concentration';

export interface LabelFormHandlers {
    handleVialUnitChange: (unit: string) => void;
    handleCompoundAmountChange: (v: string) => void;
    handleWaterChange: (v: string) => void;
    handleProtocolAmountChange: (v: string) => void;
    handleMeasureUnitChange: (unit: string) => void;
    handleDrawVolumeChange: (v: string) => void;
    handleCalculatorModeChange: (mode: CalculatorSolveMode) => void;
    handleTargetConcentrationChange: (v: string) => void;
}

function syncAssistModeDerivedFields(
    draft: LabelModelInput,
    updateField: <K extends keyof LabelModelInput>(field: K, value: LabelModelInput[K]) => void,
    reason: SyncAssistReason = 'mode',
): void {
    const mode = draft.calculatorSolveMode || 'standard';
    if (mode !== 'target_units' && mode !== 'round_concentration') return;

    const hasVial = hasPositiveVialAmount(draft.compoundAmount);

    if (!hasVial) {
        updateField('reconstitutionAmount', '');
        updateField('concentration', '');
        if (mode === 'target_units' && draft.protocolAmount?.trim()) {
            const defaultUnits = resolveDefaultDrawUnitsLabel(
                draft.protocolAmount, draft.measureUnit, draft.vialUnit, draft.compoundAmount,
            );
            if (defaultUnits && reason !== 'draw') {
                updateField('protocolUnits', defaultUnits);
            }
        }
        return;
    }

    const resolved = resolveLabelMath(draft);
    if (resolved.autoWater) updateField('reconstitutionAmount', resolved.autoWater);
    if (resolved.autoConcentration) updateField('concentration', resolved.autoConcentration);

    applyFieldUpdates(updateField, ensureReconstitutionPrintForAssist(mode, resolved, draft));

    if (mode === 'round_concentration' && resolved.autoUnits) {
        updateField('protocolUnits', resolved.autoUnits);
    }
    if (mode === 'target_units' && reason !== 'draw') {
        const defaultUnits = resolveDefaultDrawUnitsLabel(
            draft.protocolAmount, draft.measureUnit, draft.vialUnit, draft.compoundAmount,
        );
        const shouldUpdateDraw = reason === 'protocol' || reason === 'vial' || reason === 'measure'
            || !hasPositiveDrawUnits(draft.protocolUnits);
        if (defaultUnits && shouldUpdateDraw) {
            updateField('protocolUnits', defaultUnits);
        }
    }
}

export function useLabelForm(
    input: LabelModelInput,
    updateField: <K extends keyof LabelModelInput>(field: K, value: LabelModelInput[K]) => void,
    derived?: CalculatorModeDerivedState,
): LabelFormHandlers {
    const mode = input.calculatorSolveMode || 'standard';

    const handleVialUnitChange = (unit: string) => {
        const vialUnit = unit as LabelModelInput['vialUnit'];
        updateField('vialUnit', vialUnit);
        if (vialUnit === 'IU') updateField('measureUnit', 'IU');
        else if (vialUnit === 'mg' && input.measureUnit === 'IU') updateField('measureUnit', 'mcg');
        if (mode === 'target_units' || mode === 'round_concentration') {
            syncAssistModeDerivedFields({ ...input, vialUnit }, updateField, 'vial');
        }
    };

    const handleCompoundAmountChange = (v: string) => {
        updateField('compoundAmount', v);
        if (mode === 'target_units' || mode === 'round_concentration') {
            syncAssistModeDerivedFields({ ...input, compoundAmount: v }, updateField, 'vial');
        }
    };

    const handleCalculatorModeChange = (nextMode: CalculatorSolveMode) => {
        const next = applyCalculatorModeSwitch(input, nextMode, derived);
        syncCalculatorModeSwitchFields(input, next, updateField);
        syncAssistModeDerivedFields({ ...input, ...next, calculatorSolveMode: nextMode }, updateField, 'mode');
    };

    const handleTargetConcentrationChange = (v: string) => {
        updateField('targetConcentration', v);
        updateField('reconstitutionAmount', '');
        updateField('concentration', '');
        updateField('protocolUnits', '');
        if (mode === 'round_concentration') {
            syncAssistModeDerivedFields(
                { ...input, targetConcentration: v, reconstitutionAmount: '', concentration: '', protocolUnits: '', calculatorSolveMode: 'round_concentration' },
                updateField,
                'target_concentration',
            );
        }
    };

    const handleWaterChange = (v: string) => {
        if (mode === 'round_concentration') return;
        updateField('reconstitutionAmount', v);
        if (v) updateField('protocolUnits', '');
    };

    const handleProtocolAmountChange = (v: string) => {
        const updates = applyProtocolAmountChange(input, v);
        applyFieldUpdates(updateField, updates);
        if (mode === 'round_concentration' || mode === 'target_units') {
            syncAssistModeDerivedFields(
                { ...input, ...updates, calculatorSolveMode: mode },
                updateField,
                'protocol',
            );
        }
    };

    const handleMeasureUnitChange = (unit: string) => {
        const measureUnit = unit as LabelModelInput['measureUnit'];
        updateField('measureUnit', measureUnit);
        if (mode === 'target_units' || mode === 'round_concentration') {
            syncAssistModeDerivedFields({ ...input, measureUnit }, updateField, 'measure');
        }
    };

    const handleDrawVolumeChange = (v: string) => {
        if (mode === 'round_concentration') return;
        updateField('protocolUnits', v);
        if (mode === 'target_units') {
            syncAssistModeDerivedFields(
                { ...input, protocolUnits: v, reconstitutionAmount: '' },
                updateField,
                'draw',
            );
        } else if (v) {
            updateField('reconstitutionAmount', '');
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
    };
}
