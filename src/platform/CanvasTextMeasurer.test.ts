import { afterEach, describe, expect, it, vi } from 'vitest'
import { CanvasTextMeasurer } from './CanvasTextMeasurer'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('CanvasTextMeasurer failure boundaries', () => {
  it('should throw when canvas rendering is unavailable', () => {
    vi.stubGlobal('document', {
      createElement: () => ({
        getContext: () => null,
      }),
    })

    const measurer = new CanvasTextMeasurer('Arial, Helvetica, sans-serif')
    expect(() => measurer.measureWidthPx('HGH', 20, 900)).toThrow(
      'Canvas rendering is unavailable',
    )
  })

  it('should return zero for empty text without touching canvas', () => {
    const createElement = vi.fn()
    vi.stubGlobal('document', { createElement })
    const measurer = new CanvasTextMeasurer('Arial, Helvetica, sans-serif')
    expect(measurer.measureWidthPx('', 20, 900)).toBe(0)
    expect(createElement).not.toHaveBeenCalled()
  })
})
