import type { LabelModelInput } from './labelModel'

export type TestResultStatus = 'do_not_print' | 'pass' | 'fail' | 'not_run'

export type TestPrintStatus = Exclude<TestResultStatus, 'do_not_print'>

export const TEST_TYPES = [
  'Mass',
  'Purity',
  'LCMS',
  'Endotoxin',
  'Sterility',
  'Heavy Metals',
  'Fentanyl',
] as const

export type TestType = (typeof TEST_TYPES)[number]

/** Keys on `LabelModelInput` for each test type's result. */
export const TEST_RESULT_FIELDS = {
  Mass: 'testMass',
  Purity: 'testPurity',
  LCMS: 'testLcms',
  Endotoxin: 'testEndotoxin',
  Sterility: 'testSterility',
  'Heavy Metals': 'testHeavyMetals',
  Fentanyl: 'testFentanyl',
} as const satisfies Record<TestType, keyof LabelModelInput>

/** Label text printed beside each test mark. */
export const TEST_DISPLAY_LABELS = {
  Mass: 'Mass',
  Purity: 'Purity',
  LCMS: 'LC/MS',
  Endotoxin: 'Endotoxin',
  Sterility: 'Sterility',
  'Heavy Metals': 'Heavy Metals',
  Fentanyl: 'Fentanyl',
} as const satisfies Record<TestType, string>

export const TEST_STATUS_OPTIONS = [
  { value: 'do_not_print', label: 'Do Not Print' },
  { value: 'pass', label: 'Pass' },
  { value: 'fail', label: 'Fail' },
  { value: 'not_run', label: 'Not Run' },
] as const satisfies readonly { value: TestResultStatus; label: string }[]

export interface TestIndicatorEntry {
  readonly type: TestType
  readonly label: string
  readonly status: TestPrintStatus
}

export function parseTestResultStatus(value: unknown): TestResultStatus | null {
  if (typeof value !== 'string') return null
  const match = TEST_STATUS_OPTIONS.find((option) => option.value === value)
  return match?.value ?? null
}

export function getTestResult(input: LabelModelInput, type: TestType): TestResultStatus {
  const field = TEST_RESULT_FIELDS[type]
  return parseTestResultStatus(input[field]) ?? 'do_not_print'
}

export function isPrintableTestStatus(status: TestResultStatus): status is TestPrintStatus {
  return status !== 'do_not_print'
}

export function countPrintableTestResults(input: LabelModelInput): number {
  return TEST_TYPES.filter((type) => isPrintableTestStatus(getTestResult(input, type))).length
}

export function hasPrintableTestResults(input: LabelModelInput): boolean {
  return countPrintableTestResults(input) > 0
}

export function shouldShowTestIndicators(input: LabelModelInput): boolean {
  return input.showTestIndicators === true
}

export function shouldShowCoaQr(input: LabelModelInput): boolean {
  return input.showCoaQr !== false
}

export function buildTestIndicators(input: LabelModelInput): TestIndicatorEntry[] {
  if (!shouldShowTestIndicators(input)) return []

  return TEST_TYPES.flatMap((type) => {
    const status = getTestResult(input, type)
    if (!isPrintableTestStatus(status)) return []

    return [{
      type,
      label: TEST_DISPLAY_LABELS[type],
      status,
    }]
  })
}

export function hasTestingColumnContent(input: LabelModelInput, qrCount: number): boolean {
  const coaVisible = shouldShowCoaQr(input) && qrCount > 0
  const indicatorsVisible = buildTestIndicators(input).length > 0
  return coaVisible || indicatorsVisible
}
