/** Shipped and future label layout templates. Add variants here as new templates ship. */
export type LabelLayoutMode = 'identityHeader'

export const DEFAULT_LABEL_LAYOUT_MODE: LabelLayoutMode = 'identityHeader'

export function resolveLabelLayoutMode(input: LabelModelInput): LabelLayoutMode {
  return input.labelLayoutMode ?? DEFAULT_LABEL_LAYOUT_MODE
}

import { formatDrawUnitsLabel } from './peptideMath'

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

/** What compound is in the vial, and how much — the identity of the thing being labeled. */
export interface CompoundIdentity {
  readonly compoundName?: string
  readonly compoundAmount?: string
  readonly vialUnit?: 'mg' | 'IU'
  readonly isUntested?: boolean
}

/**
 * How the vial was mixed, and the resulting concentration.
 * Water naming layers: `reconstitutionAmount` is the authored/storage field
 * (label section name); math uses numeric `waterMl`; derived display uses
 * `autoWater`. Do not invent a fourth name for the same quantity.
 */
export interface Reconstitution {
  readonly reconstitutionAmount?: string
  readonly reconstitutionType?: string
  readonly concentration?: string
  readonly reconstitutionDate?: string
  readonly reconstitutionDateIsFreeText?: boolean
}

/**
 * The measured amount, unit, and frequency printed as the usage protocol.
 * Draw volume on the label/UI is stored as `protocolUnits` (COPY-GUIDELINES);
 * math uses numeric `drawUnits` / `drawVolumeMl` for the physical quantity.
 */
export interface Protocol {
  readonly protocolAmount?: string
  readonly protocolUnits?: string
  /** Tracks whether Set Draw Volume may safely regenerate this value. */
  readonly protocolUnitsOrigin?: 'recommended' | 'user'
  readonly protocolFrequency?: string
  readonly measureUnit?: 'mg' | 'mcg' | 'IU'
}

/** Calculator assist configuration — which solve strategy is active and its target. */
export interface CalculatorSettings {
  /** Calculator solve strategy for deriving water volume from protocol. */
  readonly calculatorSolveMode?: 'standard' | 'round_concentration' | 'target_units'
  /** Target concentration when calculatorSolveMode is round_concentration (mg/ml or IU/ml). */
  readonly targetConcentration?: string
  /** Tracks whether Set Concentration may safely regenerate this value. */
  readonly targetConcentrationOrigin?: 'recommended' | 'user'
  /** Insulin syringe capacity in ml for draw visualization (not printed). */
  readonly syringeCapacityMl?: 0.3 | 0.5 | 1.0
}

/** Where the compound and its testing came from. */
export interface Sourcing {
  readonly vendorName?: string
  readonly groupBuyName?: string
  readonly batchNumber?: string
  readonly batchDate?: string
  readonly batchDateIsFreeText?: boolean
}

/** Links to certificates of analysis, printed as QR codes. */
export interface CoaLinks {
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
}

/** Pass/fail/not-run indicators for each test type, printed in the testing column. */
export interface Testing {
  /** When true, print pass/fail/not-run marks for test types not set to Do Not Print. */
  readonly showTestIndicators?: boolean
  readonly testMass?: 'do_not_print' | 'pass' | 'fail' | 'not_run'
  readonly testPurity?: 'do_not_print' | 'pass' | 'fail' | 'not_run'
  readonly testLcms?: 'do_not_print' | 'pass' | 'fail' | 'not_run'
  readonly testEndotoxin?: 'do_not_print' | 'pass' | 'fail' | 'not_run'
  readonly testSterility?: 'do_not_print' | 'pass' | 'fail' | 'not_run'
  readonly testHeavyMetals?: 'do_not_print' | 'pass' | 'fail' | 'not_run'
  readonly testFentanyl?: 'do_not_print' | 'pass' | 'fail' | 'not_run'
}

/** Global formatting preferences, layout template choice, and logo/media sizing. */
export interface Presentation {
  readonly dateFormat?: 'YYYYMMDD' | 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD'
  /** Layout template id; defaults to identity header. */
  readonly labelLayoutMode?: LabelLayoutMode
  readonly customImage?: string
  /** Logo column width as percent of label inner width (15–45). Default 20. */
  readonly logoColumnWidthPercent?: number
  /** Testing column width as percent of label inner width (25–50). Default 38. */
  readonly qrColumnWidthPercent?: number
}

/** Which sections and fields print on the label, independent of whether a value is set. */
export interface PrintVisibility {
  // Section level
  readonly showSource?: boolean
  readonly showReconstitution?: boolean
  readonly showProtocol?: boolean

  // Granular field level
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

/**
 * Every field the calculator and label designer read or write, composed from
 * the cohesive sub-models above. An intersection, not a nested object, so
 * every existing flat call site (`input.compoundName`, `input.waterMl`, etc.)
 * keeps compiling unchanged — the sub-models are a grouping of this type's
 * own fields, not a new nested shape callers must adopt.
 */
export type LabelModelInput = CompoundIdentity
  & Reconstitution
  & Protocol
  & CalculatorSettings
  & Sourcing
  & CoaLinks
  & Testing
  & Presentation
  & PrintVisibility

/**
 * Pairs a value with whether it should render on the label. Reading a field
 * through one accessor keeps "should this print?" and "what prints?" in sync,
 * so a value can never leak onto the label past a false visibility flag.
 * `LabelModelInput` keeps the value and its `show<X>` flag as separate flat
 * fields (for backward-compatible call sites); this is the read-side pairing.
 */
export interface PrintableField<T> {
  readonly value: T | undefined
  readonly visible: boolean
}

/** Reads a flat `value` / `show<X>` field pair (show defaults to true) into one PrintableField. */
export function printableField<T>(value: T | undefined, showFlag: boolean | undefined): PrintableField<T> {
  return { value, visible: showFlag !== false }
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