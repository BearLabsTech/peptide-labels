import type { KeyValueStore } from '../shared/ports'
import { LocalStorageKeyValueStore } from '../platform/LocalStorageKeyValueStore'
import type { PrintSetupSelection } from './types'
import { DEFAULT_STOCK_ID } from './printCatalog'
import { normalizeVialCapacityMl } from './vialCapacity'
import { err, ok, type Result } from '../shared/result'

const STORAGE_KEY = 'peptide-labels-print-setup'
const defaultStore: KeyValueStore = new LocalStorageKeyValueStore()

export const PRINT_SETUP_SAVE_FAILED_MESSAGE = 'Settings could not be saved.'
export const PRINT_SETUP_UNREADABLE_MESSAGE =
  "Couldn\u2019t read your saved print setup. Defaults are in place \u2014 check your printer and label size before printing."

export type LoadPrintSetupResult =
  | { kind: 'absent' }
  | { kind: 'ok'; value: PrintSetupSelection }
  | { kind: 'corrupt' }
  | { kind: 'unavailable' }

export type ResolveInitialPrintSetupResult = {
  readonly selection: PrintSetupSelection
  readonly loadNotice: string | null
}

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

export function loadPrintSetup(store: KeyValueStore = defaultStore): LoadPrintSetupResult {
  const read = store.get(STORAGE_KEY)
  if (read.kind === 'absent') return { kind: 'absent' }
  if (read.kind === 'unavailable') return { kind: 'unavailable' }

  try {
    const parsed: unknown = JSON.parse(read.value)
    if (!isPrintSetupSelection(parsed)) {
      return { kind: 'corrupt' }
    }
    return { kind: 'ok', value: normalizePrintSetup(parsed) }
  } catch (error) {
    console.error('Print setup load failed', error)
    return { kind: 'corrupt' }
  }
}

export function resolveInitialPrintSetup(
  store: KeyValueStore = defaultStore,
): ResolveInitialPrintSetupResult {
  const loaded = loadPrintSetup(store)
  const defaults = normalizePrintSetup({})

  switch (loaded.kind) {
    case 'ok':
      return { selection: loaded.value, loadNotice: null }
    case 'absent':
    case 'unavailable':
      return { selection: defaults, loadNotice: null }
    case 'corrupt': {
      const heal = savePrintSetup(defaults, store)
      return {
        selection: defaults,
        loadNotice: heal.ok ? PRINT_SETUP_UNREADABLE_MESSAGE : null,
      }
    }
  }
}

export function savePrintSetup(
  selection: PrintSetupSelection,
  store: KeyValueStore = defaultStore,
): Result<void, string> {
  const result = store.set(STORAGE_KEY, JSON.stringify(normalizePrintSetup(selection)))
  if (!result.ok) {
    return err(PRINT_SETUP_SAVE_FAILED_MESSAGE)
  }
  return ok()
}

export function clearPrintSetup(store: KeyValueStore = defaultStore): void {
  store.remove(STORAGE_KEY)
}
