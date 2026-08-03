import { describe, expect, it, vi } from 'vitest'
import {
    compoundAmountChipSuffixFor,
    formatWaterVolumeDisplay,
    parseDrawUnitsChipValue,
    protocolAmountChipSuffixFor,
    useCalculatorViewModel,
} from './useCalculatorViewModel'
import {
    aLabelInput,
    forwardMathScenario,
    manualEntryScenario,
    roundConcentrationRoundingTrapScenario,
    roundTripDriftTrapScenario,
} from './testing/labelInputBuilder'

describe('parseDrawUnitsChipValue', () => {
    it('should turn a numeric chip label into a stored units string', () => {
        expect(parseDrawUnitsChipValue('10 u')).toBe('10 units')
        expect(parseDrawUnitsChipValue('2.5 u')).toBe('2.5 units')
    })

    it('should return an empty string when the chip has no numeric value', () => {
        expect(parseDrawUnitsChipValue('')).toBe('')
        expect(parseDrawUnitsChipValue('u')).toBe('')
    })
})

describe('formatWaterVolumeDisplay', () => {
    it('should append " ml" when the value has no unit yet', () => {
        expect(formatWaterVolumeDisplay('1.5')).toBe('1.5 ml')
    })

    it('should leave an already-unitized value unchanged', () => {
        expect(formatWaterVolumeDisplay('1.5ml')).toBe('1.5ml')
    })
})

describe('compoundAmountChipSuffixFor', () => {
    it('should suffix IU vials with IU and everything else with mg', () => {
        expect(compoundAmountChipSuffixFor('IU')).toBe(' IU')
        expect(compoundAmountChipSuffixFor('mg')).toBe(' mg')
        expect(compoundAmountChipSuffixFor(undefined)).toBe(' mg')
    })
})

describe('protocolAmountChipSuffixFor', () => {
    it('should prefer IU when either the vial or the measure unit is IU', () => {
        expect(protocolAmountChipSuffixFor('IU', 'mg')).toBe(' IU')
        expect(protocolAmountChipSuffixFor('mg', 'IU')).toBe(' IU')
    })

    it('should use mcg only when the measure unit is mcg and neither side is IU', () => {
        expect(protocolAmountChipSuffixFor('mg', 'mcg')).toBe(' mcg')
    })

    it('should default to mg', () => {
        expect(protocolAmountChipSuffixFor('mg', 'mg')).toBe(' mg')
        expect(protocolAmountChipSuffixFor(undefined, undefined)).toBe(' mg')
    })
})

describe('useCalculatorViewModel', () => {
    it('should show the hint and placeholder results before compound and protocol amounts are entered', () => {
        const vm = useCalculatorViewModel({ input: {}, updateField: vi.fn(), vialCapacityMl: 3 })
        expect(vm.showHint).toBe(true)
        expect(vm.readyForResults).toBe(false)
        expect(vm.results.protocolAmount).toBe('—')
        expect(vm.results.drawUnits).toBe('—')
        expect(vm.results.waterVolume).toBe('—')
        expect(vm.results.concentration).toBe('—')
    })

    it('should compute full results for a ready manual-entry (standard mode) scenario', () => {
        const input = manualEntryScenario()
        const vm = useCalculatorViewModel({ input, updateField: vi.fn(), vialCapacityMl: 3 })
        expect(vm.readyForResults).toBe(true)
        expect(vm.showWaterField).toBe(true)
        expect(vm.showDrawField).toBe(false)
        expect(vm.showTargetConcentrationField).toBe(false)
        expect(vm.results.protocolAmount).toBe('3 mg')
        expect(vm.results.waterVolume).toBe('1 ml')
    })

    it('should show the draw-units field only in Set Draw Volume mode', () => {
        const input = roundTripDriftTrapScenario()
        const vm = useCalculatorViewModel({ input, updateField: vi.fn(), vialCapacityMl: 3 })
        expect(vm.showDrawField).toBe(true)
        expect(vm.showWaterField).toBe(false)
        expect(vm.showTargetConcentrationField).toBe(false)
        expect(vm.drawUnitsFieldValue).toBe('50 units')
    })

    it('should show the target-concentration field only in Set Concentration mode', () => {
        const input = roundConcentrationRoundingTrapScenario()
        const vm = useCalculatorViewModel({ input, updateField: vi.fn(), vialCapacityMl: 3 })
        expect(vm.showTargetConcentrationField).toBe(true)
        expect(vm.showWaterField).toBe(false)
        expect(vm.showDrawField).toBe(false)
    })

    it('should flag the vial-capacity warning when required water exceeds vial capacity', () => {
        const input = aLabelInput()
            .withCompound('Test Compound', '20', 'mg')
            .withReconstitution('4')
            .withProtocol('1', 'mg')
            .inMode('standard')
            .build()
        const vm = useCalculatorViewModel({ input, updateField: vi.fn(), vialCapacityMl: 3 })
        expect(vm.showVialCapacityWarning).toBe(true)
    })

    it('should not flag the vial-capacity warning for a scenario within capacity', () => {
        const input = forwardMathScenario()
        const vm = useCalculatorViewModel({ input, updateField: vi.fn(), vialCapacityMl: 3 })
        expect(vm.showVialCapacityWarning).toBe(false)
    })

    it('should block results and surface the compound-exceeded flag when protocol exceeds compound', () => {
        const input = { compoundAmount: '5', protocolAmount: '10', vialUnit: 'mg' as const, measureUnit: 'mg' as const }
        const vm = useCalculatorViewModel({ input, updateField: vi.fn(), vialCapacityMl: 3 })
        expect(vm.blocked).toBe(true)
        expect(vm.readyForResults).toBe(false)
    })

    it('should dispatch the mode change event through onModeSelect', () => {
        const updateField = vi.fn()
        const vm = useCalculatorViewModel({ input: manualEntryScenario(), updateField, vialCapacityMl: 3 })
        vm.onModeSelect('Set Draw Volume')
        expect(updateField).toHaveBeenCalledWith('calculatorSolveMode', 'target_units')
    })

    it('should parse and dispatch the draw-units chip value via onDrawUnitsChipChange', () => {
        const updateField = vi.fn()
        const vm = useCalculatorViewModel({ input: roundTripDriftTrapScenario(), updateField, vialCapacityMl: 3 })
        vm.onDrawUnitsChipChange('12 u')
        expect(updateField).toHaveBeenCalledWith('protocolUnits', '12 units')
    })
})
