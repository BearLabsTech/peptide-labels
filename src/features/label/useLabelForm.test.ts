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

describe('createLabelFormHandlers', () => {
    // Unit-transition math for VialUnitChanged lives in calculatorReducer.test.ts —
    // the same scenarios previously duplicated here. This file only covers the
    // humble wiring: handlers dispatch into the reducer and write changed fields.
    it('should write only fields the reducer changed when a handler dispatches', () => {
        const { updates, updateField } = captureUpdates()
        const handlers = createLabelFormHandlers(
            { reconstitutionAmount: '1' },
            updateField,
            3,
        )

        handlers.handleWaterChange('2')

        expect(updates.get('reconstitutionAmount')).toBe('2')
        expect(updates.has('compoundAmount')).toBe(false)
    })
})
