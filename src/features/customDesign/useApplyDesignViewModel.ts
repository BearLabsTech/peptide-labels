import { useCallback, useMemo, useState } from 'react'
import { exportLabelPng } from '../label/labelExport'
import { useLabelExport } from '../label/useLabelExport'
import type { PrintSetupSelection, PrintTarget } from '../../print/types'
import { areRequiredSlotsFilled, type DesignSlotValues } from './bindDesignSlots'
import type { DesignDocument } from './designDocument'
import {
  prepareDesignForLibrary,
  touchDesignUpdatedAt,
  type DesignLibraryStore,
} from './designLibrary'
import type { FileDownloader } from '../label/domain/ports'
import {
  downloadDesignPackage,
  readDesignPackageFile,
} from './designPackage'
import { SAMPLE_MITOCHONDRIA_DESIGN } from './fixtures/sampleMitochondriaDesign'
import { resolveDesignPrintTargetOrDefault } from './resolveDesignPrintTarget'
import { useDesignLibrary } from './useDesignLibrary'

export interface UseApplyDesignViewModelOptions {
  printSelection: PrintSetupSelection
  library?: DesignLibraryStore
  /** Injectable for tests; defaults to the real composition-root export path. */
  exportLabel?: typeof exportLabelPng
}

type SaveResult =
  | { ok: true; saved: DesignDocument }
  | { ok: false; error: string }

type SimpleResult = { ok: true } | { ok: false; error: string }

type ImportResult =
  | { ok: true; imported: DesignDocument }
  | { ok: false; error: string }

export interface ApplyDesignViewModel {
  design: DesignDocument
  slotValues: DesignSlotValues
  libraryDesigns: DesignDocument[]
  libraryError: string | null
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

/** Human-readable stock label shown next to a design in the library list and banner. */
export function stockLabelFor(design: DesignDocument): string {
  return design.stock.kind === 'catalog'
    ? design.stock.stockId
    : `${design.stock.widthMm} × ${design.stock.heightMm} mm`
}

/** Blank slot values for a freshly opened design — every slot starts empty. */
export function emptySlotValues(keys: string[]): DesignSlotValues {
  return Object.fromEntries(keys.map((key) => [key, '']))
}

/** The bundle of state that changes together whenever the open design switches. */
export function openDesignState(next: DesignDocument): {
  design: DesignDocument
  slotValues: DesignSlotValues
  exportError: null
  statusMessage: null
} {
  return {
    design: next,
    slotValues: emptySlotValues(next.slots.map((slot) => slot.key)),
    exportError: null,
    statusMessage: null,
  }
}

/** Derived flags a bug could silently get wrong without this being unit-tested directly. */
export function deriveApplyDesignFlags(
  design: DesignDocument,
  slotValues: DesignSlotValues,
  libraryDesigns: DesignDocument[],
): { canExportPng: boolean; isBuiltinSample: boolean; isInLibrary: boolean } {
  return {
    canExportPng: areRequiredSlotsFilled(design, slotValues),
    isBuiltinSample: design.id === SAMPLE_MITOCHONDRIA_DESIGN.id,
    isInLibrary: libraryDesigns.some((entry) => entry.id === design.id),
  }
}

export async function refreshLibraryDesigns(
  library: DesignLibraryStore,
  onLoaded: (designs: DesignDocument[]) => void,
  onError: (message: string | null) => void,
): Promise<void> {
  try {
    onLoaded(await library.list())
    onError(null)
  } catch (error) {
    console.error('Design library load failed', error)
    onError('Couldn’t load your local design library.')
  }
}

export async function saveDesignToLibrary(
  library: DesignLibraryStore,
  design: DesignDocument,
  isBuiltinSample: boolean,
  isInLibrary: boolean,
): Promise<SaveResult> {
  try {
    const toSave = isBuiltinSample || !isInLibrary
      ? prepareDesignForLibrary(design)
      : touchDesignUpdatedAt(design)
    await library.put(toSave)
    return { ok: true, saved: toSave }
  } catch (error) {
    console.error('Design library save failed', error)
    return { ok: false, error: 'Couldn’t save the design to your local library.' }
  }
}

export async function removeDesignFromLibrary(
  library: DesignLibraryStore,
  designId: string,
): Promise<SimpleResult> {
  try {
    await library.remove(designId)
    return { ok: true }
  } catch (error) {
    console.error('Design library remove failed', error)
    return { ok: false, error: 'Couldn’t remove the design.' }
  }
}

export async function importDesignFile(
  library: DesignLibraryStore,
  file: File,
): Promise<ImportResult> {
  try {
    const parsed = await readDesignPackageFile(file)
    if (!parsed.ok) {
      return { ok: false, error: 'That file isn’t a valid peptide design package.' }
    }
    const imported = prepareDesignForLibrary(parsed.document)
    await library.put(imported)
    return { ok: true, imported }
  } catch (error) {
    console.error('Design import failed', error)
    return { ok: false, error: 'Couldn’t import that design file.' }
  }
}

export function exportDesignFileToDisk(
  design: DesignDocument,
  downloader?: FileDownloader,
): SimpleResult {
  try {
    downloadDesignPackage(design, downloader)
    return { ok: true }
  } catch (error) {
    console.error('Design file export failed', error)
    return { ok: false, error: 'Couldn’t export the design file.' }
  }
}

export async function exportApplyDesignLabelPng(
  element: HTMLDivElement,
  printTarget: PrintTarget,
  compoundName: string,
  exportLabel: typeof exportLabelPng,
): Promise<SimpleResult> {
  try {
    await exportLabel(element, printTarget, compoundName)
    return { ok: true }
  } catch (error) {
    console.error('Apply-design PNG export failed', error)
    return { ok: false, error: 'Couldn’t download the label. Try again.' }
  }
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
      const result = await importDesignFile(library, file)
      if (result.ok) {
        await refreshLibrary()
        openDesign(result.imported)
        setStatusMessage('Imported and saved to your local library.')
      } else {
        setLibraryError(result.error)
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
