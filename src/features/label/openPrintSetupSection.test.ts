import { describe, expect, it } from 'vitest'
import type { Scroller } from './domain/ports'
import { openPrintSetupSection } from './openPrintSetupSection'

describe('openPrintSetupSection', () => {
  it('should open setup and scroll to print-setup via the Scroller port', () => {
    const scrolledTo: string[] = []
    const scroller: Scroller = {
      scrollTo(id) {
        scrolledTo.push(id)
      },
    }
    let setupOpen = false

    openPrintSetupSection((open) => {
      setupOpen = open
    }, scroller)

    expect(setupOpen).toBe(true)
    expect(scrolledTo).toEqual(['print-setup'])
  })
})
