import { describe, it, expect } from 'vitest'
import { LabelComposer } from './LabelComposer'

describe('LabelComposer', () => {

    it('itShouldComposeStandardLayout', () => {
        const composer = new LabelComposer()
        const result = composer.compose({
            compoundName: 'Tirzepatide',
            compoundAmount: '20',
            vialUnit: 'mg'
        })

        expect(result.title).toBe('Tirzepatide 20mg')
        expect(result.wrappedLines.length).toBeGreaterThan(0)
    })

    it('itShouldFormatUnitsCorrectlyInTitleAndProtocol', () => {
        const composer = new LabelComposer()

        const resultIu = composer.compose({
            compoundName: 'HGH',
            compoundAmount: '36',
            vialUnit: 'IU',
            protocolAmount: '2',
            doseUnit: 'IU'
        })
        expect(resultIu.title).toBe('HGH 36IU')
        expect(resultIu.protocolLines).toContain('2IU')

        const resultMg = composer.compose({
            compoundName: 'Tirz',
            compoundAmount: '10',
            vialUnit: 'mg',
            protocolAmount: '500',
            doseUnit: 'mcg'
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
            doseUnit: 'IU'
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
})