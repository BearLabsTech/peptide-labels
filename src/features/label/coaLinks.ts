import type { LabelModelInput } from './labelModel'
import { COA_QR_CAPTIONS } from './uiStrings'

export interface QrCodeEntry {
  readonly type: string
  readonly url: string
}

export function buildQrCodes(input: LabelModelInput): QrCodeEntry[] {
  return [
    { type: COA_QR_CAPTIONS.vendor, url: input.vendorCoa },
    { type: COA_QR_CAPTIONS.groupBuy, url: input.groupBuyCoa },
    { type: COA_QR_CAPTIONS.testGroup, url: input.testGroupCoa },
    { type: COA_QR_CAPTIONS.my, url: input.myCoa },
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
    // Expected validation path for non-URL strings — not an I/O failure.
    return null
  }
}
