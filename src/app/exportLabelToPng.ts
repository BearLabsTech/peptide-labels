import { exportLabelPng } from './exportLabelPng'
import type { PrintTarget } from '../print/types'
import type { Result } from '../shared/result'
import { err, ok } from '../shared/result'

export const LABEL_EXPORT_ERROR_MESSAGE = 'Couldn’t download the label. Try again.'

/** Pure export attempt — no React state. Used by the hook and unit-tested directly. */
export async function exportLabelToPng(
  element: HTMLDivElement,
  printTarget: PrintTarget,
  compoundName: string | undefined,
  exportLabel: typeof exportLabelPng,
): Promise<Result<void, string>> {
  try {
    await exportLabel(element, printTarget, compoundName)
    return ok()
  } catch (error) {
    console.error('Label PNG export failed', error)
    return err(LABEL_EXPORT_ERROR_MESSAGE)
  }
}
