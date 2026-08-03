import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Scroller } from './domain/ports'
import { BrowserScroller } from '../../platform/BrowserScroller'
import type { PrintSetupSelection } from '../../print/types'
import { resolvePrintTarget } from '../../print/PrintTargetResolver'
import { loadPrintSetup, normalizePrintSetup, savePrintSetup } from '../../print/printStorage'

const defaultScroller: Scroller = new BrowserScroller()

/** Opens print setup and scrolls the section into view — extracted for unit tests. */
export function openPrintSetupSection(
  setSetupOpen: (open: boolean) => void,
  scroller: Scroller,
): void {
  setSetupOpen(true)
  scroller.scrollTo('print-setup')
}

export function usePrintSetup(scroller: Scroller = defaultScroller) {
  const [selection, setSelection] = useState<PrintSetupSelection>(() =>
    normalizePrintSetup(loadPrintSetup() ?? {}),
  )
  const [setupOpen, setSetupOpen] = useState(false)

  const printTarget = useMemo(() => resolvePrintTarget(selection), [selection])

  useEffect(() => {
    savePrintSetup(selection)
  }, [selection])

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
  }
}
