import { describe, expect, it } from 'vitest'
import { NoopScroller } from '../../platform/BrowserScroller'
import { openPrintSetupSection } from './openPrintSetupSection'

describe('usePrintSetup', () => {
  it('should open setup and scroll to print-setup via the Scroller port', () => {
    const scroller = new NoopScroller()
    let setupOpen = false

    openPrintSetupSection((open) => {
      setupOpen = open
    }, scroller)

    expect(setupOpen).toBe(true)
    expect(scroller.calls).toEqual(['print-setup'])
  })
})
