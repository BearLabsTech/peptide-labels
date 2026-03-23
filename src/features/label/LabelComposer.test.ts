import { describe, it, expect } from 'vitest'
import { LabelComposer } from './LabelComposer'

describe('LabelComposer', () => {

    it('itShouldComposeRenderableModelFromUserInput', () => {
        const composer = new LabelComposer()

        const result = composer.compose({
            compoundName: 'Tirzepatide',
            compoundAmount: '20mg',
            reconstitutionAmount: '2ml',
            reconstitutionType: 'BAC',
            concentration: '1mg per 10 units',
            protocolUnits: '40 units weekly',
            protocolAmount: '4mg',
            reconstitutionDate: '20260222'
        })

        expect(result.wrappedLines.length).toBeGreaterThan(0)
        expect(result.titleFontSizePx).toBeGreaterThan(0)
        expect(result.bodyFontSizePx).toBeGreaterThan(0)
    })

    it('itShouldWrapMoreWhenUsingDefault40x20LabelIfTextIsLong', () => {
        const composer = new LabelComposer()

        const result = composer.compose({
            compoundName: 'Cagrilintide + Tirzepatide Blend (Research)',
            compoundAmount: '30mg',
            reconstitutionAmount: '3mL',
            reconstitutionType: 'BAC'
        })

        expect(result.wrappedLines.length).toBeGreaterThanOrEqual(2)
    })

    it('itShouldShrinkFontToFitLongWordInsteadOfChoppingPrematurely', () => {
        const composer = new LabelComposer()

        const result = composer.compose({
            compoundName: '1234567890123456789012345678901234567890'
        })

        expect(result.wrappedLines.length).toBe(1)
        // UPDATED: Now testing against the new 26px ceiling
        expect(result.titleFontSizePx).toBeLessThan(26)
    })

    it('itShouldConstrainLayoutMoreWhenPaddingIsLarger', () => {
        const composerWithNoPadding = new LabelComposer({ paddingMm: 0 })
        const composerWithPadding = new LabelComposer({ paddingMm: 2 })

        const input = {
            compoundName: 'This is a line that should wrap differently depending on padding'
        }

        const noPadding = composerWithNoPadding.compose(input)
        const padded = composerWithPadding.compose(input)

        const isMoreConstrained =
            padded.wrappedLines.length > noPadding.wrappedLines.length ||
            padded.titleFontSizePx < noPadding.titleFontSizePx

        expect(isMoreConstrained).toBe(true)
    })

    it('itShouldExposeStructuredFieldsForStyledPreview', () => {
        const composer = new LabelComposer()

        const result = composer.compose({
            compoundName: 'Tirzepatide',
            compoundAmount: '20mg',
            reconstitutionAmount: '2ml',
            reconstitutionType: 'BAC',
            concentration: '1mg per 10 units',
            protocolUnits: '40 units',
            protocolAmount: '4mg',
            protocolFrequency: 'Weekly',
            reconstitutionDate: '20260315'
        })

        expect(result.title).toBe('Tirzepatide 20mg')
        expect(result.protocolLines).toEqual([
            '40 units (4mg)',
            'Weekly'
        ])
        expect(result.reconstitutionLines).toEqual([
            '2ml BAC',
            '1mg per 10 units',
            '20260315'
        ])
    })

    it('itShouldComposeTitleAndReconstitutionSectionForStyledPreview', () => {
        const composer = new LabelComposer()

        const result = composer.compose({
            compoundName: 'Tirzepatide',
            compoundAmount: '20mg',
            reconstitutionAmount: '2ml',
            reconstitutionType: 'BAC',
            concentration: '1mg per 10 units',
            protocolUnits: '40 units',
            protocolAmount: '4mg',
            protocolFrequency: 'Weekly',
            reconstitutionDate: '20260315'
        })

        expect(result.title).toBe('Tirzepatide 20mg')
        expect(result.reconstitutionLines).toEqual([
            '2ml BAC',
            '1mg per 10 units',
            '20260315'
        ])
        expect(result.protocolLines).toEqual([
            '40 units (4mg)',
            'Weekly'
        ])
    })

    it('itShouldIncludeProtocolFrequencyWithoutProtocolAmount', () => {
        const composer = new LabelComposer()

        const result = composer.compose({
            protocolUnits: '40 units',
            protocolFrequency: 'Weekly'
        })

        expect(result.protocolLines).toEqual([
            '40 units',
            'Weekly'
        ])
    })

    it('itShouldIncludeProtocolFrequencyWhenOnlyFrequencyIsProvided', () => {
        const composer = new LabelComposer()

        const result = composer.compose({
            protocolFrequency: 'Weekly'
        })

        expect(result.protocolLines).toEqual([
            'Weekly'
        ])
    })

    it('itShouldScaleDownFontForVeryLongCompoundNamesToMaintainProfessionalLayout', () => {
        const composer = new LabelComposer()

        const result = composer.compose({
            compoundName: 'Superlongcompoundsurnamewithacetate',
            compoundAmount: '100mg',
            reconstitutionAmount: '10ml',
            reconstitutionType: 'Bacteriostatic Water',
            protocolUnits: '1000mcg',
            protocolFrequency: 'Three times per week'
        })

        // UPDATED: Now testing against the new 26px ceiling
        expect(result.titleFontSizePx).toBeLessThan(26);
        expect(result.titleFontSizePx).toBeGreaterThan(4);
        expect(result.bodyFontSizePx).toBe(19);
    })

})