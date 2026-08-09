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
import { LABEL_TYPOGRAPHY } from './labelTypography'

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
            arrangement: 'stacked',
        })

        expect(result.fontSizePx).toBeLessThan(26)
    })

    it('should estimate a shorter body height for a row of two boxes than for the same boxes stacked', () => {
        const engine = new LabelLayoutEngine(300)
        const labelWidthPx = mmToPx(40, 300)
        const boxes = [
            { lines: ['2 ml', '10mg per ml'] },
            { lines: ['20 units (2mg)'] },
        ]
        const shared = { widthMm: 30, heightMm: 10, labelWidthPx }
        const bodyFontPx = 14
        const rowPx = engine.estimateBoxedBodyHeightPx(
            { ...shared, boxes, arrangement: 'row' },
            bodyFontPx,
        )
        // Stacked equivalent: each box alone at full width, plus one inter-box gap.
        const boxA = engine.estimateBoxedBodyHeightPx(
            { ...shared, boxes: [boxes[0]], arrangement: 'stacked' },
            bodyFontPx,
        )
        const boxB = engine.estimateBoxedBodyHeightPx(
            { ...shared, boxes: [boxes[1]], arrangement: 'stacked' },
            bodyFontPx,
        )
        const gapPx = labelWidthPx * (LABEL_TYPOGRAPHY.boxGapCqw / 100)
        // estimateBoxedBodyHeightPx multiplies by BODY_HEIGHT_SAFETY (1.12); undo so we
        // can recombine the two single-box estimates into a stacked total.
        const SAFETY = 1.12
        const stackedPx = (boxA / SAFETY + boxB / SAFETY + gapPx) * SAFETY
        expect(rowPx).toBeLessThan(stackedPx)
    })

    it('should fit a larger body font when two short sections sit in a row vs three stacked', () => {
        const engine = new LabelLayoutEngine(300)
        const labelWidthPx = mmToPx(40, 300)
        const shared = { widthMm: 30, heightMm: 8, labelWidthPx }
        const two = engine.layoutBoxedBody({
            ...shared,
            arrangement: 'row',
            boxes: [
                { lines: ['2 ml', '10mg per ml'] },
                { lines: ['20 units (2mg)'] },
            ],
        })
        const three = engine.layoutBoxedBody({
            ...shared,
            arrangement: 'stacked',
            boxes: [
                { lines: ['2 ml', '10mg per ml'] },
                { lines: ['20 units (2mg)'] },
                { lines: ['Vendor: Labs'] },
            ],
        })
        expect(two.fontSizePx).toBeGreaterThan(three.fontSizePx)
    })

    it('should wrap body section lines against half width when arranged in a row of two', () => {
        const engine = new LabelLayoutEngine(300)
        const lines = ['Group: Bear\'s Den']
        const labelWidthPx = mmToPx(40, 300)
        const full = engine.wrapBodySectionLines(lines, 20, 16, 1, labelWidthPx, 'stacked')
        const half = engine.wrapBodySectionLines(lines, 20, 16, 2, labelWidthPx, 'row')
        expect(half.length).toBeGreaterThanOrEqual(full.length)
    })

    it('should require half-width section labels when arranged in a row of two', () => {
        const engine = new LabelLayoutEngine(300)
        // Wide enough for RECONSTITUTION at full width, too narrow at half.
        const widthMm = 14
        const bodyFontPx = 20
        const labelWidthPx = mmToPx(40, 300)
        expect(engine.sectionLabelsFitBoxWidth(widthMm, bodyFontPx, 1, labelWidthPx, 'stacked')).toBe(true)
        expect(engine.sectionLabelsFitBoxWidth(widthMm, bodyFontPx, 2, labelWidthPx, 'row')).toBe(false)
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
