import type { DesignDocument, DesignQrContent, DesignTextContent } from './designDocument'

export type DesignSlotValues = Record<string, string>

/** Resolve static or slot-bound text for preview/export. */
export function resolveBoundText(
  content: DesignTextContent | DesignQrContent,
  slotValues: DesignSlotValues,
): string {
  if (content.kind === 'static') return content.text
  return slotValues[content.slotKey]?.trim() ?? ''
}

/** True when every required slot has a non-empty value. */
export function areRequiredSlotsFilled(
  design: DesignDocument,
  slotValues: DesignSlotValues,
): boolean {
  return design.slots
    .filter((slot) => slot.required)
    .every((slot) => (slotValues[slot.key] ?? '').trim().length > 0)
}

/** Build a data URL for an embedded design asset. */
export function designAssetDataUrl(mimeType: string, dataBase64: string): string {
  return `data:${mimeType};base64,${dataBase64}`
}
