import { describe, it, expect } from 'vitest'
import { LabelLayoutEngine } from './LabelLayoutEngine'

describe('LabelLayoutEngine', () => {

    it('itShouldReturnSameLinesWhenTheyAlreadyFit', () => {
        const engine = new LabelLayoutEngine()

        const result = engine.layout({
            lines: ['Line 1', 'Line 2'],
            widthMm: 40,
            heightMm: 20
        })

        expect(result.wrappedLines).toEqual(['Line 1', 'Line 2'])
        expect(result.fontSizePx).toBeGreaterThan(0)
    })

    it('itShouldWrapLongLines', () => {
        const engine = new LabelLayoutEngine()

        const result = engine.layout({
            lines: ['This is a very long line that must wrap'],
            widthMm: 40,
            heightMm: 20
        })

        expect(result.wrappedLines.length).toBeGreaterThan(1)
    })

    it('itShouldWrapIntoMultipleLinesWhenLineExceedsWidth', () => {
        const engine = new LabelLayoutEngine()

        const result = engine.layout({
            // 80 characters - long enough to force a wrap even at minimum font size (8px)
            lines: ['12345678901234567890123456789012345678901234567890123456789012345678901234567890'],
            widthMm: 40,
            heightMm: 20
        })

        expect(result.wrappedLines.length).toBeGreaterThan(1)
    })

    it('itShouldReduceFontSizeWhenTooManyLinesToFitHeight', () => {
        const engine = new LabelLayoutEngine()

        const result = engine.layout({
            lines: [
                'This is a fairly long line that will wrap',
                'This is a fairly long line that will wrap',
                'This is a fairly long line that will wrap',
                'This is a fairly long line that will wrap',
                'This is a fairly long line that will wrap',
                'This is a fairly long line that will wrap'
            ],
            widthMm: 40,
            heightMm: 20
        })

        expect(result.fontSizePx).toBeLessThan(16)
    })

    it('itShouldWrapMoreAggressivelyWhenWidthIsSmaller', () => {
        const engine = new LabelLayoutEngine()

        const wide = engine.layout({
            lines: ['This is a line that should wrap differently depending on width'],
            widthMm: 40,
            heightMm: 20
        })

        const narrow = engine.layout({
            lines: ['This is a line that should wrap differently depending on width'],
            widthMm: 20,
            heightMm: 20
        })

        expect(narrow.wrappedLines.length).toBeGreaterThan(wide.wrappedLines.length)
    })

})