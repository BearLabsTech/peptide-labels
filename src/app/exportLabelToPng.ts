import { exportLabelPng } from './exportLabelPng'
import type { PrintTarget } from '../print/types'
import type { Result } from '../shared/result'

export { LABEL_EXPORT_ERROR_MESSAGE } from './ExportLabelUseCase'

/** Pure export attempt — no React state. Used by the hook and unit-tested directly. */
export async function exportLabelToPng(
  element: HTMLDivElement,
  printTarget: PrintTarget,
  compoundName: string | undefined,
  exportLabel: typeof exportLabelPng,
): Promise<Result<void, string>> {
  return exportLabel(element, printTarget, compoundName)
}
