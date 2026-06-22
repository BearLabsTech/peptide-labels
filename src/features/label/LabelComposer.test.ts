import { describe, it, expect } from 'vitest'
import { LabelComposer } from './LabelComposer'
import { resolvePrintTarget } from './print/PrintTargetResolver'
import { mmToPx } from './print/dimensions'

const TITLE_CHAR_WIDTH_EM = 0.95
const TITLE_WIDTH_SAFETY = 0.92
const TITLE_WIDTH_FRAC = 0.92
const CENTER_FRAC = 1 - 0.2 - 0.38

function centerColumnWidthMm(target: ReturnType<typeof resolvePrintTarget>, hasLeft: boolean, hasRight: boolean): number {
    const innerMm = target.labelWidthMm - target.paddingMm * 2
    const gapCount = (hasLeft ? 1 : 0) + (hasRight ? 1 : 0)
    return Math.max(1, innerMm * CENTER_FRAC - target.paddingMm * gapCount)
}

function centerTitleWidthPx(target: ReturnType<typeof resolvePrintTarget>): number {
    const titleWidthMm = centerColumnWidthMm(target, true, true) * TITLE_WIDTH_FRAC
    return mmToPx(titleWidthMm, target.effectiveDpi) * TITLE_WIDTH_SAFETY
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

        expect(result.title).toBe('Tirzepatide 20mg')
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
        expect(resultIu.title).toBe('HGH 36IU')
        expect(resultIu.protocolLines).toContain('2IU')

        const resultMg = composer.compose({
            compoundName: 'Tirz',
            compoundAmount: '10',
            vialUnit: 'mg',
            protocolAmount: '500',
            measureUnit: 'mcg'
        })
        expect(resultMg.title).toBe('Tirz 10mg')
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
        expect(result.title).toBe('HGH 36IU')
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
        expect(dangerResult.demotedTitle).toBe('Reta 20mg')
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

    it('itShouldShrinkTitleFontWhenMascotAndQrFlankCenterColumn', () => {
        const target = resolvePrintTarget({ stockId: '40x20-rect', printerId: 'niimbot-b21' })
        const composer = new LabelComposer(target)
        const result = composer.compose({
            compoundName: 'Test Compound',
            compoundAmount: '20',
            vialUnit: 'mg',
            customImage: 'data:image/png;base64,test',
            vendorCoa: 'https://example.com/coa',
        })

        const budgetPx = centerTitleWidthPx(target)
        expect(longestTitleLinePx(result.titleLines, result.titleFontSizePx)).toBeLessThanOrEqual(budgetPx)
        expect(result.titleFontSizePx).toBeLessThan(26)
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
        expect(result.bodyFontSizePx).toBeLessThan(26)
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
        const centerColumnMm = (target.labelWidthMm - target.paddingMm * 2) * (1 - 0.2 - 0.38) - target.paddingMm * 2
        const bodyInput = {
            boxes: [
                { lines: result.reconstitutionLines },
                { lines: result.protocolLines },
                { lines: result.sourceLines },
            ],
            widthMm: centerColumnMm * 0.92,
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
})