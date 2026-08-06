import { describe, it, expect } from 'vitest'
import { computeColumnLayout, computeIdentityHeaderTitleBand, computeIdentityHeaderTitleBreakout, computeIdentityHeaderTitleWidthMm, columnsForDenseFullHeightLogo } from './labelColumnLayout'
import { MIN_CENTER_COLUMN_PERCENT } from './labelLayoutConstants'

describe('computeColumnLayout', () => {
  it('should size side columns as percent of inner flex row matching mm layout', () => {
    const layout = computeColumnLayout({
      labelWidthMm: 40,
      paddingMm: 0.5,
      hasLogo: true,
      hasQr: true,
      logoColumnWidthPercent: 20,
      qrColumnWidthPercent: 38,
    })

    expect(layout.innerRowMm).toBe(39)
    expect(layout.logoWidthPercent).toBe(20)
    expect(layout.qrWidthPercent).toBe(38)
    expect(layout.logoWidthMm).toBeCloseTo(layout.innerRowMm * 0.2, 5)
    expect(layout.qrWidthMm).toBeCloseTo(layout.innerRowMm * 0.38, 5)
    expect(layout.gapCount).toBe(2)
    expect(layout.centerWidthMm).toBeCloseTo(
      layout.innerRowMm - layout.logoWidthMm - layout.qrWidthMm - layout.gapMm * 2,
      5,
    )
  })

  it('should reserve only center column when no side columns', () => {
    const layout = computeColumnLayout({
      labelWidthMm: 40,
      paddingMm: 0.5,
      hasLogo: false,
      hasQr: false,
    })

    expect(layout.logoWidthPercent).toBe(0)
    expect(layout.qrWidthPercent).toBe(0)
    expect(layout.centerWidthMm).toBe(39)
  })

  it('should scale down side columns when they would leave less than minimum center width', () => {
    const layout = computeColumnLayout({
      labelWidthMm: 40,
      paddingMm: 0.5,
      hasLogo: true,
      hasQr: true,
      logoColumnWidthPercent: 45,
      qrColumnWidthPercent: 50,
    })

    expect(layout.logoWidthPercent + layout.qrWidthPercent).toBeLessThanOrEqual(100 - MIN_CENTER_COLUMN_PERCENT)
    expect(layout.centerWidthMm).toBeGreaterThanOrEqual(layout.innerRowMm * (MIN_CENTER_COLUMN_PERCENT / 100))
  })
})

describe('computeIdentityHeaderTitleBand', () => {
  it('should place axis on center column midpoint not geometric label center', () => {
    const columns = computeColumnLayout({
      labelWidthMm: 40,
      paddingMm: 0.5,
      hasLogo: true,
      hasQr: true,
      logoColumnWidthPercent: 20,
      qrColumnWidthPercent: 38,
    })
    const band = computeIdentityHeaderTitleBand(columns, true)

    expect(band.axisFraction).toBeLessThan(0.5)
    expect(band.spanFraction).toBeGreaterThan(columns.centerWidthMm / columns.innerRowMm)
  })

  it('should widen span when testing column is narrower than logo column', () => {
    const wideQr = computeIdentityHeaderTitleBand(
      computeColumnLayout({
        labelWidthMm: 40,
        paddingMm: 0.5,
        hasLogo: true,
        hasQr: true,
        logoColumnWidthPercent: 38,
        qrColumnWidthPercent: 20,
      }),
      true,
    )
    const wideLogo = computeIdentityHeaderTitleBand(
      computeColumnLayout({
        labelWidthMm: 40,
        paddingMm: 0.5,
        hasLogo: true,
        hasQr: true,
        logoColumnWidthPercent: 20,
        qrColumnWidthPercent: 38,
      }),
      true,
    )

    expect(wideQr.axisFraction).toBeGreaterThan(wideLogo.axisFraction)
    expect(wideQr.spanFraction).not.toBe(wideLogo.spanFraction)
  })

  it('should break title out to full inner row from center column', () => {
    const columns = computeColumnLayout({
      labelWidthMm: 40,
      paddingMm: 0.5,
      hasLogo: true,
      hasQr: true,
      logoColumnWidthPercent: 20,
      qrColumnWidthPercent: 38,
    })
    const breakout = computeIdentityHeaderTitleBreakout(columns, true, true)

    expect(breakout.breakoutWidthPct).toBeCloseTo((columns.innerRowMm / columns.centerWidthMm) * 100, 5)
    expect(breakout.breakoutMarginLeftPct).toBeLessThan(0)
    expect(computeIdentityHeaderTitleWidthMm(columns, false)).toBe(columns.innerRowMm)
  })

  it('should exclude the logo column from dense full-height title geometry', () => {
    const columns = computeColumnLayout({
      labelWidthMm: 40,
      paddingMm: 0.5,
      hasLogo: true,
      hasQr: true,
      logoColumnWidthPercent: 20,
      qrColumnWidthPercent: 38,
    })
    const primary = columnsForDenseFullHeightLogo(columns)
    const breakout = computeIdentityHeaderTitleBreakout(primary, false, true)

    expect(primary.logoWidthMm).toBe(0)
    expect(primary.innerRowMm).toBeCloseTo(
      columns.innerRowMm - columns.logoWidthMm - columns.gapMm,
      5,
    )
    expect(breakout.breakoutMarginLeftPct).toBeCloseTo(0, 10)
    expect(computeIdentityHeaderTitleWidthMm(columns, false, undefined, true)).toBeCloseTo(
      columns.innerRowMm - columns.logoWidthMm - columns.gapMm,
      5,
    )
  })
})
