import { useCallback, useState } from 'react'
import { flushSync } from 'react-dom'
import { exportLabelPng } from './labelExport'
import type { PrintTarget } from '../../print/types'

export const LABEL_EXPORT_ERROR_MESSAGE = 'Couldn’t download the label. Try again.'

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
  ) => Promise<{ ok: true } | { ok: false; error: string }>
}

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

/**
 * Thin React wrapper around {@link exportLabelPng} / `ExportLabelUseCase`.
 * Holds only export busy/error state; the use case itself is already tested.
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
    ): Promise<{ ok: true } | { ok: false; error: string }> => {
      if (isExporting) {
        return { ok: false, error: LABEL_EXPORT_ERROR_MESSAGE }
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
