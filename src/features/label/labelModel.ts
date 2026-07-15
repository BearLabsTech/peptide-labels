/** Shipped and future label layout templates. Add variants here as new templates ship. */
export type LabelLayoutMode = 'identityHeader'

export const DEFAULT_LABEL_LAYOUT_MODE: LabelLayoutMode = 'identityHeader'

export function resolveLabelLayoutMode(input: LabelModelInput): LabelLayoutMode {
  return input.labelLayoutMode ?? DEFAULT_LABEL_LAYOUT_MODE
}

import { formatDisplayNumber } from './peptideMath'

/** Formats a water volume for label display, always including the ml unit. */
export function formatWaterVolumeLabel(amount?: string): string {
  if (!amount?.trim()) return ''
  const match = amount.trim().match(/^([\d.]+)/)
  if (!match) return amount.trim()
  const value = parseFloat(match[1])
  if (!Number.isFinite(value)) return amount.trim()
  return `${formatDisplayNumber(value)} ml`
}

/** Formats draw volume for label display, always including the units suffix. */
export function formatDrawVolumeLabel(drawVolume?: string): string {
  if (!drawVolume?.trim()) return ''
  const trimmed = drawVolume.trim()
  const match = trimmed.match(/^([\d.]+)/)
  if (!match) return trimmed
  const value = parseFloat(match[1])
  if (!Number.isFinite(value)) return trimmed
  return `${formatDisplayNumber(value)} units`
}

export interface LabelModelInput {
  compoundName?: string
  compoundAmount?: string
  vialUnit?: 'mg' | 'IU'
  reconstitutionAmount?: string
  reconstitutionType?: string
  concentration?: string

  protocolUnits?: string
  /** Tracks whether Set Draw Volume may safely regenerate this value. */
  protocolUnitsOrigin?: 'recommended' | 'user'
  protocolAmount?: string
  protocolFrequency?: string

  reconstitutionDate?: string
  reconstitutionDateIsFreeText?: boolean
  measureUnit?: 'mg' | 'mcg' | 'IU'

  /** Calculator solve strategy for deriving water volume from protocol. */
  calculatorSolveMode?: 'standard' | 'round_concentration' | 'target_units'
  /** Target concentration when calculatorSolveMode is round_concentration (mg/ml or IU/ml). */
  targetConcentration?: string
  /** Tracks whether Set Concentration may safely regenerate this value. */
  targetConcentrationOrigin?: 'recommended' | 'user'
  /** Insulin syringe capacity in ml for draw visualization (not printed). */
  syringeCapacityMl?: 0.3 | 0.5 | 1.0

  // Global Settings
  dateFormat?: 'YYYYMMDD' | 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD'
  /** Layout template id; defaults to identity header. */
  labelLayoutMode?: LabelLayoutMode

  // Source Info
  vendorName?: string
  groupBuyName?: string
  batchNumber?: string
  batchDate?: string
  batchDateIsFreeText?: boolean

  // COA Links
  vendorCoa?: string
  groupBuyCoa?: string
  testGroupCoa?: string
  myCoa?: string
  customCoa1Name?: string
  customCoa1Link?: string
  customCoa2Name?: string
  customCoa2Link?: string
  /** When false, COA QR codes stay in the sidebar but do not print. Default true. */
  showCoaQr?: boolean

  // Test result indicators (right testing column)
  /** When true, print pass/fail/not-run marks for test types not set to Do Not Print. */
  showTestIndicators?: boolean
  testMass?: 'do_not_print' | 'pass' | 'fail' | 'not_run'
  testPurity?: 'do_not_print' | 'pass' | 'fail' | 'not_run'
  testLcms?: 'do_not_print' | 'pass' | 'fail' | 'not_run'
  testEndotoxin?: 'do_not_print' | 'pass' | 'fail' | 'not_run'
  testSterility?: 'do_not_print' | 'pass' | 'fail' | 'not_run'
  testHeavyMetals?: 'do_not_print' | 'pass' | 'fail' | 'not_run'
  testFentanyl?: 'do_not_print' | 'pass' | 'fail' | 'not_run'

  // Media
  customImage?: string
  /** Logo column width as percent of label inner width (15–45). Default 20. */
  logoColumnWidthPercent?: number
  /** Testing column width as percent of label inner width (25–50). Default 38. */
  qrColumnWidthPercent?: number

  // Status
  isUntested?: boolean

  // Visibility Toggles: Section Level
  showSource?: boolean
  showReconstitution?: boolean
  showProtocol?: boolean

  // Visibility Toggles: Granular Field Level
  showWater?: boolean
  showConcentration?: boolean
  showReconDate?: boolean
  showProtocolAmount?: boolean
  showProtocolUnits?: boolean
  showProtocolFrequency?: boolean
  showVendor?: boolean
  showGroup?: boolean
  showBatch?: boolean
}

export type LabelFieldUpdater = <K extends keyof LabelModelInput>(
  field: K,
  value: LabelModelInput[K],
) => void
