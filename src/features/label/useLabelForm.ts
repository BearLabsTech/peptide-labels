import type { LabelModelInput } from './labelModel'

export interface LabelFormHandlers {
    handleVialUnitChange: (unit: string) => void;
    handleWaterChange: (v: string) => void;
    handleProtocolAmountChange: (v: string) => void;
    handleDrawVolumeChange: (v: string) => void;
}

export function useLabelForm(input: LabelModelInput, updateField: <K extends keyof LabelModelInput>(field: K, value: any) => void): LabelFormHandlers {

    const handleVialUnitChange = (unit: string) => {
        updateField('vialUnit', unit);
        if (unit === 'IU') updateField('measureUnit', 'IU');
        else if (unit === 'mg' && input.measureUnit === 'IU') updateField('measureUnit', 'mcg');
    };

    const handleWaterChange = (v: string) => {
        updateField('reconstitutionAmount', v);
        if (v) updateField('protocolUnits', ''); // Wipe units to force forward math
    };

    const handleProtocolAmountChange = (v: string) => {
        updateField('protocolAmount', v);
        updateField('protocolUnits', ''); // Wipe units so math stays aligned to Water
    };

    const handleDrawVolumeChange = (v: string) => {
        updateField('protocolUnits', v);
        if (v) updateField('reconstitutionAmount', ''); // Wipe water to force reverse math
    };

    return {
        handleVialUnitChange,
        handleWaterChange,
        handleProtocolAmountChange,
        handleDrawVolumeChange
    };
}