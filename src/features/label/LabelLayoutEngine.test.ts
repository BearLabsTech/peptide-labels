import { describe, it, expect } from 'vitest'
import {
    LabelLayoutEngine,
    parseLabeledLine,
    processWord,
    tryWrapLabeledLine,
    type WrapState,
} from './LabelLayoutEngine'
import { mmToPx } from '../../print/dimensions'
import { HeuristicTextMeasurer } from './domain/HeuristicTextMeasurer'

const TITLE_WEIGHT = 900
const BODY_WEIGHT = 600

describe('LabelLayoutEngine', () => {
    it('should return same lines when they already fit', () => {
        const engine = new LabelLayoutEngine(300)

        const result = engine.layout({
            lines: ['Line 1', 'Line 2'],
            widthMm: 40,
            heightMm: 20,
            fontWeight: BODY_WEIGHT,
        })

        expect(result.wrappedLines).toEqual(['Line 1', 'Line 2'])
        expect(result.fontSizePx).toBeGreaterThan(0)
    })

    it('should wrap long lines', () => {
        const engine = new LabelLayoutEngine(300)

        const result = engine.layout({
            lines: ['This is a very long line that must wrap'],
            widthMm: 40,
            heightMm: 20,
            fontWeight: BODY_WEIGHT,
        })

        expect(result.wrappedLines.length).toBeGreaterThan(1)
    })

    it('should wrap into multiple lines when line exceeds width', () => {
        const engine = new LabelLayoutEngine(300)

        const result = engine.layout({
            lines: ['123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890'],
            widthMm: 40,
            heightMm: 20,
            fontWeight: BODY_WEIGHT,
        })

        expect(result.wrappedLines.length).toBeGreaterThan(1)
    })

    it('should reduce font size when too many lines to fit height', () => {
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
            heightMm: 20,
            fontWeight: BODY_WEIGHT,
        })

        expect(result.fontSizePx).toBeLessThan(26)
    })

    it('should wrap more aggressively when width is smaller', () => {
        const engine = new LabelLayoutEngine(300)

        const wide = engine.layout({
            lines: ['This is a line that should wrap differently depending on width'],
            widthMm: 40,
            heightMm: 20,
            fontWeight: BODY_WEIGHT,
        })

        const narrow = engine.layout({
            lines: ['This is a line that should wrap differently depending on width'],
            widthMm: 20,
            heightMm: 20,
            fontWeight: BODY_WEIGHT,
        })

        expect(narrow.wrappedLines.length).toBeGreaterThan(wide.wrappedLines.length)
    })

    it('should shrink boxed body font when sections overflow', () => {
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

    it('should shrink bold title to fit center column width', () => {
        const dpi = 203
        const measurer = new HeuristicTextMeasurer()
        const engine = new LabelLayoutEngine(dpi, 26, measurer)
        const innerMm = 38
        const centerWidthMm = Math.max(1, innerMm * (1 - 0.2 - 0.38) - 2) * 0.92
        const widthSafety = 0.92

        const result = engine.layout({
            lines: ['TEST COMPOUND 20MG'],
            widthMm: centerWidthMm,
            heightMm: 18,
            fontWeight: TITLE_WEIGHT,
            widthSafety,
        })

        const widthPx = mmToPx(centerWidthMm, dpi) * widthSafety
        const tokens = result.wrappedLines.flatMap((line) => line.split(' '))
        const longestPx = Math.max(
            ...tokens.map((word) => measurer.measureWidthPx(word, result.fontSizePx, TITLE_WEIGHT)),
        )
        expect(longestPx).toBeLessThanOrEqual(widthPx)
        expect(result.fontSizePx).toBeLessThan(26)
    })
})

describe('labeled line wrap', () => {
    /** Char-count predicate so wrap tests stay independent of glyph metrics. */
    const fitsMaxChars = (maxChars: number) => (text: string) => text.length <= maxChars

    it('parseLabeledLine extracts Label: value pairs', () => {
        expect(parseLabeledLine("Group: Bear's Den")).toEqual({
            label: 'Group:',
            value: "Bear's Den",
        })
        expect(parseLabeledLine('plain title')).toBeNull()
    })

    it('tryWrapLabeledLine keeps a multi-word value on one line under the label', () => {
        // Full line is too wide; value alone still fits — prefer Americana-style stack.
        const fits = fitsMaxChars(12)
        const wrapValue = (value: string) =>
            fits(value)
                ? { lines: [value], didChopWord: false }
                : { lines: value.split(' '), didChopWord: false }

        expect(tryWrapLabeledLine("Group: Bear's Den", fits, wrapValue)).toEqual({
            lines: ['Group:', "Bear's Den"],
            didChopWord: false,
        })
        expect(tryWrapLabeledLine('Group: Americana', fits, wrapValue)).toEqual({
            lines: ['Group:', 'Americana'],
            didChopWord: false,
        })
    })

    it('should not leave Group: glued to the first word of a multi-word value', () => {
        const dpi = 203
        const engine = new LabelLayoutEngine(dpi, 26, new HeuristicTextMeasurer())
        const result = engine.layout({
            lines: ["Group: Bear's Den"],
            widthMm: 14,
            heightMm: 14,
            fontWeight: BODY_WEIGHT,
            widthSafety: 1,
        })

        expect(result.wrappedLines[0]).toBe('Group:')
        expect(result.wrappedLines.some((line) => line.startsWith('Group:') && line !== 'Group:')).toBe(false)
    })
})

describe('processWord', () => {
    const empty: WrapState = { lines: [], current: '', didChopWord: false }
    /** Char-count predicate so wrap-state-machine tests stay independent of glyph metrics. */
    const fitsMaxChars = (maxChars: number) => (text: string) => text.length <= maxChars

    it('should append a word that fits onto the current line without mutating the input state', () => {
        const before: WrapState = { lines: ['kept'], current: 'hello', didChopWord: false }
        const next = processWord('world', fitsMaxChars(20), before)

        expect(next).toEqual({ lines: ['kept'], current: 'hello world', didChopWord: false })
        expect(before).toEqual({ lines: ['kept'], current: 'hello', didChopWord: false })
        expect(next).not.toBe(before)
    })

    it('should flush the current line when the next word does not fit', () => {
        const next = processWord('world', fitsMaxChars(8), { lines: [], current: 'hello', didChopWord: false })
        expect(next).toEqual({ lines: ['hello'], current: 'world', didChopWord: false })
    })

    it('should chop an oversized token when the current line is empty', () => {
        const next = processWord('abcdefghij', fitsMaxChars(4), empty)
        expect(next.didChopWord).toBe(true)
        expect(next.current).toBe('')
        expect(next.lines).toEqual(['abcd', 'efgh', 'ij'])
        expect(empty).toEqual({ lines: [], current: '', didChopWord: false })
    })
})
