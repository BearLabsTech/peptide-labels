import { describe, it, expect } from 'vitest'
import { applyMonochromeThreshold } from './monochrome'

describe('applyMonochromeThreshold', () => {
  it('should force pixels to pure black or white only', () => {
    const data = new Uint8ClampedArray([
      0, 0, 0, 255,
      255, 255, 255, 255,
      128, 128, 128, 255,
      50, 50, 50, 0,
    ])

    applyMonochromeThreshold(data)

    expect(Array.from(data.subarray(0, 4))).toEqual([0, 0, 0, 255])
    expect(Array.from(data.subarray(4, 8))).toEqual([255, 255, 255, 255])
    expect(Array.from(data.subarray(8, 12))).toEqual([0, 0, 0, 255])
    expect(Array.from(data.subarray(12, 16))).toEqual([255, 255, 255, 255])
  })
})
