import type { ResolvedLabelMath } from './LabelMathResolver'
import type { LabelModelInput } from './labelModel'
import { formatDrawVolumeLabel, parseNumericDisplayPrefix } from './labelModel'
import { formatDisplayNumber, hasPositiveVialAmount } from './peptideMath'

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
    protocolLines: buildProtocolLines(input),
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
  if (input.showVendor !== false && input.vendorName) lines.push(`Vendor: ${input.vendorName}`)
  if (input.showGroup !== false && input.groupBuyName) lines.push(`Group: ${input.groupBuyName}`)
  if (input.showBatch !== false && (input.batchNumber || input.batchDate)) {
    const batchParts: string[] = []
    if (input.batchNumber) batchParts.push(`Lot: ${input.batchNumber}`)
    if (input.batchDate) batchParts.push(formatLabelDate(input.batchDate, input.dateFormat))
    lines.push(batchParts.join(' '))
  }
  return lines
}

function buildProtocolLines(input: LabelModelInput): string[] {
  if (input.showProtocol === false) return []
  const lines: string[] = []
  const units = input.showProtocolUnits !== false
    ? formatDrawVolumeLabel(input.protocolUnits)
    : ''
  const amount = input.showProtocolAmount !== false
    ? formatAmount(input.protocolAmount, input.measureUnit || 'mcg')
    : ''

  if (units && amount) lines.push(`${units} (${amount})`)
  else if (units || amount) lines.push(units || amount)
  if (input.showProtocolFrequency !== false && input.protocolFrequency) {
    lines.push(input.protocolFrequency)
  }
  return lines
}

function buildReconstitutionLines(
  input: LabelModelInput,
  resolved: ResolvedLabelMath,
): string[] {
  if (input.showReconstitution === false) return []
  if (!hasPositiveVialAmount(input.compoundAmount)) return []
  const lines: string[] = []
  const waterAmount = input.reconstitutionAmount || resolved.autoWater || ''
  const concentration = resolved.autoConcentration || input.concentration || ''

  if (input.showWater !== false && (waterAmount || input.reconstitutionType)) {
    // Calculator display uses formatWaterAmountLabel (no unit). Print path adds " ml" here.
    const waterValue = waterAmount ? parseNumericDisplayPrefix(waterAmount) : undefined
    const waterLabel = waterValue !== undefined
      ? `${formatDisplayNumber(waterValue)} ml`
      : (waterAmount || '').trim()
    lines.push(`${waterLabel} ${input.reconstitutionType || ''}`.trim())
  }
  if (input.showConcentration !== false && concentration) lines.push(concentration)
  if (input.showReconDate !== false && input.reconstitutionDate) {
    lines.push(`Mixed ${formatLabelDate(input.reconstitutionDate, input.dateFormat)}`)
  }
  return lines
}
