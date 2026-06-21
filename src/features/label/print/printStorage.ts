import type { PrintSetupSelection } from './types'

const STORAGE_KEY = 'peptide-labels-print-setup'

export function loadPrintSetup(): PrintSetupSelection | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as PrintSetupSelection
  } catch {
    return null
  }
}

export function savePrintSetup(selection: PrintSetupSelection): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(selection))
}

export function clearPrintSetup(): void {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}
