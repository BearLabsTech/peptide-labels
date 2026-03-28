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
        expect(result.wrappedLines.length).toBeGreaterThan(0)
    })

    // --- CRITICAL DANGER FOCUS TEST ---
    it('itShouldForceDangerStatusToFourLinesWhenUntested', () => {
        const composer = new LabelComposer()
        const result = composer.compose({
            compoundName: 'Reta',
            compoundAmount: '20mg',
            isUntested: true
        })

        // Verify the raw title string structure
        expect(result.title).toBe('☠️\nDanger\nUntested\n☠️')

        // Verify the layout engine actually wrapped it into 4 distinct lines
        // This confirms it is using the full 50% height allocated in the composer
        const dangerLines = result.wrappedLines.filter(l =>
            l === '☠️' || l === 'Danger' || l === 'Untested'
        )
        expect(dangerLines.length).toBe(4)

        // Ensure the compound name exists in the body
        expect(result.protocolLines).toContain('Reta 20mg')
    })
})