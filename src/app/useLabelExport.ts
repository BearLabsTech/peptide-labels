import { useCallback, useState } from 'react'
import { flushSync } from 'react-dom'
import { exportLabelPng } from './exportLabelPng'
import { exportLabelToPng } from './exportLabelToPng'
import type { PrintTarget } from '../print/types'
import type { Result } from '../shared/result'
import { ok } from '../shared/result'

export { LABEL_EXPORT_ERROR_MESSAGE, exportLabelToPng } from './exportLabelToPng'

export interface UseLabelExportOptions {
  /** Injectable for tests; defaults to the real composition-root export path. */
  exportLabel?: typeof exportLabelPng
}

export interface LabelExportState {
  readonly isExporting: boolean
  readonly exportError: string | null
  readonly clearExportError: () => void
  readonly exportPng: (
    element: HTMLDivElement,
    printTarget: PrintTarget,
    compoundName?: string,
  ) => Promise<Result<void, string>>
}

/**
 * Thin React wrapper around {@link exportLabelPng} / `ExportLabelUseCase`.
 * Shared by the structured designer and apply-design — holds only busy/error state.
 */
export function useLabelExport({
  exportLabel = exportLabelPng,
}: UseLabelExportOptions = {}): LabelExportState {
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  const clearExportError = useCallback(() => setExportError(null), [])

  const exportPng = useCallback(
    async (
      element: HTMLDivElement,
      printTarget: PrintTarget,
      compoundName?: string,
    ): Promise<Result<void, string>> => {
      if (isExporting) {
        // Both current callers (useLabelStageViewModel, useApplyDesignViewModel)
        // already guard on isExporting before calling exportPng, so this only
        // fires on a caller that skips that guard or a same-tick double-call
        // before state propagates. Either way, an export is genuinely already
        // running - report success (nothing to retry), not LABEL_EXPORT_ERROR_MESSAGE,
        // which would incorrectly tell the user their download failed.
        return ok()
      }
      flushSync(() => {
        setIsExporting(true)
        setExportError(null)
      })
      const result = await exportLabelToPng(element, printTarget, compoundName, exportLabel)
      if (!result.ok) setExportError(result.error)
      setIsExporting(false)
      return result
    },
    [exportLabel, isExporting],
  )

  return { isExporting, exportError, clearExportError, exportPng }
}
