import { describe, expect, it } from 'vitest'
import type { LabelFieldUpdater, LabelModelInput } from './labelModel'
import { createLabelFormHandlers } from './useLabelForm'

function captureUpdates() {
    const updates = new Map<keyof LabelModelInput, LabelModelInput[keyof LabelModelInput]>()
    const updateField: LabelFieldUpdater = (field, value) => {
        updates.set(field, value)
    }
    return { updates, updateField }
}

describe('createLabelFormHandlers unit transitions', () => {
    it('should use the new protocol unit immediately when switching IU to mg', () => {
        const { updates, updateField } = captureUpdates()
        const handlers = createLabelFormHandlers({
            compoundAmount: '10',
            vialUnit: 'IU',
            protocolAmount: '1',
            measureUnit: 'IU',
            protocolUnits: '10 units',
            protocolUnitsOrigin: 'recommended',
            calculatorSolveMode: 'target_units',
        }, updateField, undefined, 3)

        handlers.handleVialUnitChange('mg')

        expect(updates.get('vialUnit')).toBe('mg')
        expect(updates.get('measureUnit')).toBe('mcg')
        expect(updates.get('protocolUnits')).toBe('0.03 units')
        expect(updates.get('reconstitutionAmount')).toBe('3')
    })

    it('should use IU consistently when switching an mg compound to IU', () => {
        const { updates, updateField } = captureUpdates()
        const handlers = createLabelFormHandlers({
            compoundAmount: '5000',
            vialUnit: 'mg',
            protocolAmount: '100',
            measureUnit: 'mcg',
            protocolUnits: '10 units',
            protocolUnitsOrigin: 'recommended',
            calculatorSolveMode: 'target_units',
        }, updateField, undefined, 3)

        handlers.handleVialUnitChange('IU')

        expect(updates.get('vialUnit')).toBe('IU')
        expect(updates.get('measureUnit')).toBe('IU')
        expect(updates.get('protocolUnits')).toBe('5 units')
        expect(updates.get('reconstitutionAmount')).toBe('2.5')
    })
})
