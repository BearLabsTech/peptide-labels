import { exportLabelPng } from '../../app/exportLabelPng'
import type { PrintTarget } from '../../print/types'

export const LABEL_EXPORT_ERROR_MESSAGE = 'Couldn’t download the label. Try again.'

/** Pure export attempt — no React state. Used by the hook and unit-tested directly. */
export async function exportLabelToPng(
  element: HTMLDivElement,
  printTarget: PrintTarget,
  compoundName: string | undefined,
  exportLabel: typeof exportLabelPng,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await exportLabel(element, printTarget, compoundName)
    return { ok: true }
  } catch (error) {
    console.error('Label PNG export failed', error)
    return { ok: false, error: LABEL_EXPORT_ERROR_MESSAGE }
  }
}
