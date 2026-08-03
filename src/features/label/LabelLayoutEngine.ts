import { mmToPx } from '../../print/dimensions'
import { MIN_FONT_SIZE_PX, REF_MAX_FONT_SIZE_PX } from './labelLayoutConstants'
import { LABEL_TYPOGRAPHY } from './labelTypography'

export interface LabelLayoutInput {
    readonly lines: readonly string[]
    readonly widthMm: number
    readonly heightMm: number
    /** Average glyph width as a fraction of font size (body default 0.6; bold uppercase title ~0.95). */
    readonly charWidthEm?: number
    /** Fraction of widthMm to treat as usable (title uses ~0.92 for thermal rounding). */
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

const SECTION_LABEL_MARGIN_PX = 2
/** Longest section header on label (matches preview DOM). */
const LONGEST_SECTION_LABEL = 'RECONSTITUTION'
const SECTION_LABEL_CHAR_WIDTH_EM = 0.68
const BOX_INNER_WIDTH_FRAC = 0.85
/** Layout estimate vs DOM — borders, letter-spacing, subpixel rounding. */
const BODY_HEIGHT_SAFETY = 1.12
const SECTION_LABEL_LINE_HEIGHT = 1.15

export class LabelLayoutEngine {
    private readonly maxFontSizePx: number;
    private readonly dpi: number;

    constructor(dpi: number, maxFontSizePx = REF_MAX_FONT_SIZE_PX) {
        this.dpi = dpi;
        this.maxFontSizePx = maxFontSizePx;
    }

    public getMaxFontSizePx(): number {
        return this.maxFontSizePx;
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
        const labelWidthPx = LONGEST_SECTION_LABEL.length * labelFontPx * SECTION_LABEL_CHAR_WIDTH_EM
        return labelWidthPx <= innerPx
    }

    public estimateTitleHeightPx(lineCount: number, fontSizePx: number): number {
        return lineCount * fontSizePx * LABEL_TYPOGRAPHY.titleLineHeightEm
    }

    private flattenBoxLines(input: BoxedBodyLayoutInput, bodyFontPx: number): string[] {
        const contentFontPx = bodyFontPx * LABEL_TYPOGRAPHY.contentEm
        const maxChars = this.estimateMaxCharsPerLine(input.widthMm, contentFontPx)
        const lines: string[] = []
        if (input.demotedLine) lines.push(input.demotedLine)
        for (const box of input.boxes) {
            for (const line of box.lines) {
                lines.push(...this.wrapSingleLine(line, maxChars).lines)
            }
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
        const maxChars = this.estimateMaxCharsPerLine(input.widthMm, contentFontPx)

        let totalPx = 0

        if (input.demotedLine) {
            totalPx += bodyFontPx * 1.1 + boxGapPx
        }

        for (const box of input.boxes) {
            let contentLines = 0
            for (const line of box.lines) {
                contentLines += this.wrapSingleLine(line, maxChars).lines.length
            }
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
        const charWidthEm = input.charWidthEm ?? 0.6
        const widthSafety = input.widthSafety ?? 1
        const maxChars = this.estimateMaxCharsPerLine(input.widthMm, fontSizePx, charWidthEm, widthSafety)
        const wrapResult = this.wrapLines(input.lines, maxChars)

        if (wrapResult.didChopWord && fontSizePx > MIN_FONT_SIZE_PX) {
            return { fits: false, lines: [] }
        }

        if (!this.longestLineFitsWidth(wrapResult.lines, input.widthMm, fontSizePx, charWidthEm, widthSafety)) {
            return { fits: false, lines: [] }
        }

        const fitsHeight = this.doesFitHeight(wrapResult.lines.length, input.heightMm, fontSizePx)
        return { fits: fitsHeight, lines: wrapResult.lines }
    }

    private fallbackToMinSize(input: LabelLayoutInput): LabelLayoutResult {
        const charWidthEm = input.charWidthEm ?? 0.6
        const widthSafety = input.widthSafety ?? 1
        const maxChars = this.estimateMaxCharsPerLine(input.widthMm, MIN_FONT_SIZE_PX, charWidthEm, widthSafety)
        const wrapResult = this.wrapLines(input.lines, maxChars)
        return { wrappedLines: wrapResult.lines, fontSizePx: MIN_FONT_SIZE_PX }
    }

    private estimateMaxCharsPerLine(widthMm: number, fontSizePx: number, charWidthEm = 0.6, widthSafety = 1): number {
        const widthPx = mmToPx(widthMm, this.dpi) * widthSafety
        const approxCharWidthPx = fontSizePx * charWidthEm
        return Math.max(4, Math.floor(widthPx / approxCharWidthPx))
    }

    private longestLineFitsWidth(
        lines: readonly string[],
        widthMm: number,
        fontSizePx: number,
        charWidthEm: number,
        widthSafety = 1,
    ): boolean {
        if (lines.length === 0) return true
        const widthPx = mmToPx(widthMm, this.dpi) * widthSafety
        return lines.every((line) => {
            const linePx = line.length * fontSizePx * charWidthEm
            if (linePx > widthPx) return false
            return line.split(' ').every((word) => word.length * fontSizePx * charWidthEm <= widthPx)
        })
    }

    private wrapLines(lines: readonly string[], maxChars: number): { lines: string[], didChopWord: boolean } {
        const result: string[] = []
        let didChopWord = false

        for (const line of lines) {
            const lineResult = this.wrapSingleLine(line, maxChars)
            result.push(...lineResult.lines)
            if (lineResult.didChopWord) didChopWord = true
        }

        return { lines: result, didChopWord }
    }

    private wrapSingleLine(line: string, maxChars: number): { lines: string[], didChopWord: boolean } {
        if (line.length <= maxChars) {
            return { lines: [line], didChopWord: false }
        }
        return this.wrapByWords(line, maxChars)
    }

    private wrapByWords(line: string, maxChars: number): { lines: string[], didChopWord: boolean } {
        let state: WrapState = { lines: [], current: '', didChopWord: false }

        for (const word of line.split(' ')) {
            state = processWord(word, maxChars, state)
        }

        if (state.current) {
            return { lines: [...state.lines, state.current], didChopWord: state.didChopWord }
        }

        return { lines: [...state.lines], didChopWord: state.didChopWord }
    }

    private doesFitHeight(lineCount: number, heightMm: number, fontSizePx: number): boolean {
        const heightPx = mmToPx(heightMm, this.dpi)
        const lineHeightPx = fontSizePx * 1.2
        const requiredPx = lineCount * lineHeightPx
        return requiredPx <= heightPx
    }
}

/** Pure word-wrap step — returns a new WrapState; never mutates the input state. */
export function processWord(word: string, maxChars: number, state: WrapState): WrapState {
    const next = combineWords(state.current, word)

    if (next.length <= maxChars) {
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
        lines: [...state.lines, ...wrapLongToken(word, maxChars)],
        current: '',
        didChopWord: true,
    }
}

function combineWords(current: string, word: string): string {
    if (!current) return word
    return `${current} ${word}`
}

function wrapLongToken(token: string, maxChars: number): string[] {
    const parts: string[] = []
    for (let i = 0; i < token.length; i += maxChars) {
        parts.push(token.substring(i, i + maxChars))
    }
    return parts
}
