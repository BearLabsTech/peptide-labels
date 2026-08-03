import { RECONSTITUTION_TYPES, resolveCalculatorMode } from '../peptideMath'
import {
    concentrationUnitLabel,
    displayConcentration,
    displayDrawUnits,
    displayWaterAmount,
} from '../calculatorModeSwitch'
import { SHOW_SYRINGE_ON_DESIGNER, parseSyringeCapacityMl, type SyringeCapacityMl } from '../syringe'
import { buildQrCodes } from '../coaLinks'
import type { LabelFieldUpdater, LabelModelInput } from '../labelModel'
import {
    TEST_RESULT_FIELDS,
    countPrintableTestResults,
    getTestResult,
    hasTestingColumnContent,
    type TestResultStatus,
    type TestType,
} from '../testIndicators'
import { isWaterAboveVialCapacity } from '../calculatorGuards'
import type { CalculatorSolveMode } from '../peptideMath'

export interface SidebarSectionsDerivedState {
    autoUnits: string
    autoWater: string
    autoConcentration: string
}

export interface UseSidebarSectionsViewModelOptions {
    input: LabelModelInput
    derivedState?: SidebarSectionsDerivedState
    vialCapacityMl?: number
}

export interface SourceSectionViewModel {
    isSectionActive: boolean
}

export interface ReconstitutionSectionViewModel {
    isSectionActive: boolean
    solveMode: CalculatorSolveMode
    waterDisabled: boolean
    concentrationUnitLabel: string
    waterAmount: string
    concentrationDisplay: string
    reconstitutionTypeOptions: readonly string[]
    showRoundConcentrationHint: boolean
    showTargetUnitsHint: boolean
    showVialCapacityWarning: boolean
}

export interface ProtocolSectionViewModel {
    isSectionActive: boolean
    measureUnitOptions: string[]
    solveMode: CalculatorSolveMode
    drawUnitsDisabled: boolean
    drawLabel: string
    showSyringeAssist: boolean
    syringeCapacityMl: SyringeCapacityMl
}

export interface TestingSectionViewModel {
    qrCount: number
    showCoaQr: boolean
    showTestIndicators: boolean
    showTestingColumn: boolean
    printableTestCount: number
    indicatorSubTitle: string
    coaSubTitle: string
    testResultFor: (type: TestType) => TestResultStatus
}

export interface SidebarSectionsViewModel {
    source: SourceSectionViewModel
    reconstitution: ReconstitutionSectionViewModel
    protocol: ProtocolSectionViewModel
    testing: TestingSectionViewModel
}

export function deriveSourceSectionViewModel(input: LabelModelInput): SourceSectionViewModel {
    return { isSectionActive: input.showSource !== false }
}

export function deriveReconstitutionSectionViewModel(
    input: LabelModelInput,
    derivedState: SidebarSectionsDerivedState | undefined,
    vialCapacityMl: number,
): ReconstitutionSectionViewModel {
    const solveMode = resolveCalculatorMode(input)
    return {
        isSectionActive: input.showReconstitution !== false,
        solveMode,
        waterDisabled: solveMode !== 'standard',
        concentrationUnitLabel: concentrationUnitLabel(input.vialUnit),
        waterAmount: displayWaterAmount(solveMode, input, derivedState),
        concentrationDisplay: displayConcentration(input, derivedState),
        reconstitutionTypeOptions: RECONSTITUTION_TYPES,
        showRoundConcentrationHint: solveMode === 'round_concentration',
        showTargetUnitsHint: solveMode === 'target_units',
        showVialCapacityWarning: isWaterAboveVialCapacity(input, vialCapacityMl),
    }
}

export function deriveProtocolSectionViewModel(
    input: LabelModelInput,
    derivedState: SidebarSectionsDerivedState | undefined,
): ProtocolSectionViewModel {
    const solveMode = resolveCalculatorMode(input)
    const hasProtocol = parseFloat(input.protocolAmount || '') > 0
    return {
        isSectionActive: input.showProtocol !== false,
        measureUnitOptions: input.vialUnit === 'IU' ? ['IU'] : ['mg', 'mcg'],
        solveMode,
        drawUnitsDisabled: solveMode === 'round_concentration',
        drawLabel: displayDrawUnits(solveMode, input, derivedState),
        showSyringeAssist: SHOW_SYRINGE_ON_DESIGNER && hasProtocol,
        syringeCapacityMl: parseSyringeCapacityMl(input.syringeCapacityMl),
    }
}

export function deriveTestingSectionViewModel(input: LabelModelInput): TestingSectionViewModel {
    const qrCount = buildQrCodes(input).length
    const printableTestCount = countPrintableTestResults(input)
    return {
        qrCount,
        showCoaQr: input.showCoaQr !== false,
        showTestIndicators: input.showTestIndicators === true,
        showTestingColumn: hasTestingColumnContent(input, qrCount),
        printableTestCount,
        indicatorSubTitle: printableTestCount > 0
            ? `Test result indicators (${printableTestCount} selected)`
            : 'Test result indicators',
        coaSubTitle: qrCount > 0 ? `COA links (${qrCount} saved)` : 'COA links',
        testResultFor: (type) => getTestResult(input, type),
    }
}

/** Dispatch-only wrapper mapping a test type to the `LabelModelInput` field it owns. */
export function updateTestResult(
    updateField: LabelFieldUpdater,
    type: TestType,
    status: TestResultStatus,
): void {
    updateField(TEST_RESULT_FIELDS[type], status)
}

/**
 * Owns every derived value for the sections in {@link SidebarSections.tsx}, so the
 * section components stop importing domain modules directly and only render already
 * computed booleans, labels, and options.
 */
export function useSidebarSectionsViewModel({
    input,
    derivedState,
    vialCapacityMl = 3,
}: UseSidebarSectionsViewModelOptions): SidebarSectionsViewModel {
    return {
        source: deriveSourceSectionViewModel(input),
        reconstitution: deriveReconstitutionSectionViewModel(input, derivedState, vialCapacityMl),
        protocol: deriveProtocolSectionViewModel(input, derivedState),
        testing: deriveTestingSectionViewModel(input),
    }
}
