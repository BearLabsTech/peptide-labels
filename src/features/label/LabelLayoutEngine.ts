import { mmToPx } from '../../print/dimensions'
import { MIN_FONT_SIZE_PX, REF_MAX_FONT_SIZE_PX } from './labelLayoutConstants'
import { LABEL_TYPOGRAPHY } from './labelTypography'
import { HeuristicTextMeasurer } from './domain/HeuristicTextMeasurer'
import type { TextMeasurer } from './domain/ports'

export interface LabelLayoutInput {
    readonly lines: readonly string[]
    readonly widthMm: number
    readonly heightMm: number
    /** CSS font-weight used when measuring (title 900, body 600, etc.). */
    readonly fontWeight: number
    /** Fraction of widthMm to treat as usable (residual buffer for subpixel variance). */
    readonly widthSafety?: number
}

export interface LabelLayoutResult {
    readonly wrappedLines: readonly string[]
    readonly fontSizePx: number
}

export interface BoxedSection {
    readonly lines: readonly string[]
}

export interface BoxedBodyLayoutInput {
    readonly boxes: readonly BoxedSection[]
    readonly demotedLine?: string
    readonly widthMm: number
    readonly heightMm: number
    readonly labelWidthPx: number
}

export interface WrapState {
    readonly lines: readonly string[]
    readonly current: string
    readonly didChopWord: boolean
}

/** Residual width buffer after measured glyphs (not a worst-case letter estimate). */
const WIDTH_SAFETY_DEFAULT = 0.98
const SECTION_LABEL_MARGIN_PX = 2
/** Longest section header on label (matches preview DOM). */
const LONGEST_SECTION_LABEL = 'RECONSTITUTION'
const BOX_INNER_WIDTH_FRAC = 0.85
/** Layout estimate vs DOM — borders, letter-spacing, subpixel rounding. */
const BODY_HEIGHT_SAFETY = 1.12
const SECTION_LABEL_LINE_HEIGHT = 1.15
/** Font weight of `.label-preview-box-content` (see LabelPreview.css). */
export const BODY_CONTENT_FONT_WEIGHT = 600
/** Font weight of `.label-section-label` (see LabelPreview.css). */
export const SECTION_LABEL_FONT_WEIGHT = 800

export class LabelLayoutEngine {
    private readonly maxFontSizePx: number
    private readonly dpi: number
    private readonly measurer: TextMeasurer

    constructor(
        dpi: number,
        maxFontSizePx = REF_MAX_FONT_SIZE_PX,
        measurer: TextMeasurer = new HeuristicTextMeasurer(),
    ) {
        this.dpi = dpi
        this.maxFontSizePx = maxFontSizePx
        this.measurer = measurer
    }

    public getMaxFontSizePx(): number {
        return this.maxFontSizePx
    }

    public layout(input: LabelLayoutInput): LabelLayoutResult {
        for (let size = this.maxFontSizePx; size >= MIN_FONT_SIZE_PX; size -= 1) {
            const attempt = this.tryLayoutAtSize(input, size)
            if (attempt.fits) return { wrappedLines: attempt.lines, fontSizePx: size }
        }

        return this.fallbackToMinSize(input)
    }

    /** Layout body sections as bordered boxes (matches preview DOM, not flat text). */
    public layoutBoxedBody(input: BoxedBodyLayoutInput): LabelLayoutResult {
        for (let size = this.maxFontSizePx; size >= MIN_FONT_SIZE_PX; size -= 1) {
            const heightPx = this.estimateBoxedBodyHeightPx(input, size)
            const budgetPx = mmToPx(input.heightMm, this.dpi)
            if (heightPx <= budgetPx && this.sectionLabelsFitBoxWidth(input.widthMm, size)) {
                return {
                    fontSizePx: size,
                    wrappedLines: this.flattenBoxLines(input, size),
                }
            }
        }

        return {
            fontSizePx: MIN_FONT_SIZE_PX,
            wrappedLines: this.flattenBoxLines(input, MIN_FONT_SIZE_PX),
        }
    }

    public sectionLabelsFitBoxWidth(widthMm: number, bodyFontPx: number): boolean {
        const innerPx = mmToPx(widthMm, this.dpi) * BOX_INNER_WIDTH_FRAC
        const labelFontPx = bodyFontPx * LABEL_TYPOGRAPHY.sectionLabelEm
        const labelWidthPx = this.measurer.measureWidthPx(
            LONGEST_SECTION_LABEL,
            labelFontPx,
            SECTION_LABEL_FONT_WEIGHT,
        )
        return labelWidthPx <= innerPx
    }

    public estimateTitleHeightPx(lineCount: number, fontSizePx: number): number {
        const lineBoxes = lineCount * fontSizePx * LABEL_TYPOGRAPHY.titleLineHeightEm
        return lineBoxes + fontSizePx * LABEL_TYPOGRAPHY.titleInkOverflowEm
    }

    /**
     * Wrap authored section lines the same way height estimation does, so the
     * preview can render explicit breaks (e.g. `Group:` then `Bear's Den`)
     * instead of leaving CSS to greedy-wrap a single string.
     */
    public wrapBodySectionLines(
        lines: readonly string[],
        widthMm: number,
        bodyFontPx: number,
    ): string[] {
        const contentFontPx = bodyFontPx * LABEL_TYPOGRAPHY.contentEm
        // Match section-label usable width (box padding + border), not the full cell.
        const fitsWidth = this.makeFitsWidth(
            widthMm * BOX_INNER_WIDTH_FRAC,
            contentFontPx,
            BODY_CONTENT_FONT_WEIGHT,
            WIDTH_SAFETY_DEFAULT,
        )
        const result: string[] = []
        for (const line of lines) {
            result.push(...this.wrapSingleLine(line, fitsWidth).lines)
        }
        return result
    }

    private flattenBoxLines(input: BoxedBodyLayoutInput, bodyFontPx: number): string[] {
        const lines: string[] = []
        if (input.demotedLine) lines.push(input.demotedLine)
        for (const box of input.boxes) {
            lines.push(...this.wrapBodySectionLines(box.lines, input.widthMm, bodyFontPx))
        }
        return lines
    }

    public layoutAtSize(input: LabelLayoutInput, fontSizePx: number): LabelLayoutResult | null {
        const attempt = this.tryLayoutAtSize(input, fontSizePx)
        if (!attempt.fits) return null
        return { wrappedLines: attempt.lines, fontSizePx }
    }

    public estimateBoxedBodyHeightPx(input: BoxedBodyLayoutInput, bodyFontPx: number): number {
        const cqw = (pct: number) => input.labelWidthPx * (pct / 100)
        const boxPadPx = cqw(LABEL_TYPOGRAPHY.boxPadVerticalCqw) * 2
        const boxGapPx = cqw(LABEL_TYPOGRAPHY.boxGapCqw)
        const boxBorderPx = LABEL_TYPOGRAPHY.borderWidthPx * 2 // top + bottom
        const contentFontPx = bodyFontPx * LABEL_TYPOGRAPHY.contentEm
        const contentLinePx = contentFontPx * LABEL_TYPOGRAPHY.contentLineHeightEm
        const sectionLabelPx = bodyFontPx * LABEL_TYPOGRAPHY.sectionLabelEm * SECTION_LABEL_LINE_HEIGHT + SECTION_LABEL_MARGIN_PX

        let totalPx = 0

        if (input.demotedLine) {
            totalPx += bodyFontPx * 1.1 + boxGapPx
        }

        for (const box of input.boxes) {
            const contentLines = this.wrapBodySectionLines(box.lines, input.widthMm, bodyFontPx).length
            totalPx += boxBorderPx + boxPadPx + sectionLabelPx + contentLines * contentLinePx + boxGapPx
        }

        if (input.boxes.length > 0) {
            totalPx -= boxGapPx
        }

        return totalPx * BODY_HEIGHT_SAFETY
    }

    /** Title + gap + boxed body must fit the printable inner height. */
    public estimateCenterStackHeightPx(
        titleLineCount: number,
        titleFontPx: number,
        titleBodyGapMm: number,
        bodyInput: BoxedBodyLayoutInput,
        bodyFontPx: number,
    ): number {
        const gapPx = mmToPx(titleBodyGapMm, this.dpi)
        return this.estimateTitleHeightPx(titleLineCount, titleFontPx) + gapPx + this.estimateBoxedBodyHeightPx(bodyInput, bodyFontPx)
    }

    private tryLayoutAtSize(input: LabelLayoutInput, fontSizePx: number) {
        const widthSafety = input.widthSafety ?? WIDTH_SAFETY_DEFAULT
        const fitsWidth = this.makeFitsWidth(input.widthMm, fontSizePx, input.fontWeight, widthSafety)
        const wrapResult = this.wrapLines(input.lines, fitsWidth)

        if (wrapResult.didChopWord && fontSizePx > MIN_FONT_SIZE_PX) {
            return { fits: false, lines: [] }
        }

        if (!this.longestLineFitsWidth(wrapResult.lines, fitsWidth)) {
            return { fits: false, lines: [] }
        }

        const fitsHeight = this.doesFitHeight(wrapResult.lines.length, input.heightMm, fontSizePx)
        return { fits: fitsHeight, lines: wrapResult.lines }
    }

    private fallbackToMinSize(input: LabelLayoutInput): LabelLayoutResult {
        const widthSafety = input.widthSafety ?? WIDTH_SAFETY_DEFAULT
        const fitsWidth = this.makeFitsWidth(
            input.widthMm,
            MIN_FONT_SIZE_PX,
            input.fontWeight,
            widthSafety,
        )
        const wrapResult = this.wrapLines(input.lines, fitsWidth)
        return { wrappedLines: wrapResult.lines, fontSizePx: MIN_FONT_SIZE_PX }
    }

    private makeFitsWidth(
        widthMm: number,
        fontSizePx: number,
        fontWeight: number,
        widthSafety: number,
    ): (text: string) => boolean {
        const widthPx = mmToPx(widthMm, this.dpi) * widthSafety
        return (text: string) => this.measurer.measureWidthPx(text, fontSizePx, fontWeight) <= widthPx
    }

    private longestLineFitsWidth(
        lines: readonly string[],
        fitsWidth: (text: string) => boolean,
    ): boolean {
        if (lines.length === 0) return true
        return lines.every((line) => {
            if (!fitsWidth(line)) return false
            return line.split(' ').every((word) => fitsWidth(word))
        })
    }

    private wrapLines(
        lines: readonly string[],
        fitsWidth: (text: string) => boolean,
    ): { lines: string[], didChopWord: boolean } {
        const result: string[] = []
        let didChopWord = false

        for (const line of lines) {
            const lineResult = this.wrapSingleLine(line, fitsWidth)
            result.push(...lineResult.lines)
            if (lineResult.didChopWord) didChopWord = true
        }

        return { lines: result, didChopWord }
    }

    private wrapSingleLine(
        line: string,
        fitsWidth: (text: string) => boolean,
    ): { lines: string[], didChopWord: boolean } {
        if (fitsWidth(line)) {
            return { lines: [line], didChopWord: false }
        }
        // Prefer "Group:" / "Bear's Den" over "Group: Bear's" / "Den" for Label: value lines.
        const labeled = tryWrapLabeledLine(line, fitsWidth, (value) => this.wrapByWords(value, fitsWidth))
        if (labeled) return labeled
        return this.wrapByWords(line, fitsWidth)
    }

    private wrapByWords(
        line: string,
        fitsWidth: (text: string) => boolean,
    ): { lines: string[], didChopWord: boolean } {
        let state: WrapState = { lines: [], current: '', didChopWord: false }

        for (const word of line.split(' ')) {
            state = processWord(word, fitsWidth, state)
        }

        if (state.current) {
            return { lines: [...state.lines, state.current], didChopWord: state.didChopWord }
        }

        return { lines: [...state.lines], didChopWord: state.didChopWord }
    }

    private doesFitHeight(lineCount: number, heightMm: number, fontSizePx: number): boolean {
        // Slightly more conservative than estimateTitleHeightPx so a title's own
        // height band is not the first thing to loosen when ink-overflow is added
        // to the stack estimate (stack constraint is what prevents sticker clip).
        const heightPx = mmToPx(heightMm, this.dpi)
        const lineHeightPx = fontSizePx * 1.2
        return lineCount * lineHeightPx <= heightPx
    }
}

/**
 * Lines shaped like `Vendor: Name` / `Group: Bear's Den`. When the whole line
 * does not fit, break after the label so the value stays together on following
 * lines (avoids orphaning the last word of a multi-word value).
 */
const LABELED_LINE = /^([^\s:]+:)\s+(.+)$/

export function parseLabeledLine(line: string): { label: string; value: string } | null {
    const match = LABELED_LINE.exec(line)
    if (!match) return null
    return { label: match[1], value: match[2] }
}

export function tryWrapLabeledLine(
    line: string,
    fitsWidth: (text: string) => boolean,
    wrapValue: (value: string) => { lines: string[]; didChopWord: boolean },
): { lines: string[]; didChopWord: boolean } | null {
    const labeled = parseLabeledLine(line)
    if (!labeled) return null
    if (!fitsWidth(labeled.label)) return null
    const valueResult = wrapValue(labeled.value)
    return {
        lines: [labeled.label, ...valueResult.lines],
        didChopWord: valueResult.didChopWord,
    }
}

/** Pure word-wrap step — returns a new WrapState; never mutates the input state. */
export function processWord(
    word: string,
    fitsWidth: (text: string) => boolean,
    state: WrapState,
): WrapState {
    const next = combineWords(state.current, word)

    if (fitsWidth(next)) {
        return { lines: state.lines, current: next, didChopWord: state.didChopWord }
    }

    if (state.current) {
        return {
            lines: [...state.lines, state.current],
            current: word,
            didChopWord: state.didChopWord,
        }
    }

    return {
        lines: [...state.lines, ...wrapLongToken(word, fitsWidth)],
        current: '',
        didChopWord: true,
    }
}

function combineWords(current: string, word: string): string {
    if (!current) return word
    return `${current} ${word}`
}

/** Chop an oversized token into the longest prefixes that still fit. */
function wrapLongToken(token: string, fitsWidth: (text: string) => boolean): string[] {
    const parts: string[] = []
    let remaining = token
    while (remaining.length > 0) {
        if (fitsWidth(remaining)) {
            parts.push(remaining)
            break
        }
        let lo = 1
        let hi = remaining.length
        while (lo < hi) {
            const mid = Math.ceil((lo + hi) / 2)
            if (fitsWidth(remaining.slice(0, mid))) lo = mid
            else hi = mid - 1
        }
        const take = Math.max(1, lo)
        parts.push(remaining.slice(0, take))
        remaining = remaining.slice(take)
    }
    return parts
}
