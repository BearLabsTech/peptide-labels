import { describe, it, expect } from 'vitest'
import { labelContentStyle, labelStickerStyle } from './labelSurfaceStyle'
import { resolvePrintTarget } from './PrintTargetResolver'

describe('labelSurfaceStyle', () => {
  it('should set tighter padding cqw for rounded stock than rectangular', () => {
    const rounded = labelContentStyle(resolvePrintTarget({ stockId: '40x20-rounded' })) as Record<string, string | number | undefined>
    const rect = labelContentStyle(resolvePrintTarget({ stockId: '40x20-rect' })) as Record<string, string | number | undefined>
    expect(rounded['--label-pad']).toBe('1.25cqw')
    expect(rect['--label-pad']).toBe('2.5cqw')
  })

  it('should put stock aspect ratio on sticker shell only', () => {
    const sticker = labelStickerStyle(resolvePrintTarget({ stockId: '40x20-rounded' }))
    const content = labelContentStyle(resolvePrintTarget({ stockId: '40x20-rounded' }))
    expect(sticker.aspectRatio).toBe('40 / 20')
    expect(sticker.width).toBe('100%')
    expect(content.width).toBe('100%')
    expect(content.height).toBe('100%')
    expect(content.aspectRatio).toBeUndefined()
  })

  it('should clip rounded stock on sticker shell', () => {
    const sticker = labelStickerStyle(resolvePrintTarget({ stockId: '40x20-rounded' }))
    expect(sticker.borderRadius).toBe('3%')
    expect(sticker.overflow).toBe('hidden')
    expect(sticker.backgroundColor).toBe('#ffffff')
  })

  it('should not clip rectangular stock', () => {
    const sticker = labelStickerStyle(resolvePrintTarget({ stockId: '40x20-rect' }))
    expect(sticker.borderRadius).toBeUndefined()
    expect(sticker.overflow).toBeUndefined()
  })
})
