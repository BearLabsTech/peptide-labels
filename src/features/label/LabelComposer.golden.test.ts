import { describe, it, expect } from 'vitest'
import { LabelComposer } from './LabelComposer'
import { resolvePrintTarget } from '../../print/PrintTargetResolver'
import { buildExportSpec } from '../../print/exportSpec'
import type { LabelModelInput } from './labelModel'

/**
 * Characterization ("golden") suite for the whole label-composition pipeline.
 *
 * This is the behavior contract for every phase of the code-quality refactor
 * (see docs/CODE-QUALITY.md and the refactor plan). Per the carve-out in
 * testing-vitest.mdc, this file uses `toMatchSnapshot` deliberately: the
 * assertion here is "identical to what shipped," not "equal to a value
 * someone reasoned about." A changed snapshot means a deliberate, called-out
 * output change — never run `vitest -u` to clear a failure here.
 *
 * Cross product: 5 representative inputs x 7 print targets (6 catalog
 * stocks + the no-selection "skip default" target).
 */

const STOCK_IDS = [
  '40x20-rounded',
  '40x20-rect',
  '40x30-rounded',
  '40x30-rect',
  '50x30-rounded',
  '50x30-rect',
] as const

const TARGET_CASES: { name: string; target: ReturnType<typeof resolvePrintTarget> }[] = [
  ...STOCK_IDS.map((stockId) => ({ name: stockId, target: resolvePrintTarget({ stockId }) })),
  { name: 'skip-default', target: resolvePrintTarget({}) },
]

const SCENARIOS: { name: string; input: LabelModelInput }[] = [
  {
    name: 'minimal name only',
    input: {
      compoundName: 'Tirzepatide',
    },
  },
  {
    name: 'full label with all sections',
    input: {
      compoundName: 'Tirzepatide',
      compoundAmount: '20',
      vialUnit: 'mg',
      vendorName: 'Bear Labs',
      groupBuyName: 'Group Buy Co',
      batchNumber: 'BL-2026',
      batchDate: '20260621',
      reconstitutionAmount: '2',
      reconstitutionType: 'BAC Water',
      reconstitutionDate: '20260621',
      concentration: '10mg per ml',
      protocolAmount: '5',
      measureUnit: 'mg',
      protocolUnits: '25 units',
      protocolFrequency: 'Weekly',
      vendorCoa: 'https://example.com/coa',
      showTestIndicators: true,
      testMass: 'pass',
      testPurity: 'pass',
      testLcms: 'not_run',
      showSource: true,
      showReconstitution: true,
      showProtocol: true,
    },
  },
  {
    name: 'untested danger mode',
    input: {
      compoundName: 'Retatrutide',
      compoundAmount: '20',
      vialUnit: 'mg',
      isUntested: true,
      reconstitutionAmount: '2',
      concentration: '10mg per ml',
      protocolAmount: '5',
      measureUnit: 'mg',
      protocolUnits: '25 units',
    },
  },
  {
    name: 'logo plus QR plus indicators',
    input: {
      compoundName: 'Semaglutide',
      compoundAmount: '10',
      vialUnit: 'mg',
      customImage: 'data:image/png;base64,test',
      vendorCoa: 'https://example.com/coa',
      showTestIndicators: true,
      testMass: 'pass',
      testPurity: 'fail',
      testEndotoxin: 'not_run',
    },
  },
  {
    name: 'long compound name forcing wrap',
    input: {
      compoundName: 'Very Long Experimental Compound Name That Forces Title Wrapping',
      compoundAmount: '20',
      vialUnit: 'mg',
      reconstitutionAmount: '2',
      concentration: '10mg per ml',
      protocolAmount: '5',
      measureUnit: 'mg',
      protocolUnits: '25 units',
    },
  },
  {
    name: 'sparse testing only',
    input: {
      compoundName: 'Tirzepatide',
      compoundAmount: '20',
      vialUnit: 'mg',
      showTestIndicators: true,
      testPurity: 'pass',
      testEndotoxin: 'pass',
    },
  },
  {
    name: 'sparse logo only',
    input: {
      compoundName: 'Tirzepatide',
      compoundAmount: '20',
      vialUnit: 'mg',
      customImage: 'data:image/png;base64,test',
    },
  },
  {
    name: 'sparse logo plus testing',
    input: {
      compoundName: 'Tirzepatide',
      compoundAmount: '20',
      vialUnit: 'mg',
      customImage: 'data:image/png;base64,test',
      showTestIndicators: true,
      testPurity: 'pass',
      testEndotoxin: 'pass',
    },
  },
]

describe('LabelComposer golden output', () => {
  for (const { name: targetName, target } of TARGET_CASES) {
    describe(`stock: ${targetName}`, () => {
      it(`should produce a stable export spec for ${targetName}`, () => {
        expect(buildExportSpec(target)).toMatchSnapshot()
      })

      for (const { name: scenarioName, input } of SCENARIOS) {
        it(`should produce a stable render model for "${scenarioName}"`, () => {
          const composer = new LabelComposer(target)
          const result = composer.compose(input)
          expect(result).toMatchSnapshot()
        })
      }
    })
  }
})
