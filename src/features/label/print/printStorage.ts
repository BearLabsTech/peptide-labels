import type { PrintSetupSelection } from './types'
import { DEFAULT_STOCK_ID } from './printCatalog'

const STORAGE_KEY = 'peptide-labels-print-setup'

function isCustomSizeSelection(selection: PrintSetupSelection): boolean {
  return (
    selection.widthMm != null &&
    selection.heightMm != null &&
    selection.stockId == null &&
    selection.labelId == null
  )
}

export function normalizePrintSetup(selection: PrintSetupSelection): PrintSetupSelection {
  if (isCustomSizeSelection(selection)) {
    const { labelId: _legacy, ...rest } = selection
    return rest
  }

  if (selection.stockId) {
    const { labelId: _legacy, ...rest } = selection
    return rest
  }

  if (selection.labelId === '50x30') {
    const { labelId: _legacy, ...rest } = selection
    return { ...rest, stockId: '50x30-rounded' }
  }

  const { labelId: _legacy, ...rest } = selection
  return { ...rest, stockId: DEFAULT_STOCK_ID }
}

export function loadPrintSetup(): PrintSetupSelection | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return normalizePrintSetup(JSON.parse(raw) as PrintSetupSelection)
  } catch {
    return null
  }
}

export function savePrintSetup(selection: PrintSetupSelection): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizePrintSetup(selection)))
}

export function clearPrintSetup(): void {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}
