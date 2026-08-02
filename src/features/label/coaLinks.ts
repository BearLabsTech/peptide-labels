import type { LabelModelInput } from './labelModel'

export interface QrCodeEntry {
  readonly type: string
  readonly url: string
}

export function buildQrCodes(input: LabelModelInput): QrCodeEntry[] {
  return [
    { type: 'Vendor COA', url: input.vendorCoa },
    { type: 'GB COA', url: input.groupBuyCoa },
    { type: 'TG COA', url: input.testGroupCoa },
    { type: 'My COA', url: input.myCoa },
    { type: input.customCoa1Name?.trim() || 'Custom 1', url: input.customCoa1Link },
    { type: input.customCoa2Name?.trim() || 'Custom 2', url: input.customCoa2Link },
  ].flatMap((qr) => {
    const url = validCoaUrl(qr.url)
    return url ? [{ type: qr.type, url }] : []
  })
}

function validCoaUrl(value?: string): string | null {
  const trimmed = value?.trim()
  if (!trimmed) return null
  try {
    const parsed = new URL(trimmed)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? trimmed : null
  } catch {
    return null
  }
}
