import { useCallback, useMemo, useState } from 'react'
import { exportLabelPng } from '../label/labelExport'
import { useLabelExport } from '../label/useLabelExport'
import type { PrintSetupSelection, PrintTarget } from '../../print/types'
import type { DesignSlotValues } from './bindDesignSlots'
import type { DesignDocument } from './designDocument'
import type { DesignLibraryStore } from './designLibrary'
import { SAMPLE_MITOCHONDRIA_DESIGN } from './fixtures/sampleMitochondriaDesign'
import { resolveDesignPrintTargetOrDefault } from './resolveDesignPrintTarget'
import { useDesignLibrary } from './useDesignLibrary'
import {
  deriveApplyDesignFlags,
  emptySlotValues,
  exportDesignFileToDisk,
  formatDesignImportIssues,
  importDesignFile,
  openDesignState,
  removeDesignFromLibrary,
  saveDesignToLibrary,
} from './applyDesignOperations'

export {
  stockLabelFor,
  emptySlotValues,
  openDesignState,
  deriveApplyDesignFlags,
  refreshLibraryDesigns,
  saveDesignToLibrary,
  removeDesignFromLibrary,
  importDesignFile,
  exportDesignFileToDisk,
  exportApplyDesignLabelPng,
  formatDesignImportIssues,
} from './applyDesignOperations'

export interface UseApplyDesignViewModelOptions {
  printSelection: PrintSetupSelection
  library?: DesignLibraryStore
  /** Injectable for tests; defaults to the real composition-root export path. */
  exportLabel?: typeof exportLabelPng
}

export interface ApplyDesignViewModel {
  design: DesignDocument
  slotValues: DesignSlotValues
  libraryDesigns: DesignDocument[]
  libraryError: string | null
  /** Path/message lines for a failed design-file import; empty when unused. */
  importIssueLines: readonly string[]
  libraryLoading: boolean
  statusMessage: string | null
  isExporting: boolean
  exportError: string | null
  isBusy: boolean
  printTarget: PrintTarget
  canExportPng: boolean
  isBuiltinSample: boolean
  isInLibrary: boolean
  openDesign: (next: DesignDocument) => void
  updateSlot: (key: string, value: string) => void
  downloadLabelPng: (element: HTMLDivElement | null) => Promise<void>
  saveToLibrary: () => Promise<void>
  exportDesignFile: () => void
  removeFromLibrary: () => Promise<void>
  importFile: (file: File | undefined) => Promise<void>
}

/**
 * Owns every decision for {@link ../ApplyDesignView.tsx}: which design is open, its slot
 * values, the local library listing, and the export/save/import/remove orchestration.
 * The component's only job is to call this hook and render its return value.
 */
export function useApplyDesignViewModel({
  printSelection,
  library: libraryProp,
  exportLabel = exportLabelPng,
}: UseApplyDesignViewModelOptions): ApplyDesignViewModel {
  const {
    library,
    designs: libraryDesigns,
    error: libraryError,
    isLoading: libraryLoading,
    setError: setLibraryError,
    refresh: refreshLibrary,
  } = useDesignLibrary({ library: libraryProp })
  const {
    isExporting,
    exportError,
    clearExportError,
    exportPng,
  } = useLabelExport({ exportLabel })

  const [design, setDesign] = useState<DesignDocument>(SAMPLE_MITOCHONDRIA_DESIGN)
  const [slotValues, setSlotValues] = useState<DesignSlotValues>(() =>
    emptySlotValues(SAMPLE_MITOCHONDRIA_DESIGN.slots.map((slot) => slot.key)),
  )
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)
  const [importIssueLines, setImportIssueLines] = useState<readonly string[]>([])

  const printTarget = useMemo(
    () =>
      resolveDesignPrintTargetOrDefault(design, {
        printerId: printSelection.printerId,
        vialCapacityMl: printSelection.vialCapacityMl ?? printSelection.vialMl,
      }),
    [design, printSelection.printerId, printSelection.vialCapacityMl, printSelection.vialMl],
  )

  const { canExportPng, isBuiltinSample, isInLibrary } = deriveApplyDesignFlags(
    design,
    slotValues,
    libraryDesigns,
  )

  const openDesign = useCallback((next: DesignDocument) => {
    const state = openDesignState(next)
    setDesign(state.design)
    setSlotValues(state.slotValues)
    clearExportError()
    setStatusMessage(state.statusMessage)
  }, [clearExportError])

  const updateSlot = useCallback((key: string, value: string) => {
    setSlotValues((prev) => ({ ...prev, [key]: value }))
  }, [])

  const downloadLabelPng = useCallback(
    async (element: HTMLDivElement | null) => {
      if (!element || !canExportPng || isExporting) return
      const compoundName = slotValues.compoundName?.trim() || design.name
      await exportPng(element, printTarget, compoundName)
    },
    [canExportPng, isExporting, slotValues.compoundName, design.name, printTarget, exportPng],
  )

  const saveToLibrary = useCallback(async () => {
    setIsBusy(true)
    setStatusMessage(null)
    const result = await saveDesignToLibrary(library, design, isBuiltinSample, isInLibrary)
    if (result.ok) {
      await refreshLibrary()
      openDesign(result.saved)
      setStatusMessage('Saved to your local library (private on this device).')
    } else {
      setLibraryError(result.error)
    }
    setIsBusy(false)
  }, [library, design, isBuiltinSample, isInLibrary, refreshLibrary, openDesign, setLibraryError])

  const exportDesignFile = useCallback(() => {
    setIsBusy(true)
    setStatusMessage(null)
    const result = exportDesignFileToDisk(design)
    if (result.ok) {
      setStatusMessage('Design file downloaded — send it in a message to share.')
    } else {
      setLibraryError(result.error)
    }
    setIsBusy(false)
  }, [design, setLibraryError])

  const removeFromLibrary = useCallback(async () => {
    if (isBuiltinSample || !isInLibrary) return
    setIsBusy(true)
    const result = await removeDesignFromLibrary(library, design.id)
    if (result.ok) {
      await refreshLibrary()
      openDesign(SAMPLE_MITOCHONDRIA_DESIGN)
      setStatusMessage('Removed from your local library.')
    } else {
      setLibraryError(result.error)
    }
    setIsBusy(false)
  }, [isBuiltinSample, isInLibrary, library, design.id, refreshLibrary, openDesign, setLibraryError])

  const importFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return
      setIsBusy(true)
      setLibraryError(null)
      setImportIssueLines([])
      const result = await importDesignFile(library, file)
      if (result.ok) {
        await refreshLibrary()
        openDesign(result.imported)
        setStatusMessage('Imported and saved to your local library.')
      } else {
        setLibraryError(result.error)
        setImportIssueLines(
          result.issues ? formatDesignImportIssues(result.issues) : [],
        )
      }
      setIsBusy(false)
    },
    [library, refreshLibrary, openDesign, setLibraryError],
  )

  return {
    design,
    slotValues,
    libraryDesigns,
    libraryError,
    importIssueLines,
    libraryLoading,
    statusMessage,
    isExporting,
    exportError,
    isBusy,
    printTarget,
    canExportPng,
    isBuiltinSample,
    isInLibrary,
    openDesign,
    updateSlot,
    downloadLabelPng,
    saveToLibrary,
    exportDesignFile,
    removeFromLibrary,
    importFile,
  }
}
