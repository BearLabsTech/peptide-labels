import { useCallback, useMemo, useState } from 'react'
import type { Scroller } from './domain/ports'
import { BrowserScroller } from '../../platform/BrowserScroller'
import type { PrintSetupSelection } from '../../print/types'
import { resolvePrintTarget } from '../../print/PrintTargetResolver'
import {
  PRINT_SETUP_SAVE_FAILED_MESSAGE,
  resolveInitialPrintSetup,
  savePrintSetup,
} from '../../print/printStorage'
import { openPrintSetupSection } from './openPrintSetupSection'

export { openPrintSetupSection } from './openPrintSetupSection'

const defaultScroller: Scroller = new BrowserScroller()

function persistPrintSelection(selection: PrintSetupSelection): string | null {
  const result = savePrintSetup(selection)
  return result.ok ? null : (result.error || PRINT_SETUP_SAVE_FAILED_MESSAGE)
}

export function usePrintSetup(scroller: Scroller = defaultScroller) {
  const [initial] = useState(() => resolveInitialPrintSetup())
  const [selection, setSelectionState] = useState<PrintSetupSelection>(() => initial.selection)
  const [setupOpen, setSetupOpen] = useState(false)
  const [persistError, setPersistError] = useState<string | null>(null)
  const [loadNotice, setLoadNotice] = useState<string | null>(() => initial.loadNotice)

  const printTarget = useMemo(() => resolvePrintTarget(selection), [selection])

  const setSelection = useCallback((next: PrintSetupSelection) => {
    setSelectionState(next)
    setPersistError(persistPrintSelection(next))
  }, [])

  const clearLoadNotice = useCallback(() => setLoadNotice(null), [])

  const openPrintSetup = useCallback(() => {
    openPrintSetupSection(setSetupOpen, scroller)
  }, [scroller])

  return {
    selection,
    setSelection,
    printTarget,
    setupOpen,
    setSetupOpen,
    openPrintSetup,
    persistError,
    loadNotice,
    clearLoadNotice,
  }
}
