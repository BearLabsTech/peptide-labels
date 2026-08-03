import type { Scroller } from './domain/ports'

/** Opens print setup and scrolls the section into view — extracted for unit tests. */
export function openPrintSetupSection(
  setSetupOpen: (open: boolean) => void,
  scroller: Scroller,
): void {
  setSetupOpen(true)
  scroller.scrollTo('print-setup')
}
