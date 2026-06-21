import { useCallback, useEffect, useMemo, useState } from 'react'
import type { PrintSetupSelection } from './print/types'
import { resolvePrintTarget } from './print/PrintTargetResolver'
import { loadPrintSetup, savePrintSetup } from './print/printStorage'

export function usePrintSetup() {
  const [selection, setSelection] = useState<PrintSetupSelection>(() => loadPrintSetup() ?? {})
  const [setupOpen, setSetupOpen] = useState(false)

  const printTarget = useMemo(() => resolvePrintTarget(selection), [selection])

  useEffect(() => {
    savePrintSetup(selection)
  }, [selection])

  const openPrintSetup = useCallback(() => {
    setSetupOpen(true)
    requestAnimationFrame(() => {
      document.getElementById('print-setup')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [])

  return {
    selection,
    setSelection,
    printTarget,
    setupOpen,
    setSetupOpen,
    openPrintSetup,
  }
}
