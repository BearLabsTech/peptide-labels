import { describe, it, expect } from 'vitest'
import { resolvePrintTarget } from './PrintTargetResolver'

describe('PrintTargetResolver', () => {
  it('should apply skip default when selection is empty', () => {
    const target = resolvePrintTarget({})
    expect(target.labelWidthMm).toBe(40)
    expect(target.labelHeightMm).toBe(20)
    expect(target.effectiveDpi).toBe(300)
    expect(target.labelId).toBe('40x20')
    expect(target.vialMl).toBe(3)
  })

  it('should use B21 native 203 DPI with catalog label', () => {
    const target = resolvePrintTarget({ printerId: 'niimbot-b21', labelId: '40x20' })
    expect(target.effectiveDpi).toBe(203)
    expect(target.labelWidthMm).toBe(40)
    expect(target.labelHeightMm).toBe(20)
    expect(target.printerId).toBe('niimbot-b21')
  })

  it('should use M2 native 300 DPI with catalog label', () => {
    const target = resolvePrintTarget({ printerId: 'niimbot-m2', labelId: '40x20' })
    expect(target.effectiveDpi).toBe(300)
    expect(target.labelWidthMm).toBe(40)
  })

  it('should honor custom mm dimensions with default 300 DPI when printer omitted', () => {
    const target = resolvePrintTarget({ widthMm: 50, heightMm: 30 })
    expect(target.effectiveDpi).toBe(300)
    expect(target.labelWidthMm).toBe(50)
    expect(target.labelHeightMm).toBe(30)
  })

  it('should honor custom mm with B21 printer at 203 DPI', () => {
    const target = resolvePrintTarget({
      printerId: 'niimbot-b21',
      widthMm: 40,
      heightMm: 20,
    })
    expect(target.effectiveDpi).toBe(203)
    expect(target.labelWidthMm).toBe(40)
    expect(target.labelHeightMm).toBe(20)
  })
})
