import { describe, it, expect } from 'vitest'
import { mmToPx } from '../../print/dimensions'
import {
  bodyBoxArrangementCandidates,
  bodyBoxRowCount,
  clampColumnWidthPercent,
  LOGO_COLUMN_WIDTH,
  maxFontSizePxForLabelHeight,
  QR_COLUMN_WIDTH,
  sectionWidthMm,
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

  it('should offer only stacked for one box and both arrangements for two or three', () => {
    expect(bodyBoxArrangementCandidates(0)).toEqual(['stacked'])
    expect(bodyBoxArrangementCandidates(1)).toEqual(['stacked'])
    expect(bodyBoxArrangementCandidates(2)).toEqual(['stacked', 'row'])
    expect(bodyBoxArrangementCandidates(3)).toEqual(['stacked', 'row'])
  })

  it('should divide width by box count in a row and keep full width when stacked', () => {
    expect(sectionWidthMm(30, 2, 'stacked')).toBe(30)
    expect(sectionWidthMm(30, 2, 'row')).toBe(15)
    expect(sectionWidthMm(30, 3, 'row')).toBe(10)
  })

  it('should count one visual row for a row arrangement and one per box when stacked', () => {
    expect(bodyBoxRowCount(0, 'stacked')).toBe(0)
    expect(bodyBoxRowCount(1, 'stacked')).toBe(1)
    expect(bodyBoxRowCount(2, 'row')).toBe(1)
    expect(bodyBoxRowCount(3, 'row')).toBe(1)
    expect(bodyBoxRowCount(2, 'stacked')).toBe(2)
    expect(bodyBoxRowCount(3, 'stacked')).toBe(3)
  })
})
