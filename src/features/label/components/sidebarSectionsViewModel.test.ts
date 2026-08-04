import { describe, expect, it, vi } from 'vitest'
import {
    deriveProtocolSectionViewModel,
    deriveReconstitutionSectionViewModel,
    deriveSourceSectionViewModel,
    deriveTestingSectionViewModel,
    updateTestResult,
    sidebarSectionsViewModel,
} from './sidebarSectionsViewModel'
import {
    aLabelInput,
    manualEntryScenario,
    roundConcentrationRoundingTrapScenario,
    roundTripDriftTrapScenario,
} from '../testing/labelInputBuilder'

describe('deriveSourceSectionViewModel', () => {
    it('should default the source section to active when the flag is unset', () => {
        expect(deriveSourceSectionViewModel({}).isSectionActive).toBe(true)
    })

    it('should report the section inactive once explicitly turned off', () => {
        expect(deriveSourceSectionViewModel({ showSource: false }).isSectionActive).toBe(false)
    })
})

describe('deriveReconstitutionSectionViewModel', () => {
    it('should disable the water field outside Manual Entry mode', () => {
        const input = roundTripDriftTrapScenario()
        const vm = deriveReconstitutionSectionViewModel(input, undefined, 3)
        expect(vm.solveMode).toBe('target_units')
        expect(vm.waterDisabled).toBe(true)
        expect(vm.showTargetUnitsHint).toBe(true)
        expect(vm.showRoundConcentrationHint).toBe(false)
    })

    it('should enable the water field and show neither hint in Manual Entry mode', () => {
        const input = manualEntryScenario()
        const vm = deriveReconstitutionSectionViewModel(input, undefined, 3)
        expect(vm.waterDisabled).toBe(false)
        expect(vm.showTargetUnitsHint).toBe(false)
        expect(vm.showRoundConcentrationHint).toBe(false)
    })

    it('should show the round-concentration hint only in that mode', () => {
        const input = roundConcentrationRoundingTrapScenario()
        const vm = deriveReconstitutionSectionViewModel(input, undefined, 3)
        expect(vm.showRoundConcentrationHint).toBe(true)
    })

    it('should flag the vial-capacity warning when required water exceeds capacity', () => {
        const input = aLabelInput()
            .withCompound('Test Compound', '20', 'mg')
            .withReconstitution('4')
            .withProtocol('1', 'mg')
            .inMode('standard')
            .build()
        const vm = deriveReconstitutionSectionViewModel(input, undefined, 3)
        expect(vm.showVialCapacityWarning).toBe(true)
    })
})

describe('deriveProtocolSectionViewModel', () => {
    it('should disable the draw-units field only in Set Concentration mode', () => {
        const input = roundConcentrationRoundingTrapScenario()
        const vm = deriveProtocolSectionViewModel(input, undefined)
        expect(vm.drawUnitsDisabled).toBe(true)
    })

    it('should offer IU-only measure options for an IU vial', () => {
        const vm = deriveProtocolSectionViewModel({ vialUnit: 'IU' }, undefined)
        expect(vm.measureUnitOptions).toEqual(['IU'])
    })

    it('should offer mg/mcg measure options for an mg vial', () => {
        const vm = deriveProtocolSectionViewModel({ vialUnit: 'mg' }, undefined)
        expect(vm.measureUnitOptions).toEqual(['mg', 'mcg'])
    })
})

describe('deriveTestingSectionViewModel', () => {
    it('should count selected (non do-not-print) test results toward the subtitle', () => {
        const vm = deriveTestingSectionViewModel({ testPurity: 'pass', testEndotoxin: 'fail' })
        expect(vm.printableTestCount).toBe(2)
        expect(vm.indicatorSubTitle).toBe('Test result indicators (2 selected)')
    })

    it('should use the plain subtitle when no test result is selected', () => {
        const vm = deriveTestingSectionViewModel({})
        expect(vm.printableTestCount).toBe(0)
        expect(vm.indicatorSubTitle).toBe('Test result indicators')
    })

    it('should count saved COA links toward the subtitle', () => {
        const vm = deriveTestingSectionViewModel({ vendorCoa: 'https://example.com' })
        expect(vm.qrCount).toBeGreaterThan(0)
        expect(vm.coaSubTitle).toContain('COA links (')
    })

    it('should read the current result for a given test type via testResultFor', () => {
        const vm = deriveTestingSectionViewModel({ testMass: 'pass' })
        expect(vm.testResultFor('Mass')).toBe('pass')
        expect(vm.testResultFor('Purity')).toBe('do_not_print')
    })
})

describe('updateTestResult', () => {
    it('should write the result to the field owned by the given test type', () => {
        const updateField = vi.fn()
        updateTestResult(updateField, 'Endotoxin', 'fail')
        expect(updateField).toHaveBeenCalledWith('testEndotoxin', 'fail')
    })
})

describe('sidebarSectionsViewModel', () => {
    it('should compose all four section view models from shared input', () => {
        const vm = sidebarSectionsViewModel({ input: manualEntryScenario() })
        expect(vm.source.isSectionActive).toBe(true)
        expect(vm.reconstitution.solveMode).toBe('standard')
        expect(vm.protocol.solveMode).toBe('standard')
        expect(vm.testing.printableTestCount).toBe(0)
    })
})
