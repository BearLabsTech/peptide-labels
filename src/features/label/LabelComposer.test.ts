import { describe, it, expect } from 'vitest'
import { LabelComposer } from './LabelComposer'

describe('LabelComposer', () => {

    it('itShouldComposeStandardLayout', () => {
        const composer = new LabelComposer()
        const result = composer.compose({
            compoundName: 'Tirzepatide',
            compoundAmount: '20mg'
        })

        expect(result.title).toBe('Tirzepatide 20mg')
        expect(result.demotedTitle).toBeUndefined()
        expect(result.wrappedLines.length).toBeGreaterThan(0)
    })

    it('itShouldShrinkBodyTextAndLightenTitleInDangerMode', () => {
        const composer = new LabelComposer()

        const standardResult = composer.compose({
            compoundName: 'Reta',
            compoundAmount: '20mg'
        })

        const dangerResult = composer.compose({
            compoundName: 'Reta',
            compoundAmount: '20mg',
            isUntested: true
        })

        // Body text must be artificially shrunk to emphasize the Danger title
        expect(dangerResult.bodyFontSizePx).toBeLessThan(standardResult.bodyFontSizePx)

        // Ensure name demotion works
        expect(dangerResult.demotedTitle).toBe('Reta 20mg')
    })

    it('itShouldAllocateFullHeightToTitleWhenNoBodyExists', () => {
        const composer = new LabelComposer()
        const result = composer.compose({ compoundName: 'Reta' })
        expect(result.titleFontSizePx).toBeGreaterThan(20)
    })
})