import type { LabelModelInput } from '../labelModel'
import type { CalculatorSolveMode } from '../peptideMath'

/**
 * Fluent builder for `LabelModelInput` test fixtures.
 *
 * Replaces ad hoc inline object literals so a scenario reads as intent
 * ("20 mg vial, target draw volume mode") rather than as an unlabelled bag
 * of fields. See docs/CODE-QUALITY.md section E (test data builders).
 *
 * Usage:
 *   aLabelInput().withCompound('Tirzepatide', '20', 'mg').withProtocol('3', 'mg').inMode('target_units').build()
 */
export class LabelInputBuilder {
    private input: LabelModelInput = {}

    withCompound(name: string, amount?: string, unit: 'mg' | 'IU' = 'mg'): this {
        this.input = {
            ...this.input,
            compoundName: name,
            vialUnit: unit,
            ...(amount !== undefined ? { compoundAmount: amount } : {}),
        }
        return this
    }

    withReconstitution(amountMl: string, type?: string): this {
        this.input = {
            ...this.input,
            reconstitutionAmount: amountMl,
            ...(type !== undefined ? { reconstitutionType: type } : {}),
        }
        return this
    }

    withConcentration(label: string): this {
        this.input = { ...this.input, concentration: label }
        return this
    }

    withProtocol(amount: string, measureUnit: 'mg' | 'mcg' | 'IU' = 'mg', frequency?: string): this {
        this.input = {
            ...this.input,
            protocolAmount: amount,
            measureUnit,
            ...(frequency !== undefined ? { protocolFrequency: frequency } : {}),
        }
        return this
    }

    withDrawUnits(label: string): this {
        this.input = { ...this.input, protocolUnits: label }
        return this
    }

    inMode(mode: CalculatorSolveMode): this {
        this.input = { ...this.input, calculatorSolveMode: mode }
        return this
    }

    withTargetConcentration(value: string): this {
        this.input = { ...this.input, targetConcentration: value }
        return this
    }

    withSyringeCapacity(syringeCapacityMl: 0.3 | 0.5 | 1.0): this {
        this.input = { ...this.input, syringeCapacityMl }
        return this
    }

    withSource(vendorName?: string, batchNumber?: string): this {
        this.input = {
            ...this.input,
            ...(vendorName !== undefined ? { vendorName } : {}),
            ...(batchNumber !== undefined ? { batchNumber } : {}),
        }
        return this
    }

    withCoa(vendorCoa: string): this {
        this.input = { ...this.input, vendorCoa }
        return this
    }

    withCustomImage(dataUrl = 'data:image/png;base64,test'): this {
        this.input = { ...this.input, customImage: dataUrl }
        return this
    }

    untested(): this {
        this.input = { ...this.input, isUntested: true }
        return this
    }

    /** Merge arbitrary fields not covered by a dedicated method above. */
    withFields(fields: Partial<LabelModelInput>): this {
        this.input = { ...this.input, ...fields }
        return this
    }

    build(): LabelModelInput {
        return { ...this.input }
    }
}

export function aLabelInput(): LabelInputBuilder {
    return new LabelInputBuilder()
}

/** 20 mg vial, 1 ml water, 3 mg protocol, Manual Entry — the common label screenshot scenario. */
export function manualEntryScenario(): LabelModelInput {
    return aLabelInput()
        .withCompound('Tirzepatide', '20', 'mg')
        .withReconstitution('1')
        .withProtocol('3', 'mg')
        .withDrawUnits('15 units')
        .inMode('standard')
        .build()
}

/**
 * 22 mg vial / 4 mg protocol / target 15 mg-per-ml -> 1.467 ml water, 26.667 units draw.
 * The classic "rounded water would drift the target concentration" trap.
 */
export function roundConcentrationRoundingTrapScenario(): LabelModelInput {
    return aLabelInput()
        .withCompound('Test Compound', '22', 'mg')
        .withProtocol('4', 'mg')
        .inMode('round_concentration')
        .withTargetConcentration('15')
        .build()
}

/** 10 mg vial / 2 ml water / 500 mcg protocol -> 10 units draw. Plain forward-math case. */
export function forwardMathScenario(): LabelModelInput {
    return aLabelInput()
        .withCompound('Test Compound', '10', 'mg')
        .withReconstitution('2')
        .withProtocol('500', 'mcg')
        .inMode('standard')
        .build()
}

/**
 * 23.3 mg vial / 10 mg protocol / 50 units draw -> exact water 1.165 ml.
 * Rounding the water to 1.17 for display would silently poison the concentration
 * if it were fed back into forward math — the round-trip trap this scenario guards.
 */
export function roundTripDriftTrapScenario(): LabelModelInput {
    return aLabelInput()
        .withCompound('Test Compound', '23.3', 'mg')
        .withProtocol('10', 'mg')
        .withDrawUnits('50 units')
        .inMode('target_units')
        .build()
}

/**
 * 22 mg vial / 4 mg protocol / 27 units draw -> exact reverse water 1.485 ml.
 * Guards that authored draw units stay authoritative over forward-recalculated
 * units from display-rounded water. Pure-math analogue lives in
 * `peptideMath.unit.test.ts` under `authoritative assist inputs`.
 */
export function authoritativeDrawUnitsScenario(): LabelModelInput {
    return aLabelInput()
        .withCompound('Test Compound', '22', 'mg')
        .withProtocol('4', 'mg')
        .withDrawUnits('27 units')
        .inMode('target_units')
        .build()
}

/** 100 mg vial / 1 mg protocol — regression fixture for vial-capacity warning behavior. */
export function highCapacityRegressionScenario(): LabelModelInput {
    return aLabelInput()
        .withCompound('Test Compound', '100', 'mg')
        .withProtocol('1', 'mg')
        .build()
}
