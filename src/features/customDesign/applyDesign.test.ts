import { describe, expect, it, vi } from 'vitest'
import { areRequiredSlotsFilled, resolveBoundText } from './bindDesignSlots'
import { designFrameStyle } from './designFrameStyle'
import { fontSizePtToCqw, resolveDesignFontFamily } from './designFonts'
import { SAMPLE_MITOCHONDRIA_DESIGN } from './fixtures/sampleMitochondriaDesign'
import {
  resolveDesignPrintTarget,
  resolveDesignPrintTargetOrDefault,
} from './resolveDesignPrintTarget'
import { SKIP_DEFAULT_TARGET } from '../../print/defaults'
import { buildExportSpec } from '../../print/exportSpec'
import { mmToPx } from '../../print/dimensions'
import type { DesignDocument } from './designDocument'

describe('resolveDesignPrintTarget', () => {
  it('should lock the sample design to its catalog stock size for export', () => {
    const result = resolveDesignPrintTarget(SAMPLE_MITOCHONDRIA_DESIGN)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.stockId).toBe('40x20-rounded')
    expect(result.value.labelWidthMm).toBe(40)
    expect(result.value.labelHeightMm).toBe(20)
    expect(result.value.shape).toBe('rounded')
  })

  it('should use a selected printer DPI while keeping the design stock dimensions', () => {
    const result = resolveDesignPrintTarget(SAMPLE_MITOCHONDRIA_DESIGN, {
      printerId: 'niimbot-b21',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.effectiveDpi).toBe(203)
    expect(result.value.labelWidthMm).toBe(40)
    expect(result.value.labelHeightMm).toBe(20)
  })

  it('should produce an export canvas matching the design stock at 300 DPI by default', () => {
    const result = resolveDesignPrintTarget(SAMPLE_MITOCHONDRIA_DESIGN)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const spec = buildExportSpec(result.value)
    expect(spec.canvasWidthPx).toBe(mmToPx(40, 300))
    expect(spec.canvasHeightPx).toBe(mmToPx(20, 300))
    expect(spec.dpi).toBe(300)
  })

  it('should return ok false for an unknown catalog stock id without throwing', () => {
    const design: DesignDocument = {
      ...SAMPLE_MITOCHONDRIA_DESIGN,
      stock: { kind: 'catalog', stockId: 'not-a-real-stock' },
    }
    const result = resolveDesignPrintTarget(design)
    expect(result).toEqual({
      ok: false,
      error: { kind: 'unknown_catalog_stock', stockId: 'not-a-real-stock' },
    })
  })

  it('should fall back to the skip-default target when the catalog stock is unknown', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const design: DesignDocument = {
      ...SAMPLE_MITOCHONDRIA_DESIGN,
      stock: { kind: 'catalog', stockId: 'not-a-real-stock' },
    }
    const target = resolveDesignPrintTargetOrDefault(design, {
      printerId: 'niimbot-b21',
      vialCapacityMl: 3,
    })
    expect(target.labelWidthMm).toBe(SKIP_DEFAULT_TARGET.labelWidthMm)
    expect(target.labelHeightMm).toBe(SKIP_DEFAULT_TARGET.labelHeightMm)
    expect(target.stockId).toBe(SKIP_DEFAULT_TARGET.stockId)
    expect(target.printerId).toBe('niimbot-b21')
    expect(target.vialCapacityMl).toBe(3)
    expect(errorSpy).toHaveBeenCalled()
    errorSpy.mockRestore()
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
    const result = resolveDesignPrintTarget(SAMPLE_MITOCHONDRIA_DESIGN)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const style = designFrameStyle(
      { xMm: 10, yMm: 5, widthMm: 20, heightMm: 4 },
      result.value,
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
