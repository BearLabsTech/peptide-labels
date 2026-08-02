/** Shipped and future label layout templates. Add variants here as new templates ship. */
export type LabelLayoutMode = 'identityHeader'

export const DEFAULT_LABEL_LAYOUT_MODE: LabelLayoutMode = 'identityHeader'

export function resolveLabelLayoutMode(input: LabelModelInput): LabelLayoutMode {
  return input.labelLayoutMode ?? DEFAULT_LABEL_LAYOUT_MODE
}

import { formatDisplayNumber, formatDrawUnitsLabel } from './peptideMath'

/**
 * Parse a leading numeric prefix from a display string.
 * Phase 2 removes this once value and unit are separate typed fields.
 */
export function parseNumericDisplayPrefix(raw: string): number | undefined {
  const match = raw.trim().match(/^([\d.]+)/)
  if (!match) return undefined
  const value = parseFloat(match[1])
  return Number.isFinite(value) ? value : undefined
}

/**
 * Formats a water volume for label display, always including the ml unit.
 * Prefer composing {@link formatDisplayNumber} + `' ml'` at the print call site;
 * this helper remains for callers that still pass a display string.
 * Phase 2 removes the regex prefix-parse once value and unit are separate fields.
 */
export function formatWaterVolumeLabel(amount?: string): string {
  if (!amount?.trim()) return ''
  const value = parseNumericDisplayPrefix(amount)
  if (value === undefined) return amount.trim()
  return `${formatDisplayNumber(value)} ml`
}

/**
 * Formats draw volume for label display, always including the units suffix.
 * Delegates suffix formatting to {@link formatDrawUnitsLabel}.
 * Phase 2 removes the regex prefix-parse once value and unit are separate fields.
 */
export function formatDrawVolumeLabel(drawVolume?: string): string {
  if (!drawVolume?.trim()) return ''
  const trimmed = drawVolume.trim()
  const value = parseNumericDisplayPrefix(trimmed)
  if (value === undefined) return trimmed
  return formatDrawUnitsLabel(value)
}

export interface LabelModelInput {
  readonly compoundName?: string
  readonly compoundAmount?: string
  readonly vialUnit?: 'mg' | 'IU'
  readonly reconstitutionAmount?: string
  readonly reconstitutionType?: string
  readonly concentration?: string

  readonly protocolUnits?: string
  /** Tracks whether Set Draw Volume may safely regenerate this value. */
  readonly protocolUnitsOrigin?: 'recommended' | 'user'
  readonly protocolAmount?: string
  readonly protocolFrequency?: string

  readonly reconstitutionDate?: string
  readonly reconstitutionDateIsFreeText?: boolean
  readonly measureUnit?: 'mg' | 'mcg' | 'IU'

  /** Calculator solve strategy for deriving water volume from protocol. */
  readonly calculatorSolveMode?: 'standard' | 'round_concentration' | 'target_units'
  /** Target concentration when calculatorSolveMode is round_concentration (mg/ml or IU/ml). */
  readonly targetConcentration?: string
  /** Tracks whether Set Concentration may safely regenerate this value. */
  readonly targetConcentrationOrigin?: 'recommended' | 'user'
  /** Insulin syringe capacity in ml for draw visualization (not printed). */
  readonly syringeCapacityMl?: 0.3 | 0.5 | 1.0

  // Global Settings
  readonly dateFormat?: 'YYYYMMDD' | 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD'
  /** Layout template id; defaults to identity header. */
  readonly labelLayoutMode?: LabelLayoutMode

  // Source Info
  readonly vendorName?: string
  readonly groupBuyName?: string
  readonly batchNumber?: string
  readonly batchDate?: string
  readonly batchDateIsFreeText?: boolean

  // COA Links
  readonly vendorCoa?: string
  readonly groupBuyCoa?: string
  readonly testGroupCoa?: string
  readonly myCoa?: string
  readonly customCoa1Name?: string
  readonly customCoa1Link?: string
  readonly customCoa2Name?: string
  readonly customCoa2Link?: string
  /** When false, COA QR codes stay in the sidebar but do not print. Default true. */
  readonly showCoaQr?: boolean

  // Test result indicators (right testing column)
  /** When true, print pass/fail/not-run marks for test types not set to Do Not Print. */
  readonly showTestIndicators?: boolean
  readonly testMass?: 'do_not_print' | 'pass' | 'fail' | 'not_run'
  readonly testPurity?: 'do_not_print' | 'pass' | 'fail' | 'not_run'
  readonly testLcms?: 'do_not_print' | 'pass' | 'fail' | 'not_run'
  readonly testEndotoxin?: 'do_not_print' | 'pass' | 'fail' | 'not_run'
  readonly testSterility?: 'do_not_print' | 'pass' | 'fail' | 'not_run'
  readonly testHeavyMetals?: 'do_not_print' | 'pass' | 'fail' | 'not_run'
  readonly testFentanyl?: 'do_not_print' | 'pass' | 'fail' | 'not_run'

  // Media
  readonly customImage?: string
  /** Logo column width as percent of label inner width (15–45). Default 20. */
  readonly logoColumnWidthPercent?: number
  /** Testing column width as percent of label inner width (25–50). Default 38. */
  readonly qrColumnWidthPercent?: number

  // Status
  readonly isUntested?: boolean

  // Visibility Toggles: Section Level
  readonly showSource?: boolean
  readonly showReconstitution?: boolean
  readonly showProtocol?: boolean

  // Visibility Toggles: Granular Field Level
  readonly showWater?: boolean
  readonly showConcentration?: boolean
  readonly showReconDate?: boolean
  readonly showProtocolAmount?: boolean
  readonly showProtocolUnits?: boolean
  readonly showProtocolFrequency?: boolean
  readonly showVendor?: boolean
  readonly showGroup?: boolean
  readonly showBatch?: boolean
}

export type LabelFieldUpdater = <K extends keyof LabelModelInput>(
  field: K,
  value: LabelModelInput[K],
) => void

/**
 * Mutable field patch for assist/mode updates.
 * `Partial<LabelModelInput>` keeps `readonly` on each key, which blocks sequential assignment.
 */
export type LabelModelPatch = {
  -readonly [K in keyof LabelModelInput]?: LabelModelInput[K]
}