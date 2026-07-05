import { describe, it, expect } from 'vitest'
import {
  clampColumnWidthPercent,
  LOGO_COLUMN_WIDTH,
  maxFontSizePxForLabelHeight,
  QR_COLUMN_WIDTH,
} from './labelLayoutConstants'

describe('labelLayoutConstants', () => {
  it('should scale max font size with label height relative to 40x20 reference', () => {
    expect(maxFontSizePxForLabelHeight(20)).toBe(26)
    expect(maxFontSizePxForLabelHeight(30)).toBe(39)
  })

  it('should clamp column width percent to bounds', () => {
    expect(clampColumnWidthPercent(undefined, LOGO_COLUMN_WIDTH)).toBe(20)
    expect(clampColumnWidthPercent(10, LOGO_COLUMN_WIDTH)).toBe(15)
    expect(clampColumnWidthPercent(50, LOGO_COLUMN_WIDTH)).toBe(45)
    expect(clampColumnWidthPercent(undefined, QR_COLUMN_WIDTH)).toBe(38)
    expect(clampColumnWidthPercent(20, QR_COLUMN_WIDTH)).toBe(25)
    expect(clampColumnWidthPercent(55, QR_COLUMN_WIDTH)).toBe(50)
  })
})
