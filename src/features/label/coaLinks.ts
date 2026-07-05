import type { LabelModelInput } from './labelModel'

export interface QrCodeEntry {
  type: string
  url: string
}

export function hasCoaLinks(input: LabelModelInput): boolean {
  return buildQrCodes(input).length > 0
}

export function buildQrCodes(input: LabelModelInput): QrCodeEntry[] {
  return [
    { type: 'Vendor COA', url: input.vendorCoa },
    { type: 'GB COA', url: input.groupBuyCoa },
    { type: 'TG COA', url: input.testGroupCoa },
    { type: 'My COA', url: input.myCoa },
    { type: input.customCoa1Name || 'Custom 1', url: input.customCoa1Link },
    { type: input.customCoa2Name || 'Custom 2', url: input.customCoa2Link },
  ].filter((qr): qr is QrCodeEntry => !!qr.url)
}
