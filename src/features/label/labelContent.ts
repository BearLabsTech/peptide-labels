import type { ResolvedLabelMath } from './LabelMathResolver'
import {
  displayConcentration,
  displayDrawUnits,
  displayWaterAmount,
} from './calculatorModeSwitch'
import type { LabelModelInput } from './labelModel'
import { formatDrawVolumeLabel, parseNumericDisplayPrefix, printableField } from './labelModel'
import { formatDisplayNumber, hasPositiveCompoundAmount, resolveCalculatorMode } from './peptideMath'

export interface LabelContent {
  readonly title: string
  readonly demotedTitle?: string
  readonly sourceLines: readonly string[]
  readonly reconstitutionLines: readonly string[]
  readonly protocolLines: readonly string[]
}

export function buildLabelContent(
  input: LabelModelInput,
  resolved: ResolvedLabelMath,
): LabelContent {
  const { title, demotedTitle } = buildTitles(input)
  return {
    title,
    demotedTitle,
    sourceLines: buildSourceLines(input),
    reconstitutionLines: buildReconstitutionLines(input, resolved),
    protocolLines: buildProtocolLines(input, resolved),
  }
}

export function formatLabelDate(
  date: string | undefined,
  format: LabelModelInput['dateFormat'] = 'YYYYMMDD',
): string {
  if (!date) return ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return date
  const [year, month, day] = date.split('-')
  switch (format) {
    case 'MM/DD/YYYY': return `${month}/${day}/${year}`
    case 'DD/MM/YYYY': return `${day}/${month}/${year}`
    case 'YYYY-MM-DD': return date
    case 'YYYYMMDD':
    default: return `${year}${month}${day}`
  }
}

/**
 * Ensures `reconstitutionAmount` carries an `ml` suffix before compose.
 * Immutable — returns the same input when the amount is empty or already
 * includes `ml`. The content builder still re-parses and formats display
 * water as `"N ml"`; this keeps the compose input shape the designer
 * historically passed through.
 */
export function withReconstitutionMlSuffix(input: LabelModelInput): LabelModelInput {
  const amount = input.reconstitutionAmount
  if (!amount || amount.includes('ml')) return input
  return { ...input, reconstitutionAmount: `${amount}ml` }
}

function buildTitles(input: LabelModelInput): Pick<LabelContent, 'title' | 'demotedTitle'> {
  const amountLine = formatAmount(input.compoundAmount, input.vialUnit || 'mg')
  const nameLine = (input.compoundName || '').trim()
  const fullCompound = [nameLine, amountLine].filter(Boolean).join('\n')
  if (input.isUntested) {
    return { title: 'DANGER\nUNTESTED', demotedTitle: fullCompound || undefined }
  }
  return { title: fullCompound, demotedTitle: undefined }
}

function formatAmount(amount: string | undefined, unit: string): string {
  if (!amount) return ''
  return `${amount.trim().replace(/(mg|mcg|iu)$/i, '').trim()}${unit}`
}

function buildSourceLines(input: LabelModelInput): string[] {
  if (input.showSource === false) return []
  const lines: string[] = []
  const vendor = printableField(input.vendorName, input.showVendor)
  if (vendor.visible && vendor.value) lines.push(`Vendor: ${vendor.value}`)
  const group = printableField(input.groupBuyName, input.showGroup)
  if (group.visible && group.value) lines.push(`Group: ${group.value}`)
  // Batch combines two source fields (number, date) rather than one value, so it
  // stays a direct visibility check instead of PrintableField<T>.
  if (input.showBatch !== false && (input.batchNumber || input.batchDate)) {
    const batchParts: string[] = []
    if (input.batchNumber) batchParts.push(`Lot: ${input.batchNumber}`)
    if (input.batchDate) batchParts.push(formatLabelDate(input.batchDate, input.dateFormat))
    lines.push(batchParts.join(' '))
  }
  return lines
}

function buildProtocolLines(input: LabelModelInput, resolved: ResolvedLabelMath): string[] {
  if (input.showProtocol === false) return []
  const lines: string[] = []
  const mode = resolveCalculatorMode(input)
  // Prefer derived draw units the same way the calculator UI does — never rely on
  // a write-back merge of autoUnits into authored protocolUnits.
  const unitsField = printableField(
    displayDrawUnits(mode, input, resolved) || undefined,
    input.showProtocolUnits,
  )
  const units = unitsField.visible ? formatDrawVolumeLabel(unitsField.value) : ''
  const amountField = printableField(input.protocolAmount, input.showProtocolAmount)
  const amount = amountField.visible ? formatAmount(amountField.value, input.measureUnit || 'mcg') : ''

  if (units && amount) lines.push(`${units} (${amount})`)
  else if (units || amount) lines.push(units || amount)
  const frequency = printableField(input.protocolFrequency, input.showProtocolFrequency)
  if (frequency.visible && frequency.value) {
    lines.push(frequency.value)
  }
  return lines
}

function buildReconstitutionLines(
  input: LabelModelInput,
  resolved: ResolvedLabelMath,
): string[] {
  if (input.showReconstitution === false) return []
  if (!hasPositiveCompoundAmount(input.compoundAmount)) return []
  const lines: string[] = []
  const mode = resolveCalculatorMode(input)
  // Same preference order as calculator display helpers — authored and derived stay separate.
  const waterAmount = displayWaterAmount(mode, input, resolved)
  const concentration = displayConcentration(input, resolved)

  const water = printableField(waterAmount || undefined, input.showWater)
  if (water.visible && (water.value || input.reconstitutionType)) {
    // Calculator display uses formatWaterAmountLabel (no unit). Print path adds " ml" here.
    const waterValue = water.value ? parseNumericDisplayPrefix(water.value) : undefined
    const waterLabel = waterValue !== undefined
      ? `${formatDisplayNumber(waterValue)} ml`
      : (water.value || '').trim()
    lines.push(`${waterLabel} ${input.reconstitutionType || ''}`.trim())
  }
  const concentrationField = printableField(concentration || undefined, input.showConcentration)
  if (concentrationField.visible && concentrationField.value) lines.push(concentrationField.value)
  const reconDate = printableField(input.reconstitutionDate, input.showReconDate)
  if (reconDate.visible && reconDate.value) {
    lines.push(`Mixed ${formatLabelDate(reconDate.value, input.dateFormat)}`)
  }
  return lines
}
