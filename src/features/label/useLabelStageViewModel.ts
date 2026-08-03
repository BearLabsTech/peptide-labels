import { useCallback, useState } from 'react'
import { exportLabelPng } from './labelExport'
import type { PrintTarget } from '../../print/types'

export interface UseLabelStageViewModelOptions {
    printTarget: PrintTarget
    compoundName?: string
    isExampleMode?: boolean
    /** Injectable for tests; defaults to the real composition-root export path. */
    exportLabel?: typeof exportLabelPng
}

export interface LabelStageViewModel {
    isExporting: boolean
    exportError: string | null
    downloadDisabled: boolean
    downloadLabel: (element: HTMLDivElement | null) => Promise<void>
}

export async function exportLabelToPng(
    element: HTMLDivElement,
    printTarget: PrintTarget,
    compoundName: string | undefined,
    exportLabel: typeof exportLabelPng,
): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
        await exportLabel(element, printTarget, compoundName)
        return { ok: true }
    } catch {
        return { ok: false, error: 'Couldn’t download the label. Try again.' }
    }
}

/**
 * Owns the export state and orchestration for {@link LabelStage.tsx}. Export itself goes
 * through the existing Phase 4 `exportLabelPng` -> `ExportLabelUseCase` path, not a raw
 * rasterize call.
 */
export function useLabelStageViewModel({
    printTarget,
    compoundName,
    isExampleMode = false,
    exportLabel = exportLabelPng,
}: UseLabelStageViewModelOptions): LabelStageViewModel {
    const [isExporting, setIsExporting] = useState(false)
    const [exportError, setExportError] = useState<string | null>(null)

    const downloadLabel = useCallback(
        async (element: HTMLDivElement | null) => {
            if (!element || isExampleMode || isExporting) return
            setIsExporting(true)
            setExportError(null)
            const result = await exportLabelToPng(element, printTarget, compoundName, exportLabel)
            if (!result.ok) setExportError(result.error)
            setIsExporting(false)
        },
        [isExampleMode, isExporting, printTarget, compoundName, exportLabel],
    )

    return {
        isExporting,
        exportError,
        downloadDisabled: isExampleMode || isExporting,
        downloadLabel,
    }
}
