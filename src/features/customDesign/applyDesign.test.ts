import { describe, expect, it } from 'vitest'
import { areRequiredSlotsFilled, resolveBoundText } from './bindDesignSlots'
import { designFrameStyle } from './designFrameStyle'
import { fontSizePtToCqw, resolveDesignFontFamily } from './designFonts'
import { SAMPLE_MITOCHONDRIA_DESIGN } from './fixtures/sampleMitochondriaDesign'
import { resolveDesignPrintTarget } from './resolveDesignPrintTarget'
import { buildExportSpec } from '../../print/exportSpec'
import { mmToPx } from '../../print/dimensions'

describe('resolveDesignPrintTarget', () => {
  it('should lock the sample design to its catalog stock size for export', () => {
    const target = resolveDesignPrintTarget(SAMPLE_MITOCHONDRIA_DESIGN)
    expect(target.stockId).toBe('40x20-rounded')
    expect(target.labelWidthMm).toBe(40)
    expect(target.labelHeightMm).toBe(20)
    expect(target.shape).toBe('rounded')
  })

  it('should use a selected printer DPI while keeping the design stock dimensions', () => {
    const target = resolveDesignPrintTarget(SAMPLE_MITOCHONDRIA_DESIGN, {
      printerId: 'niimbot-b21',
    })
    expect(target.effectiveDpi).toBe(203)
    expect(target.labelWidthMm).toBe(40)
    expect(target.labelHeightMm).toBe(20)
  })

  it('should produce an export canvas matching the design stock at 300 DPI by default', () => {
    const target = resolveDesignPrintTarget(SAMPLE_MITOCHONDRIA_DESIGN)
    const spec = buildExportSpec(target)
    expect(spec.canvasWidthPx).toBe(mmToPx(40, 300))
    expect(spec.canvasHeightPx).toBe(mmToPx(20, 300))
    expect(spec.dpi).toBe(300)
  })
})

describe('bindDesignSlots', () => {
  it('should resolve static text and slot-bound text for preview', () => {
    expect(resolveBoundText({ kind: 'static', text: 'RESEARCH' }, {})).toBe('RESEARCH')
    expect(
      resolveBoundText({ kind: 'slot', slotKey: 'compoundName' }, { compoundName: 'BPC-157' }),
    ).toBe('BPC-157')
    expect(resolveBoundText({ kind: 'slot', slotKey: 'compoundName' }, {})).toBe('')
  })

  it('should require all required slots before export is allowed', () => {
    expect(areRequiredSlotsFilled(SAMPLE_MITOCHONDRIA_DESIGN, {})).toBe(false)
    expect(
      areRequiredSlotsFilled(SAMPLE_MITOCHONDRIA_DESIGN, {
        compoundName: 'BPC-157',
        compoundAmount: '',
      }),
    ).toBe(false)
    expect(
      areRequiredSlotsFilled(SAMPLE_MITOCHONDRIA_DESIGN, {
        compoundName: 'BPC-157',
        compoundAmount: '5 mg',
      }),
    ).toBe(true)
  })
})

describe('designFrameStyle and fonts', () => {
  it('should place a rotated frame as percentages of the label', () => {
    const target = resolveDesignPrintTarget(SAMPLE_MITOCHONDRIA_DESIGN)
    const style = designFrameStyle(
      { xMm: 10, yMm: 5, widthMm: 20, heightMm: 4 },
      target,
      270,
      3,
    )
    expect(style.left).toBe('25%')
    expect(style.top).toBe('25%')
    expect(style.width).toBe('50%')
    expect(style.height).toBe('20%')
    expect(style.transform).toBe('rotate(270deg)')
    expect(style.zIndex).toBe('3')
  })

  it('should map curated font ids to thermal-friendly stacks', () => {
    expect(resolveDesignFontFamily('sans')).toContain('Arial')
    expect(resolveDesignFontFamily('display')).toContain('Arial Black')
    expect(resolveDesignFontFamily('unknown')).toContain('Arial')
  })

  it('should convert point sizes into container-query width units', () => {
    expect(fontSizePtToCqw(72, 25.4)).toBe('100cqw')
  })
})
