import { describe, it, expect } from 'vitest'
import {
  buildTestIndicators,
  countPrintableTestResults,
  getTestResult,
  hasPrintableTestResults,
  hasTestingColumnContent,
  shouldShowCoaQr,
  shouldShowTestIndicators,
} from './testIndicators'

describe('testIndicators', () => {
  it('should default every test type to do not print', () => {
    expect(getTestResult({}, 'Mass')).toBe('do_not_print')
    expect(getTestResult({}, 'Fentanyl')).toBe('do_not_print')
  })

  it('should read stored test results from label input', () => {
    expect(getTestResult({ testMass: 'pass', testPurity: 'fail' }, 'Mass')).toBe('pass')
    expect(getTestResult({ testMass: 'pass', testPurity: 'fail' }, 'Purity')).toBe('fail')
  })

  it('should detect when any test is set to print on the label', () => {
    expect(hasPrintableTestResults({})).toBe(false)
    expect(hasPrintableTestResults({ testLcms: 'pass' })).toBe(true)
    expect(hasPrintableTestResults({ testLcms: 'do_not_print' })).toBe(false)
    expect(countPrintableTestResults({ testMass: 'pass', testPurity: 'do_not_print' })).toBe(1)
  })

  it('should omit do-not-print tests from built indicator rows', () => {
    const rows = buildTestIndicators({
      showTestIndicators: true,
      testMass: 'pass',
      testPurity: 'do_not_print',
    })

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ type: 'Mass', label: 'Mass', status: 'pass' })
  })

  it('should build only printable indicator rows when printing is enabled', () => {
    const rows = buildTestIndicators({
      showTestIndicators: true,
      testMass: 'pass',
      testPurity: 'fail',
      testEndotoxin: 'not_run',
    })

    expect(rows).toHaveLength(3)
    expect(rows[0]).toMatchObject({ type: 'Mass', label: 'Mass', status: 'pass' })
    expect(rows[1]).toMatchObject({ type: 'Purity', status: 'fail' })
    expect(rows[2]).toMatchObject({ type: 'Endotoxin', label: 'Endotoxin', status: 'not_run' })
  })

  it('should omit indicators when the print toggle is off', () => {
    expect(buildTestIndicators({ testMass: 'pass' })).toEqual([])
  })

  it('should treat COA QR as on by default and allow disabling', () => {
    expect(shouldShowCoaQr({})).toBe(true)
    expect(shouldShowCoaQr({ showCoaQr: false })).toBe(false)
  })

  it('should require an explicit toggle for test indicators', () => {
    expect(shouldShowTestIndicators({})).toBe(false)
    expect(shouldShowTestIndicators({ showTestIndicators: true })).toBe(true)
  })

  it('should show the testing column only when printable indicators or visible COA QR are active', () => {
    expect(hasTestingColumnContent({}, 0)).toBe(false)
    expect(hasTestingColumnContent({ showTestIndicators: true }, 0)).toBe(false)
    expect(hasTestingColumnContent({ showTestIndicators: true, testMass: 'pass' }, 0)).toBe(true)
    expect(hasTestingColumnContent({}, 1)).toBe(true)
    expect(hasTestingColumnContent({ showCoaQr: false }, 1)).toBe(false)
    expect(hasTestingColumnContent({ showCoaQr: false, showTestIndicators: true, testMass: 'pass' }, 1)).toBe(true)
  })
})
