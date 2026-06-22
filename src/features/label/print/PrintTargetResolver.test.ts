import { describe, it, expect } from 'vitest'
import { resolvePrintTarget, resolveEffectiveDpi } from './PrintTargetResolver'

describe('PrintTargetResolver', () => {
  it('should apply skip default rounded stock when selection is empty', () => {
    const target = resolvePrintTarget({})
    expect(target.labelWidthMm).toBe(40)
    expect(target.labelHeightMm).toBe(20)
    expect(target.effectiveDpi).toBe(300)
    expect(target.stockId).toBe('40x20-rounded')
    expect(target.shape).toBe('rounded')
    expect(target.paddingMm).toBe(0.5)
    expect(target.vialMl).toBe(3)
  })

  it('should use tighter padding on rounded stock than rectangular', () => {
    const rounded = resolvePrintTarget({ stockId: '40x20-rounded' })
    const rect = resolvePrintTarget({ stockId: '40x20-rect' })
    expect(rounded.paddingMm).toBeLessThan(rect.paddingMm)
    expect(rounded.cornerRadiusMm).toBeGreaterThan(0)
    expect(rect.cornerRadiusMm).toBe(0)
    expect(rect.shape).toBe('rectangular')
  })

  it('should use B21 native 203 DPI when printer is selected', () => {
    const target = resolvePrintTarget({ printerId: 'niimbot-b21', stockId: '40x20-rounded' })
    expect(target.effectiveDpi).toBe(203)
    expect(resolveEffectiveDpi({ printerId: 'niimbot-b21' })).toBe(203)
  })

  it('should use M2 native 300 DPI when printer is selected', () => {
    const target = resolvePrintTarget({ printerId: 'niimbot-m2', stockId: '40x20-rounded' })
    expect(target.effectiveDpi).toBe(300)
  })

  it('should resolve 50x30 rounded stock from catalog', () => {
    const target = resolvePrintTarget({ stockId: '50x30-rounded' })
    expect(target.labelWidthMm).toBe(50)
    expect(target.labelHeightMm).toBe(30)
    expect(target.shape).toBe('rounded')
    expect(target.stockId).toBe('50x30-rounded')
  })

  it('should migrate legacy labelId 40x20 to rounded stock', () => {
    const target = resolvePrintTarget({ labelId: '40x20' })
    expect(target.stockId).toBe('40x20-rounded')
    expect(target.shape).toBe('rounded')
  })

  it('should migrate legacy labelId 50x30 to rounded stock', () => {
    const target = resolvePrintTarget({ labelId: '50x30' })
    expect(target.stockId).toBe('50x30-rounded')
  })

  it('should honor custom mm dimensions with rectangular shape', () => {
    const target = resolvePrintTarget({ widthMm: 50, heightMm: 30 })
    expect(target.effectiveDpi).toBe(300)
    expect(target.labelWidthMm).toBe(50)
    expect(target.labelHeightMm).toBe(30)
    expect(target.shape).toBe('rectangular')
    expect(target.stockId).toBeUndefined()
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
