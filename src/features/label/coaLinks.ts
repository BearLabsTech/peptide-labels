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

  // Accept bare domains (www.example.com) by assuming https — matches how people
  // paste links, while still rejecting non-http(s) schemes.
  const candidates =
    /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed) ? [trimmed] : [`https://${trimmed}`, trimmed]

  for (const candidate of candidates) {
    try {
      const parsed = new URL(candidate)
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') return candidate
    } catch {
      // Expected validation path for non-URL strings — not an I/O failure.
    }
  }
  return null
}
