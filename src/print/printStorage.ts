import type { KeyValueStore } from '../features/label/domain/ports'
import { LocalStorageKeyValueStore } from '../platform/LocalStorageKeyValueStore'
import type { PrintSetupSelection } from './types'
import { DEFAULT_STOCK_ID } from './printCatalog'
import { normalizeVialCapacityMl } from '../features/label/vialCapacity'
import type { Result } from '../shared/result'

const STORAGE_KEY = 'peptide-labels-print-setup'
const defaultStore: KeyValueStore = new LocalStorageKeyValueStore()

export const PRINT_SETUP_SAVE_FAILED_MESSAGE = 'Settings could not be saved.'

function isPrintSetupSelection(value: unknown): value is PrintSetupSelection {
  if (typeof value !== 'object' || value == null || Array.isArray(value)) return false
  const candidate = value as Record<string, unknown>
  const optionalStringFields = ['printerId', 'stockId', 'labelId'] as const
  const optionalNumberFields = ['vialCapacityMl', 'vialMl'] as const
  const optionalDimensionFields = ['widthMm', 'heightMm'] as const
  return optionalStringFields.every(
    (field) => candidate[field] == null || typeof candidate[field] === 'string',
  ) && optionalNumberFields.every(
    (field) => candidate[field] == null
      || (typeof candidate[field] === 'number' && Number.isFinite(candidate[field])),
  ) && optionalDimensionFields.every(
    (field) => candidate[field] == null
      || (
        typeof candidate[field] === 'number'
        && Number.isFinite(candidate[field])
        && candidate[field] > 0
      ),
  )
}

function isCustomSizeSelection(selection: PrintSetupSelection): boolean {
  return (
    selection.widthMm != null &&
    selection.heightMm != null &&
    Number.isFinite(selection.widthMm) &&
    Number.isFinite(selection.heightMm) &&
    selection.widthMm > 0 &&
    selection.heightMm > 0 &&
    selection.stockId == null &&
    selection.labelId == null
  )
}

export function normalizePrintSetup(selection: PrintSetupSelection): PrintSetupSelection {
  const { vialMl: legacyVialCapacity, ...withoutLegacyVialCapacity } = selection
  const migrated = {
    ...withoutLegacyVialCapacity,
    vialCapacityMl: normalizeVialCapacityMl(selection.vialCapacityMl ?? legacyVialCapacity),
  }
  const canonical = { ...migrated }
  delete canonical.labelId

  if (isCustomSizeSelection(migrated)) {
    return canonical
  }

  const catalogSelection = { ...canonical }
  delete catalogSelection.widthMm
  delete catalogSelection.heightMm

  if (migrated.stockId) {
    return catalogSelection
  }

  if (migrated.labelId === '50x30') {
    return { ...catalogSelection, stockId: '50x30-rounded' }
  }

  if (migrated.labelId === '40x30') {
    return { ...catalogSelection, stockId: '40x30-rounded' }
  }

  return { ...catalogSelection, stockId: DEFAULT_STOCK_ID }
}

export function loadPrintSetup(store: KeyValueStore = defaultStore): PrintSetupSelection | null {
  try {
    const raw = store.get(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isPrintSetupSelection(parsed) ? normalizePrintSetup(parsed) : null
  } catch (error) {
    console.error('Print setup load failed', error)
    return null
  }
}

export function savePrintSetup(
  selection: PrintSetupSelection,
  store: KeyValueStore = defaultStore,
): Result<void, string> {
  const result = store.set(STORAGE_KEY, JSON.stringify(normalizePrintSetup(selection)))
  if (!result.ok) {
    return { ok: false, error: PRINT_SETUP_SAVE_FAILED_MESSAGE }
  }
  return result
}

export function clearPrintSetup(store: KeyValueStore = defaultStore): void {
  store.remove(STORAGE_KEY)
}
