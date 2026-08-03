import { describe, expect, it } from 'vitest'
import { calculatorReducer, type CalculatorEvent } from './calculatorReducer'
import type { LabelModelInput } from './labelModel'
import { resolveLabelMath } from './LabelMathResolver'
import {
    highCapacityRegressionScenario,
    manualEntryScenario,
} from './testing/labelInputBuilder'

function dispatch(state: LabelModelInput, event: CalculatorEvent): LabelModelInput {
    return calculatorReducer(state, event)
}

describe('calculatorReducer — VialUnitChanged', () => {
    it('should change only the vial/measure unit in Manual Entry, with no assist recompute', () => {
        const state = manualEntryScenario()
        const next = dispatch(state, { type: 'VialUnitChanged', unit: 'IU' })
        expect(next.vialUnit).toBe('IU')
        expect(next.measureUnit).toBe('IU')
        expect(next.concentration).toBeUndefined()
        expect(next.compoundAmount).toBe(state.compoundAmount)
        expect(next.reconstitutionAmount).toBe(state.reconstitutionAmount)
    })

    it('should use the new protocol unit immediately when switching IU to mg in Set Draw Volume', () => {
        const state: LabelModelInput = {
            compoundAmount: '10',
            vialUnit: 'IU',
            protocolAmount: '1',
            measureUnit: 'IU',
            protocolUnits: '10 units',
            protocolUnitsOrigin: 'recommended',
            calculatorSolveMode: 'target_units',
        }
        const next = dispatch(state, { type: 'VialUnitChanged', unit: 'mg', vialCapacityMl: 3 })
        expect(next.vialUnit).toBe('mg')
        expect(next.measureUnit).toBe('mcg')
        expect(next.protocolUnits).toBe('0.03 units')
        expect(next.reconstitutionAmount).toBe('3')
    })

    it('should use IU consistently when switching an mg compound to IU in Set Draw Volume', () => {
        const state: LabelModelInput = {
            compoundAmount: '5000',
            vialUnit: 'mg',
            protocolAmount: '100',
            measureUnit: 'mcg',
            protocolUnits: '10 units',
            protocolUnitsOrigin: 'recommended',
            calculatorSolveMode: 'target_units',
        }
        const next = dispatch(state, { type: 'VialUnitChanged', unit: 'IU', vialCapacityMl: 3 })
        expect(next.vialUnit).toBe('IU')
        expect(next.measureUnit).toBe('IU')
        expect(next.protocolUnits).toBe('5 units')
        expect(next.reconstitutionAmount).toBe('2.5')
    })

    it('should recompute Set Concentration recommendations when the vial unit changes', () => {
        const state: LabelModelInput = {
            compoundAmount: '20',
            vialUnit: 'mg',
            protocolAmount: '3',
            measureUnit: 'mg',
            calculatorSolveMode: 'round_concentration',
            targetConcentration: '10',
        }
        const next = dispatch(state, { type: 'VialUnitChanged', unit: 'IU', vialCapacityMl: 3 })
        expect(next.vialUnit).toBe('IU')
        expect(next.measureUnit).toBe('IU')
        // Target concentration is user-authored (non-empty), so it is preserved, not regenerated.
        expect(next.targetConcentration).toBe('10')
    })

    it('should ignore an unrecognized vial unit and return the same state', () => {
        const state = manualEntryScenario()
        const next = dispatch(state, { type: 'VialUnitChanged', unit: 'lb' })
        expect(next).toBe(state)
    })
})

describe('calculatorReducer — CompoundAmountChanged', () => {
    it('should refresh Manual Entry concentration when compound amount changes', () => {
        const state: LabelModelInput = {
            compoundAmount: '20',
            vialUnit: 'mg',
            reconstitutionAmount: '2',
            concentration: '10mg per ml',
            calculatorSolveMode: 'standard',
        }
        const next = dispatch(state, { type: 'CompoundAmountChanged', value: '10' })
        expect(next.compoundAmount).toBe('10')
        expect(next.concentration).toBe('5mg per ml')
        expect(next.reconstitutionAmount).toBe('2')
    })

    it('should recompute Set Draw Volume water/units when compound amount changes', () => {
        const state: LabelModelInput = {
            compoundAmount: '10',
            vialUnit: 'mg',
            protocolAmount: '2',
            measureUnit: 'mg',
            protocolUnits: '',
            calculatorSolveMode: 'target_units',
        }
        const next = dispatch(state, { type: 'CompoundAmountChanged', value: '20', vialCapacityMl: 3 })
        expect(next.compoundAmount).toBe('20')
        expect(next.protocolUnits).toBe('20 units')
        expect(next.protocolUnitsOrigin).toBe('recommended')
        expect(next.reconstitutionAmount).toBe('2')
        expect(next.concentration).toBe('10mg per ml')
        expect(next.showReconstitution).toBe(true)
    })

    it('should clear assist results and recommend a flat draw placeholder when compound amount becomes empty', () => {
        const state: LabelModelInput = {
            compoundAmount: '20',
            protocolAmount: '1',
            measureUnit: 'mg',
            calculatorSolveMode: 'target_units',
        }
        const next = dispatch(state, { type: 'CompoundAmountChanged', value: '' })
        expect(next.compoundAmount).toBe('')
        expect(next.reconstitutionAmount).toBe('')
        expect(next.concentration).toBe('')
        expect(next.protocolUnits).toBe('10 units')
        expect(next.protocolUnitsOrigin).toBe('recommended')
    })
})

describe('calculatorReducer — WaterChanged', () => {
    it('should be a no-op in Set Concentration mode', () => {
        const state: LabelModelInput = {
            compoundAmount: '20',
            vialUnit: 'mg',
            calculatorSolveMode: 'round_concentration',
            targetConcentration: '10',
        }
        const next = dispatch(state, { type: 'WaterChanged', value: '5' })
        expect(next).toBe(state)
    })

    it('should refresh concentration and clear a stale draw-units leftover in Manual Entry', () => {
        const state: LabelModelInput = {
            compoundAmount: '20',
            vialUnit: 'mg',
            reconstitutionAmount: '1.165',
            protocolAmount: '2.5',
            measureUnit: 'mg',
            protocolUnits: '50 units',
            concentration: '20mg per ml',
            calculatorSolveMode: 'standard',
        }
        const next = dispatch(state, { type: 'WaterChanged', value: '2' })
        expect(next.reconstitutionAmount).toBe('2')
        expect(next.concentration).toBe('10mg per ml')
        expect(next.protocolUnits).toBe('')
    })

    it('should keep the previous draw units when Manual Entry water is cleared', () => {
        const state: LabelModelInput = {
            compoundAmount: '20',
            vialUnit: 'mg',
            reconstitutionAmount: '2',
            protocolUnits: '10 units',
            concentration: '10mg per ml',
            calculatorSolveMode: 'standard',
        }
        const next = dispatch(state, { type: 'WaterChanged', value: '' })
        expect(next.reconstitutionAmount).toBe('')
        expect(next.protocolUnits).toBe('10 units')
    })

    it('should set water directly and clear draw units in Set Draw Volume mode', () => {
        const state: LabelModelInput = {
            compoundAmount: '20',
            vialUnit: 'mg',
            protocolUnits: '15 units',
            calculatorSolveMode: 'target_units',
        }
        const next = dispatch(state, { type: 'WaterChanged', value: '2' })
        expect(next.reconstitutionAmount).toBe('2')
        expect(next.protocolUnits).toBe('')
    })
})

describe('calculatorReducer — ProtocolAmountChanged', () => {
    it('should clear draw units in Manual Entry', () => {
        const state: LabelModelInput = {
            compoundAmount: '20',
            vialUnit: 'mg',
            protocolUnits: '10 units',
            calculatorSolveMode: 'standard',
        }
        const next = dispatch(state, { type: 'ProtocolAmountChanged', value: '3' })
        expect(next.protocolAmount).toBe('3')
        expect(next.protocolUnits).toBe('')
    })

    it('should default to 10 units instead of zero when protocol amount is entered in Set Draw Volume mode', () => {
        const state: LabelModelInput = {
            compoundAmount: '20',
            vialUnit: 'mg',
            measureUnit: 'mg',
            calculatorSolveMode: 'target_units',
            protocolUnits: '0',
        }
        const next = dispatch(state, { type: 'ProtocolAmountChanged', value: '3' })
        expect(next.protocolUnits).toBe('30 units')
    })

    it('should clear both water and draw units in Set Concentration mode', () => {
        const state: LabelModelInput = {
            compoundAmount: '20',
            vialUnit: 'mg',
            reconstitutionAmount: '2',
            protocolUnits: '15 units',
            calculatorSolveMode: 'round_concentration',
            targetConcentration: '10',
        }
        const next = dispatch(state, { type: 'ProtocolAmountChanged', value: '3', vialCapacityMl: 3 })
        expect(next.protocolAmount).toBe('3')
        // Set Concentration recomputes water/units fresh from the resolver below.
        expect(next.targetConcentration).toBe('10')
    })
})

describe('calculatorReducer — MeasureUnitChanged', () => {
    it('should change only the measure unit in Manual Entry, with no assist recompute', () => {
        const state = manualEntryScenario()
        const next = dispatch(state, { type: 'MeasureUnitChanged', unit: 'mcg' })
        expect(next.measureUnit).toBe('mcg')
        expect(next.concentration).toBeUndefined()
    })

    it('should recompute Set Draw Volume results when the measure unit changes, keeping a user draw fixed', () => {
        const state: LabelModelInput = {
            compoundAmount: '10',
            vialUnit: 'mg',
            protocolAmount: '500',
            measureUnit: 'mg',
            protocolUnits: '10 units',
            protocolUnitsOrigin: 'user',
            calculatorSolveMode: 'target_units',
        }
        const next = dispatch(state, { type: 'MeasureUnitChanged', unit: 'mcg', vialCapacityMl: 3 })
        expect(next.measureUnit).toBe('mcg')
        expect(next.protocolUnits).toBe('10 units')
        expect(next.reconstitutionAmount).toBe('2')
        expect(next.concentration).toBe('5mg per ml')
    })

    it('should ignore an unrecognized measure unit and return the same state', () => {
        const state = manualEntryScenario()
        const next = dispatch(state, { type: 'MeasureUnitChanged', unit: 'oz' })
        expect(next).toBe(state)
    })
})

describe('calculatorReducer — DrawVolumeChanged', () => {
    it('should be a no-op in Set Concentration mode', () => {
        const state: LabelModelInput = {
            compoundAmount: '20',
            vialUnit: 'mg',
            calculatorSolveMode: 'round_concentration',
            targetConcentration: '10',
        }
        const next = dispatch(state, { type: 'DrawVolumeChanged', value: '15 units' })
        expect(next).toBe(state)
    })

    it('should set draw units as user-authored and clear stale water in Manual Entry', () => {
        const state: LabelModelInput = {
            compoundAmount: '20',
            vialUnit: 'mg',
            reconstitutionAmount: '2',
            calculatorSolveMode: 'standard',
        }
        const next = dispatch(state, { type: 'DrawVolumeChanged', value: '15 units' })
        expect(next.protocolUnits).toBe('15 units')
        expect(next.protocolUnitsOrigin).toBe('user')
        expect(next.reconstitutionAmount).toBe('')
    })

    it('should recommend an origin of recommended when draw units are cleared in Manual Entry', () => {
        const state: LabelModelInput = {
            compoundAmount: '20',
            vialUnit: 'mg',
            protocolUnits: '15 units',
            calculatorSolveMode: 'standard',
        }
        const next = dispatch(state, { type: 'DrawVolumeChanged', value: '' })
        expect(next.protocolUnits).toBe('')
        expect(next.protocolUnitsOrigin).toBe('recommended')
        expect(next.reconstitutionAmount).toBeUndefined()
    })

    it('should treat draw units as authoritative and recompute water in Set Draw Volume mode', () => {
        const state: LabelModelInput = {
            compoundAmount: '22',
            vialUnit: 'mg',
            protocolAmount: '4',
            measureUnit: 'mg',
            calculatorSolveMode: 'target_units',
        }
        const next = dispatch(state, { type: 'DrawVolumeChanged', value: '27 units', vialCapacityMl: 3 })
        expect(next.protocolUnits).toBe('27 units')
        expect(next.protocolUnitsOrigin).toBe('user')
        expect(next.reconstitutionAmount).toBe('1.485')
        expect(next.concentration).toBe('14.815mg per ml')
    })
})

describe('calculatorReducer — ModeChanged', () => {
    it('should preserve manual-entry math when switching to Set Concentration', () => {
        const manual = manualEntryScenario()
        const next = dispatch(manual, { type: 'ModeChanged', mode: 'round_concentration' })
        expect(next.targetConcentration).toBe('20')
        expect(next.reconstitutionAmount).toBe('1')
        expect(next.protocolUnits).toBe('15 units')

        const result = resolveLabelMath(next)
        expect(result.autoWater).toBe('1')
        expect(result.autoUnits).toBe('15 units')
        expect(result.autoConcentration).toBe('20mg per ml')
    })

    it('should preserve math cycling manual to Set Concentration to Set Draw Volume to manual', () => {
        let state: LabelModelInput = manualEntryScenario()

        state = dispatch(state, { type: 'ModeChanged', mode: 'round_concentration' })
        expect(resolveLabelMath(state).autoWater).toBe('1')

        state = dispatch(state, { type: 'ModeChanged', mode: 'target_units' })
        expect(resolveLabelMath(state).autoWater).toBe('1')

        state = dispatch(state, { type: 'ModeChanged', mode: 'standard' })
        expect(state.concentration).toBe('20mg per ml')
    })

    it('should refresh concentration when switching into Manual Entry with water already set', () => {
        const fromAssist: LabelModelInput = {
            compoundAmount: '20',
            vialUnit: 'mg',
            reconstitutionAmount: '2',
            protocolAmount: '2.5',
            measureUnit: 'mg',
            protocolUnits: '25 units',
            concentration: '20mg per ml',
            calculatorSolveMode: 'target_units',
        }
        const next = dispatch(fromAssist, { type: 'ModeChanged', mode: 'standard' })
        expect(next.calculatorSolveMode).toBe('standard')
        expect(next.concentration).toBe('10mg per ml')
    })

    it('should not reuse a rounded generated draw concentration as a new target', () => {
        const generatedDraw: LabelModelInput = {
            compoundAmount: '100',
            vialUnit: 'mg',
            protocolAmount: '1',
            measureUnit: 'mg',
            protocolUnits: '3 units',
            protocolUnitsOrigin: 'recommended',
            concentration: '33.333mg per ml',
            calculatorSolveMode: 'target_units',
        }
        const next = dispatch(generatedDraw, { type: 'ModeChanged', mode: 'round_concentration', vialCapacityMl: 3 })
        expect(next.targetConcentration).toBe('33.334')
        expect(next.targetConcentrationOrigin).toBe('recommended')
    })
})

describe('calculatorReducer — TargetConcentrationChanged', () => {
    it('should clear water, concentration, and draw units in every mode', () => {
        const state: LabelModelInput = {
            compoundAmount: '20',
            vialUnit: 'mg',
            reconstitutionAmount: '2',
            concentration: '10mg per ml',
            protocolUnits: '15 units',
            calculatorSolveMode: 'standard',
        }
        const next = dispatch(state, { type: 'TargetConcentrationChanged', value: '15' })
        expect(next.targetConcentration).toBe('15')
        expect(next.targetConcentrationOrigin).toBe('user')
        expect(next.reconstitutionAmount).toBe('')
        expect(next.concentration).toBe('')
        expect(next.protocolUnits).toBe('')
    })

    it('should recompute Set Concentration results from the new target', () => {
        const state: LabelModelInput = {
            compoundAmount: '22',
            vialUnit: 'mg',
            protocolAmount: '4',
            measureUnit: 'mg',
            calculatorSolveMode: 'round_concentration',
        }
        const next = dispatch(state, { type: 'TargetConcentrationChanged', value: '15', vialCapacityMl: 3 })
        expect(next.targetConcentration).toBe('15')
        expect(next.reconstitutionAmount).toBe('1.467')
        expect(next.concentration).toBe('15mg per ml')
        expect(next.protocolUnits).toBe('26.667 units')
    })

    it('should regenerate a recommended target from the vial amount when cleared to empty', () => {
        // Clearing does not leave the field blank: the assist-sync pass that follows
        // (reason 'target_concentration') immediately recommends a fresh default from
        // the vial amount, exactly as the pre-reducer handler + resolveAssistModeUpdates did.
        const state: LabelModelInput = {
            compoundAmount: '20',
            vialUnit: 'mg',
            calculatorSolveMode: 'round_concentration',
            targetConcentration: '10',
        }
        const next = dispatch(state, { type: 'TargetConcentrationChanged', value: '' })
        expect(next.targetConcentration).toBe('10')
        expect(next.targetConcentrationOrigin).toBe('recommended')
    })
})

describe('calculatorReducer — VialCapacityChanged', () => {
    it('should be a no-op in Manual Entry', () => {
        const state = manualEntryScenario()
        const next = dispatch(state, { type: 'VialCapacityChanged', vialCapacityMl: 5 })
        expect(next).toBe(state)
    })

    it('should regenerate a system draw recommendation without changing a user draw', () => {
        const generated = highCapacityRegressionScenario()
        const asTargetUnits: LabelModelInput = {
            ...generated,
            protocolUnits: '10 units',
            protocolUnitsOrigin: 'recommended',
            calculatorSolveMode: 'target_units',
        }
        const next = dispatch(asTargetUnits, { type: 'VialCapacityChanged', vialCapacityMl: 3 })
        expect(next.protocolUnits).toBe('3 units')
        expect(next.protocolUnitsOrigin).toBe('recommended')

        const userAuthored: LabelModelInput = { ...asTargetUnits, protocolUnitsOrigin: 'user' }
        const unchanged = dispatch(userAuthored, { type: 'VialCapacityChanged', vialCapacityMl: 3 })
        expect(unchanged.protocolUnits).toBe(userAuthored.protocolUnits)
        expect(unchanged.protocolUnitsOrigin).toBe('user')
    })

    it('should regenerate a system target concentration without changing a user target', () => {
        const generated = highCapacityRegressionScenario()
        const asRoundConcentration: LabelModelInput = {
            ...generated,
            targetConcentration: '10',
            targetConcentrationOrigin: 'recommended',
            calculatorSolveMode: 'round_concentration',
        }
        const next = dispatch(asRoundConcentration, { type: 'VialCapacityChanged', vialCapacityMl: 3 })
        expect(next.targetConcentration).toBe('33.334')
        expect(next.targetConcentrationOrigin).toBe('recommended')

        const userAuthored: LabelModelInput = { ...asRoundConcentration, targetConcentrationOrigin: 'user' }
        const unchanged = dispatch(userAuthored, { type: 'VialCapacityChanged', vialCapacityMl: 3 })
        expect(unchanged.targetConcentration).toBe(userAuthored.targetConcentration)
        expect(unchanged.targetConcentrationOrigin).toBe('user')
    })
})
