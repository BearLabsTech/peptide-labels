import { describe, it, expect } from 'vitest'
import { LabelLayoutEngine } from './LabelLayoutEngine'
import { mmToPx } from './print/dimensions'

describe('LabelLayoutEngine', () => {
    it('itShouldReturnSameLinesWhenTheyAlreadyFit', () => {
        const engine = new LabelLayoutEngine(300)

        const result = engine.layout({
            lines: ['Line 1', 'Line 2'],
            widthMm: 40,
            heightMm: 20
        })

        expect(result.wrappedLines).toEqual(['Line 1', 'Line 2'])
        expect(result.fontSizePx).toBeGreaterThan(0)
    })

    it('itShouldWrapLongLines', () => {
        const engine = new LabelLayoutEngine(300)

        const result = engine.layout({
            lines: ['This is a very long line that must wrap'],
            widthMm: 40,
            heightMm: 20
        })

        expect(result.wrappedLines.length).toBeGreaterThan(1)
    })

    it('itShouldWrapIntoMultipleLinesWhenLineExceedsWidth', () => {
        const engine = new LabelLayoutEngine(300)

        const result = engine.layout({
            lines: ['123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890'],
            widthMm: 40,
            heightMm: 20
        })

        expect(result.wrappedLines.length).toBeGreaterThan(1)
    })

    it('itShouldReduceFontSizeWhenTooManyLinesToFitHeight', () => {
        const engine = new LabelLayoutEngine(300)

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

        expect(result.fontSizePx).toBeLessThan(26)
    })

    it('itShouldWrapMoreAggressivelyWhenWidthIsSmaller', () => {
        const engine = new LabelLayoutEngine(300)

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

    it('itShouldShrinkBoxedBodyFontWhenSectionsOverflow', () => {
        const engine = new LabelLayoutEngine(300)
        const labelWidthPx = mmToPx(40, 300)

        const result = engine.layoutBoxedBody({
            boxes: [
                { lines: ['2 BAC Water', '10mg per ml', 'Mixed 20260621'] },
                { lines: ['10 units (1mg)', 'Weekly'] },
                { lines: ['Vendor: Test Labs', 'Lot: TEST01'] },
            ],
            widthMm: 14,
            heightMm: 8,
            labelWidthPx,
        })

        expect(result.fontSizePx).toBeLessThan(26)
    })

    it('itShouldShrinkBoldTitleToFitCenterColumnWidth', () => {
        const engine = new LabelLayoutEngine(203)
        const innerMm = 38
        const centerWidthMm = Math.max(1, innerMm * (1 - 0.2 - 0.38) - 2) * 0.92

        const result = engine.layout({
            lines: ['TEST COMPOUND 20MG'],
            widthMm: centerWidthMm,
            heightMm: 18,
            charWidthEm: 0.95,
            widthSafety: 0.92,
        })

        const widthPx = mmToPx(centerWidthMm, 203) * 0.92
        const tokens = result.wrappedLines.flatMap((line) => line.split(' '))
        const longestPx = Math.max(...tokens.map((word) => word.length * result.fontSizePx * 0.95))
        expect(longestPx).toBeLessThanOrEqual(widthPx)
        expect(result.fontSizePx).toBeLessThan(26)
    })
})
