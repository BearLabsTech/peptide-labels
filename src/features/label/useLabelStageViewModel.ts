import { useCallback } from 'react'
import { exportLabelPng } from './labelExport'
import { useLabelExport } from './useLabelExport'
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

/** Re-export for existing tests that target the pure export helper. */
export { exportLabelToPng } from './useLabelExport'

/**
 * Owns the export state and orchestration for {@link LabelStage.tsx}. Export itself goes
 * through {@link useLabelExport} -> `exportLabelPng` -> `ExportLabelUseCase`.
 */
export function useLabelStageViewModel({
    printTarget,
    compoundName,
    isExampleMode = false,
    exportLabel = exportLabelPng,
}: UseLabelStageViewModelOptions): LabelStageViewModel {
    const { isExporting, exportError, exportPng } = useLabelExport({ exportLabel })

    const downloadLabel = useCallback(
        async (element: HTMLDivElement | null) => {
            if (!element || isExampleMode || isExporting) return
            await exportPng(element, printTarget, compoundName)
        },
        [isExampleMode, isExporting, printTarget, compoundName, exportPng],
    )

    return {
        isExporting,
        exportError,
        downloadDisabled: isExampleMode || isExporting,
        downloadLabel,
    }
}
