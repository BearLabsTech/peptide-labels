import type { LabelModelInput } from './labelModel'
import { DEFAULT_CALCULATOR_SOLVE_MODE } from './calculatorModeSwitch'
import { DEFAULT_SYRINGE_CAPACITY_ML } from './syringe'
import exampleLogoUrl from '../../assets/bear-labs-logo.png'

/** Blank form state for a new calculator / label-designer session. */
export function getEmptyInput(): LabelModelInput {
  return {
    compoundName: '',
    compoundAmount: '',
    reconstitutionAmount: '',
    reconstitutionType: '',
    concentration: '',
    protocolUnits: '',
    protocolAmount: '',
    protocolFrequency: '',
    reconstitutionDate: '',
    measureUnit: 'mg',
    vendorCoa: '',
    groupBuyCoa: '',
    testGroupCoa: '',
    myCoa: '',
    customImage: '',
    isUntested: false,
    vialUnit: 'mg',
    dateFormat: 'YYYYMMDD',
    showSource: true,
    showReconstitution: true,
    showProtocol: true,
    calculatorSolveMode: DEFAULT_CALCULATOR_SOLVE_MODE,
    syringeCapacityMl: DEFAULT_SYRINGE_CAPACITY_ML,
  }
}

/** Demo label shown before the user has typed anything in the designer. */
export function getExampleInput(today: string): LabelModelInput {
  return {
    compoundName: 'Tirzepatide',
    compoundAmount: '20',
    vialUnit: 'mg',
    reconstitutionAmount: '2',
    reconstitutionType: 'BAC Water',
    protocolAmount: '5',
    measureUnit: 'mg',
    protocolFrequency: 'Weekly',
    reconstitutionDate: today,
    dateFormat: 'YYYYMMDD',
    showSource: false,
    showTestIndicators: true,
    testPurity: 'pass',
    testEndotoxin: 'pass',
    showCoaQr: true,
    vendorCoa: 'https://github.com',
    customImage: exampleLogoUrl,
    calculatorSolveMode: DEFAULT_CALCULATOR_SOLVE_MODE,
    syringeCapacityMl: 1.0,
  }
}
