import { describe, it, expect } from 'vitest'
import { LabelComposer } from './LabelComposer'
import { resolvePrintTarget } from './print/PrintTargetResolver'
import { mmToPx } from './print/dimensions'
import { computeColumnLayout } from './labelColumnLayout'

const TITLE_CHAR_WIDTH_EM = 0.95

function innerRowTitleWidthPx(target: ReturnType<typeof resolvePrintTarget>): number {
    const columns = computeColumnLayout({
      labelWidthMm: target.labelWidthMm,
      paddingMm: target.paddingMm,
      hasLogo: true,
      hasQr: true,
    })
    return mmToPx(columns.innerRowMm, target.effectiveDpi)
}

function longestTitleLinePx(lines: string[], fontSizePx: number): number {
    const tokens = lines.flatMap((line) => line.split(' '))
    return Math.max(...tokens.map((word) => word.length * fontSizePx * TITLE_CHAR_WIDTH_EM))
}

describe('LabelComposer', () => {

    it('itShouldComposeStandardLayout', () => {
        const composer = new LabelComposer()
        const result = composer.compose({
            compoundName: 'Tirzepatide',
            compoundAmount: '20',
            vialUnit: 'mg'
        })

        expect(result.title).toBe('Tirzepatide\n20mg')
        expect(result.titleLines.length).toBeGreaterThan(0)
        expect(result.wrappedLines.length).toBeGreaterThan(0)
    })

    it('itShouldFormatUnitsCorrectlyInTitleAndProtocol', () => {
        const composer = new LabelComposer()

        const resultIu = composer.compose({
            compoundName: 'HGH',
            compoundAmount: '36',
            vialUnit: 'IU',
            protocolAmount: '2',
            measureUnit: 'IU'
        })
        expect(resultIu.title).toBe('HGH\n36IU')
        expect(resultIu.protocolLines).toContain('2IU')

        const resultMg = composer.compose({
            compoundName: 'Tirz',
            compoundAmount: '10',
            vialUnit: 'mg',
            protocolAmount: '500',
            measureUnit: 'mcg'
        })
        expect(resultMg.title).toBe('Tirz\n10mg')
        expect(resultMg.protocolLines).toContain('500mcg')
    })

    // --- NEW: Aggressive String Cleaning Test ---
    it('itShouldStripExistingUnitsFromInputToPreventDoubleUnits', () => {
        const composer = new LabelComposer()

        const result = composer.compose({
            compoundName: 'HGH',
            compoundAmount: '36mg', // User accidentally left 'mg' in the box!
            vialUnit: 'IU',         // But selected IU in the dropdown
            protocolAmount: '2mcg', // Left 'mcg' in the box!
            measureUnit: 'IU'
        })

        // Engine must aggressively strip the old text units out
        expect(result.title).toBe('HGH\n36IU')
        expect(result.protocolLines).toContain('2IU')
    })

    it('itShouldShrinkBodyTextAndLightenTitleInDangerMode', () => {
        const composer = new LabelComposer()

        const standardResult = composer.compose({
            compoundName: 'Reta',
            compoundAmount: '20',
            vialUnit: 'mg'
        })

        const dangerResult = composer.compose({
            compoundName: 'Reta',
            compoundAmount: '20',
            vialUnit: 'mg',
            isUntested: true
        })

        expect(dangerResult.bodyFontSizePx).toBeLessThan(standardResult.bodyFontSizePx)
        expect(dangerResult.demotedTitle).toBe('Reta\n20mg')
    })

    it('itShouldAllocateFullHeightToTitleWhenNoBodyExists', () => {
        const composer = new LabelComposer()
        const result = composer.compose({ compoundName: 'Reta' })
        expect(result.titleFontSizePx).toBeGreaterThan(20)
    })

    it('itShouldUseMoreUsableWidthWhenRoundedStockPaddingIsTighter', () => {
        const tight = new LabelComposer(resolvePrintTarget({ stockId: '40x20-rounded' }))
        const loose = new LabelComposer(resolvePrintTarget({ widthMm: 40, heightMm: 20 }))
        const input = {
            compoundName: 'Very Long Compound Name Here',
            compoundAmount: '20',
            vialUnit: 'mg' as const,
        }
        const tightTitle = tight.compose(input).titleFontSizePx
        const looseTitle = loose.compose(input).titleFontSizePx
        expect(tightTitle).toBeGreaterThanOrEqual(looseTitle)
    })

    it('itShouldWrapLongExampleTitleForStandardLabelWithQr', () => {
        const composer = new LabelComposer(resolvePrintTarget({ stockId: '40x20-rounded' }))
        const result = composer.compose({
            compoundName: 'Tirzepatide',
            compoundAmount: '20',
            vialUnit: 'mg',
            vendorName: 'Bear Labs',
            batchNumber: 'BL-2026',
            reconstitutionAmount: '2',
            reconstitutionType: 'BAC Water',
            protocolAmount: '5',
            measureUnit: 'mg',
            protocolFrequency: 'Weekly',
            reconstitutionDate: '20260621',
            vendorCoa: 'https://example.com',
        })
        expect(result.titleLines.join(' ')).toContain('TIRZEPATIDE')
        expect(result.bodyFontSizePx).toBeLessThanOrEqual(26)
    })

    it('itShouldShrinkBodyFontWhenAllSectionsAreFilled', () => {
        const composer = new LabelComposer(resolvePrintTarget({ stockId: '40x20-rect', printerId: 'niimbot-b21' }))
        const result = composer.compose({
            compoundName: 'Test Compound',
            compoundAmount: '20',
            vialUnit: 'mg',
            vendorName: 'Test Labs',
            batchNumber: 'TEST01',
            reconstitutionAmount: '2',
            reconstitutionType: 'BAC Water',
            concentration: '10mg per ml',
            reconstitutionDate: '20260621',
            protocolAmount: '1',
            measureUnit: 'mg',
            protocolUnits: '10 units',
            protocolFrequency: 'Weekly',
            vendorCoa: 'https://example.com',
        })
        expect(result.bodyFontSizePx).toBeLessThan(26)
    })

    it('itShouldFitTitleLinesWithinInnerRowWhenMascotAndQrFlankCenterColumn', () => {
        const target = resolvePrintTarget({ stockId: '40x20-rect', printerId: 'niimbot-b21' })
        const composer = new LabelComposer(target)
        const result = composer.compose({
            compoundName: 'Test Compound',
            compoundAmount: '20',
            vialUnit: 'mg',
            customImage: 'data:image/png;base64,test',
            vendorCoa: 'https://example.com/coa',
        })

        const budgetPx = innerRowTitleWidthPx(target)
        expect(longestTitleLinePx(result.titleLines, result.titleFontSizePx)).toBeLessThanOrEqual(budgetPx)
        expect(result.titleFontSizePx).toBeLessThanOrEqual(26)
    })

    it('itShouldWrapLongestWordWhenTitleOnlyWithMascotAndQr', () => {
        const target = resolvePrintTarget({ stockId: '40x20-rect', printerId: 'niimbot-b21' })
        const composer = new LabelComposer(target)
        const result = composer.compose({
            compoundName: 'Test Compound',
            customImage: 'data:image/png;base64,test',
            vendorCoa: 'https://example.com/coa',
        })

        expect(result.titleLines.some((line) => line.includes('COMPOUND'))).toBe(true)
        expect(result.titleLines.length).toBeGreaterThan(1)
        expect(result.titleFontSizePx).toBeLessThanOrEqual(26)
    })

    it('itShouldFitFullCenterStackWhenMascotQrAndAllSectionsFilled', () => {
        const target = resolvePrintTarget({ stockId: '40x20-rect', printerId: 'niimbot-b21' })
        const composer = new LabelComposer(target)
        const engine = (composer as unknown as { layoutEngine: import('./LabelLayoutEngine').LabelLayoutEngine }).layoutEngine
        const result = composer.compose({
            compoundName: 'Test Compound',
            compoundAmount: '20',
            vialUnit: 'mg',
            vendorName: 'Bear Labs',
            reconstitutionAmount: '2',
            reconstitutionType: 'BAC Water',
            concentration: '10mg per ml',
            protocolAmount: '2',
            measureUnit: 'mg',
            protocolUnits: '20 units',
            vendorCoa: 'https://example.com/coa',
            customImage: 'data:image/png;base64,test',
        })

        const innerMm = target.labelHeightMm - target.paddingMm * 2
        const innerPx = mmToPx(innerMm, target.effectiveDpi)
        const columns = computeColumnLayout({
          labelWidthMm: target.labelWidthMm,
          paddingMm: target.paddingMm,
          hasLogo: true,
          hasQr: true,
        })
        const bodyInput = {
            boxes: [
                { lines: result.reconstitutionLines },
                { lines: result.protocolLines },
                { lines: result.sourceLines },
            ],
            widthMm: columns.centerWidthMm * 0.92,
            heightMm: innerMm,
            labelWidthPx: mmToPx(target.labelWidthMm, target.effectiveDpi),
        }

        const stackPx = engine.estimateCenterStackHeightPx(
            result.titleLines.length,
            result.titleFontSizePx,
            target.paddingMm,
            bodyInput,
            result.bodyFontSizePx,
        )
        expect(stackPx).toBeLessThanOrEqual(innerPx)
        expect(result.bodyFontSizePx).toBeLessThan(26)
    })

    it('itShouldUseLargerFontOnTallerLabelStockWhenContentIsSparse', () => {
        const compact = new LabelComposer(resolvePrintTarget({ stockId: '40x20-rounded' }))
        const tall = new LabelComposer(resolvePrintTarget({ stockId: '40x30-rounded' }))
        const input = {
            compoundName: 'Test Compound',
            compoundAmount: '20',
            vialUnit: 'mg' as const,
            reconstitutionAmount: '2',
            reconstitutionType: 'BAC Water',
            concentration: '10mg per ml',
        }
        const compactResult = compact.compose(input)
        const tallResult = tall.compose(input)
        expect(tallResult.titleFontSizePx).toBeGreaterThan(compactResult.titleFontSizePx)
        expect(tallResult.bodyFontSizePx).toBeGreaterThan(compactResult.bodyFontSizePx)
    })

    it('itShouldShrinkTitleFontWhenWiderLogoColumnStealsCenterWidth', () => {
        const target = resolvePrintTarget({ stockId: '40x30-rounded' })
        const narrowLogo = new LabelComposer(target)
        const wideLogo = new LabelComposer(target)
        const base = {
            compoundName: 'Test Compound',
            compoundAmount: '20',
            vialUnit: 'mg' as const,
            customImage: 'data:image/png;base64,test',
        }
        const narrowResult = narrowLogo.compose({ ...base, logoColumnWidthPercent: 20 })
        const wideResult = wideLogo.compose({ ...base, logoColumnWidthPercent: 40 })
        expect(wideResult.titleFontSizePx).toBeLessThanOrEqual(narrowResult.titleFontSizePx)
        expect(wideResult.logoColumnWidthPercent).toBe(40)
    })

    it('itShouldShrinkTitleFontWhenWiderCoaColumnStealsCenterWidth', () => {
        const target = resolvePrintTarget({ stockId: '40x30-rounded' })
        const narrowQr = new LabelComposer(target)
        const wideQr = new LabelComposer(target)
        const base = {
            compoundName: 'Test Compound',
            compoundAmount: '20',
            vialUnit: 'mg' as const,
            vendorCoa: 'https://example.com/coa',
        }
        const narrowResult = narrowQr.compose({ ...base, qrColumnWidthPercent: 30 })
        const wideResult = wideQr.compose({ ...base, qrColumnWidthPercent: 48 })
        expect(wideResult.titleFontSizePx).toBeLessThanOrEqual(narrowResult.titleFontSizePx)
        expect(wideResult.qrColumnWidthPercent).toBe(48)
    })

    it('itShouldKeepTitleFontLargerThanBodyWhenSectionsAndSideColumnsPrint', () => {
        const composer = new LabelComposer(resolvePrintTarget({ stockId: '40x20-rounded', printerId: 'niimbot-b1-pro' }))
        const result = composer.compose({
            compoundName: 'Tirzepatide',
            compoundAmount: '20',
            vialUnit: 'mg',
            reconstitutionAmount: '2',
            reconstitutionType: 'BAC Water',
            concentration: '10mg per ml',
            reconstitutionDate: '20260705',
            protocolAmount: '5',
            measureUnit: 'mg',
            protocolFrequency: 'Weekly',
            showSource: false,
            showTestIndicators: true,
            testPurity: 'pass',
            testEndotoxin: 'pass',
            showCoaQr: true,
            vendorCoa: 'https://example.com/coa',
            customImage: 'data:image/png;base64,test',
        })

        expect(result.titleFontSizePx).toBeGreaterThan(result.bodyFontSizePx)
        expect(result.titleFontSizePx / result.bodyFontSizePx).toBeGreaterThanOrEqual(1.35)
        expect(result.titleLines.length).toBeGreaterThanOrEqual(2)
    })

    it('itShouldDefaultToIdentityHeaderLayout', () => {
        const target = resolvePrintTarget({ stockId: '40x20-rounded', printerId: 'niimbot-b1-pro' })
        const input = {
            compoundName: 'Tirzepatide',
            compoundAmount: '20',
            vialUnit: 'mg' as const,
            reconstitutionAmount: '2',
            reconstitutionType: 'BAC Water',
            concentration: '10mg per ml',
            reconstitutionDate: '20260705',
            protocolAmount: '5',
            measureUnit: 'mg' as const,
            protocolFrequency: 'Weekly',
            showSource: false,
            showTestIndicators: true,
            testPurity: 'pass' as const,
            testEndotoxin: 'pass' as const,
            showCoaQr: true,
            vendorCoa: 'https://example.com/coa',
            customImage: 'data:image/png;base64,test',
        }
        const result = new LabelComposer(target).compose(input)

        expect(result.labelLayoutMode).toBe('identityHeader')
        expect(result.titleFontSizePx / result.bodyFontSizePx).toBeGreaterThanOrEqual(1.35)
    })

    it('shouldWrapLongCompoundNamesUsingFullInnerRowWidth', () => {
        const target = resolvePrintTarget({ stockId: '40x20-rounded', printerId: 'niimbot-b1-pro' })
        const base = {
            compoundName: 'Test Compound!!!!!!!!!!',
            compoundAmount: '20',
            vialUnit: 'mg' as const,
            reconstitutionAmount: '2ml',
            concentration: '10mg per ml',
            protocolAmount: '4',
            measureUnit: 'mg' as const,
            showTestIndicators: true,
            testPurity: 'pass' as const,
            testEndotoxin: 'pass' as const,
            customImage: 'data:image/png;base64,test',
        }
        const result = new LabelComposer(target).compose(base)

        expect(result.labelLayoutMode).toBe('identityHeader')
        expect(result.titleLines.join(' ')).toContain('COMPOUND')
    })

    it('itShouldExposeResolvedColumnPercentsMatchingComputeColumnLayout', () => {
        const target = resolvePrintTarget({ stockId: '40x30-rounded' })
        const composer = new LabelComposer(target)
        const result = composer.compose({
            compoundName: 'Test',
            customImage: 'data:image/png;base64,test',
            vendorCoa: 'https://example.com/coa',
            logoColumnWidthPercent: 25,
            qrColumnWidthPercent: 40,
        })
        const expected = computeColumnLayout({
            labelWidthMm: target.labelWidthMm,
            paddingMm: target.paddingMm,
            hasLogo: true,
            hasQr: true,
            logoColumnWidthPercent: 25,
            qrColumnWidthPercent: 40,
        })
        expect(result.logoColumnWidthPercent).toBe(expected.logoWidthPercent)
        expect(result.qrColumnWidthPercent).toBe(expected.qrWidthPercent)
    })

    it('shouldPrintTestIndicatorsWithoutCoaQrWhenCoaPrintingIsDisabled', () => {
        const composer = new LabelComposer()
        const result = composer.compose({
            compoundName: 'Tirzepatide',
            compoundAmount: '20',
            vialUnit: 'mg',
            showTestIndicators: true,
            testMass: 'pass',
            testPurity: 'fail',
            vendorCoa: 'https://example.com/coa',
            showCoaQr: false,
        })

        expect(result.qrCodes).toEqual([])
        expect(result.testIndicators).toHaveLength(2)
        expect(result.testIndicators[0]).toMatchObject({ type: 'Mass', status: 'pass' })
        expect(result.testIndicators[1]).toMatchObject({ type: 'Purity', status: 'fail' })
        expect(result.qrColumnWidthPercent).toBeGreaterThan(0)
        expect(result.testIndicatorLayout).toBeDefined()
        expect(result.testIndicatorLayout!.markSizePx).toBeGreaterThan(result.testIndicatorLayout!.labelFontSizePx)
    })

    it('shouldOmitTestIndicatorLayoutWhenNoTestsPrintOnTheLabel', () => {
        const composer = new LabelComposer()
        const result = composer.compose({
            compoundName: 'Test',
            showTestIndicators: true,
        })

        expect(result.testIndicators).toEqual([])
        expect(result.testIndicatorLayout).toBeUndefined()
    })

    it('shouldReserveTestingColumnForIndicatorsEvenWithoutCoaLinks', () => {
        const composer = new LabelComposer()
        const withoutIndicators = composer.compose({ compoundName: 'Test' })
        const withIndicators = composer.compose({
            compoundName: 'Test',
            showTestIndicators: true,
            testLcms: 'pass',
        })
        const toggleOnButNothingSelected = composer.compose({
            compoundName: 'Test',
            showTestIndicators: true,
        })

        expect(withoutIndicators.testIndicators).toEqual([])
        expect(withoutIndicators.qrColumnWidthPercent).toBe(0)
        expect(withIndicators.testIndicators).toHaveLength(1)
        expect(withIndicators.testIndicatorLayout).toBeDefined()
        expect(withIndicators.qrColumnWidthPercent).toBeGreaterThan(0)
        expect(toggleOnButNothingSelected.testIndicators).toEqual([])
        expect(toggleOnButNothingSelected.qrColumnWidthPercent).toBe(0)
    })
})