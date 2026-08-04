import { exportLabelPng } from '../../app/exportLabelPng'
import type { PrintTarget } from '../../print/types'
import { areRequiredSlotsFilled, type DesignSlotValues } from './bindDesignSlots'
import type { DesignDocument } from './designDocument'
import {
  prepareDesignForLibrary,
  touchDesignUpdatedAt,
  type DesignLibraryStore,
} from './designLibrary'
import type { FileDownloader } from '../../shared/ports'
import {
  downloadDesignPackage,
  readDesignPackageFile,
} from './designPackage'
import { SAMPLE_MITOCHONDRIA_DESIGN } from './fixtures/sampleMitochondriaDesign'
import type { DesignDocumentValidationIssue } from './validateDesignDocument'
import type { Result } from '../../shared/result'
import { err, ok } from '../../shared/result'

type SaveResult = Result<DesignDocument, string>

type SimpleResult = Result<void, string>

export type ImportDesignError =
  | {
      kind: 'invalid'
      message: string
      issues: readonly DesignDocumentValidationIssue[]
    }
  | { kind: 'failed'; message: string }

type ImportResult = Result<DesignDocument, ImportDesignError>

/** One display line per validation issue for the import error list. */
export function formatDesignImportIssues(
  issues: readonly DesignDocumentValidationIssue[],
): string[] {
  return issues.map((issue) =>
    issue.path ? `${issue.path}: ${issue.message}` : issue.message,
  )
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
    return ok(toSave)
  } catch (error) {
    console.error('Design library save failed', error)
    return err('Couldn’t save the design to your local library.')
  }
}

export async function removeDesignFromLibrary(
  library: DesignLibraryStore,
  designId: string,
): Promise<SimpleResult> {
  try {
    await library.remove(designId)
    return ok()
  } catch (error) {
    console.error('Design library remove failed', error)
    return err('Couldn’t remove the design.')
  }
}

export async function importDesignFile(
  library: DesignLibraryStore,
  file: File,
): Promise<ImportResult> {
  try {
    const parsed = await readDesignPackageFile(file)
    if (!parsed.ok) {
      return err({
        kind: 'invalid',
        message: 'That file isn’t a valid peptide design package.',
        issues: parsed.error.issues,
      })
    }
    const imported = prepareDesignForLibrary(parsed.value)
    await library.put(imported)
    return ok(imported)
  } catch (error) {
    console.error('Design import failed', error)
    return err({ kind: 'failed', message: 'Couldn’t import that design file.' })
  }
}

export function exportDesignFileToDisk(
  design: DesignDocument,
  downloader?: FileDownloader,
): SimpleResult {
  try {
    downloadDesignPackage(design, downloader)
    return ok()
  } catch (error) {
    console.error('Design file export failed', error)
    return err('Couldn’t export the design file.')
  }
}

export async function exportApplyDesignLabelPng(
  element: HTMLDivElement,
  printTarget: PrintTarget,
  compoundName: string,
  exportLabel: typeof exportLabelPng,
): Promise<SimpleResult> {
  const result = await exportLabel(element, printTarget, compoundName)
  if (!result.ok) {
    console.error('Apply-design PNG export failed', result.error)
    return err('Couldn’t download the label. Try again.')
  }
  return ok()
}
