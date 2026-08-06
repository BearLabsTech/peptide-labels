import { describe, it, expect } from 'vitest'
import { mmToPx } from '../../print/dimensions'
import {
  clampColumnWidthPercent,
  LOGO_COLUMN_WIDTH,
  maxFontSizePxForLabelHeight,
  QR_COLUMN_WIDTH,
} from './labelLayoutConstants'

describe('labelLayoutConstants', () => {
  it('should use the label height in export pixels as the structural font ceiling', () => {
    expect(maxFontSizePxForLabelHeight(20, 300)).toBe(mmToPx(20, 300))
    expect(maxFontSizePxForLabelHeight(30, 300)).toBe(mmToPx(30, 300))
    expect(maxFontSizePxForLabelHeight(20, 203)).toBe(mmToPx(20, 203))
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
