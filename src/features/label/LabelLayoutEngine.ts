import { mmToPx } from './print/dimensions'

export interface LabelLayoutInput {
    lines: string[]
    widthMm: number
    heightMm: number
    /** Average glyph width as a fraction of font size (body default 0.6; bold uppercase title ~0.95). */
    charWidthEm?: number
    /** Fraction of widthMm to treat as usable (title uses ~0.92 for thermal rounding). */
    widthSafety?: number
}

export interface LabelLayoutResult {
    wrappedLines: string[]
    fontSizePx: number
}

export interface BoxedSection {
    lines: string[]
}

export interface BoxedBodyLayoutInput {
    boxes: BoxedSection[]
    demotedLine?: string
    widthMm: number
    heightMm: number
    labelWidthPx: number
}

interface WrapState {
    lines: string[]
    current: string
    didChopWord: boolean
}

/** Matches `LabelPreview.css` boxed section chrome. */
const BOX_BORDER_PX = 6
const SECTION_LABEL_EM = 0.55
const CONTENT_EM = 0.82
const CONTENT_LINE_HEIGHT = 1.25
const SECTION_LABEL_MARGIN_PX = 2
const BOX_PAD_CQW = 0.5
const BOX_GAP_CQW = 0.5
/** Longest section header on label (matches preview DOM). */
const LONGEST_SECTION_LABEL = 'RECONSTITUTION'
const SECTION_LABEL_CHAR_WIDTH_EM = 0.68
const BOX_INNER_WIDTH_FRAC = 0.85
/** Layout estimate vs DOM — borders, letter-spacing, subpixel rounding. */
const BODY_HEIGHT_SAFETY = 1.12
const SECTION_LABEL_LINE_HEIGHT = 1.15

export class LabelLayoutEngine {
    private readonly MIN_FONT_SIZE_PX = 8;
    private readonly INITIAL_FONT_SIZE_PX = 26;
    private readonly dpi: number;

    constructor(dpi: number) {
        this.dpi = dpi;
    }

    public layout(input: LabelLayoutInput): LabelLayoutResult {
        for (let size = this.INITIAL_FONT_SIZE_PX; size >= this.MIN_FONT_SIZE_PX; size -= 1) {
            const attempt = this.tryLayoutAtSize(input, size)
            if (attempt.fits) return { wrappedLines: attempt.lines, fontSizePx: size }
        }

        return this.fallbackToMinSize(input)
    }

    /** Layout body sections as bordered boxes (matches preview DOM, not flat text). */
    public layoutBoxedBody(input: BoxedBodyLayoutInput): LabelLayoutResult {
        for (let size = this.INITIAL_FONT_SIZE_PX; size >= this.MIN_FONT_SIZE_PX; size -= 1) {
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
            fontSizePx: this.MIN_FONT_SIZE_PX,
            wrappedLines: this.flattenBoxLines(input, this.MIN_FONT_SIZE_PX),
        }
    }

    public sectionLabelsFitBoxWidth(widthMm: number, bodyFontPx: number): boolean {
        const innerPx = mmToPx(widthMm, this.dpi) * BOX_INNER_WIDTH_FRAC
        const labelFontPx = bodyFontPx * SECTION_LABEL_EM
        const labelWidthPx = LONGEST_SECTION_LABEL.length * labelFontPx * SECTION_LABEL_CHAR_WIDTH_EM
        return labelWidthPx <= innerPx
    }

    public estimateTitleHeightPx(lineCount: number, fontSizePx: number): number {
        return lineCount * fontSizePx * 0.95
    }

    private flattenBoxLines(input: BoxedBodyLayoutInput, bodyFontPx: number): string[] {
        const contentFontPx = bodyFontPx * CONTENT_EM
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
        const boxPadPx = cqw(BOX_PAD_CQW) * 2
        const boxGapPx = cqw(BOX_GAP_CQW)
        const contentFontPx = bodyFontPx * CONTENT_EM
        const contentLinePx = contentFontPx * CONTENT_LINE_HEIGHT
        const sectionLabelPx = bodyFontPx * SECTION_LABEL_EM * SECTION_LABEL_LINE_HEIGHT + SECTION_LABEL_MARGIN_PX
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
            totalPx += BOX_BORDER_PX + boxPadPx + sectionLabelPx + contentLines * contentLinePx + boxGapPx
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

        if (wrapResult.didChopWord && fontSizePx > this.MIN_FONT_SIZE_PX) {
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
        const maxChars = this.estimateMaxCharsPerLine(input.widthMm, this.MIN_FONT_SIZE_PX, charWidthEm, widthSafety)
        const wrapResult = this.wrapLines(input.lines, maxChars)
        return { wrappedLines: wrapResult.lines, fontSizePx: this.MIN_FONT_SIZE_PX }
    }

    private estimateMaxCharsPerLine(widthMm: number, fontSizePx: number, charWidthEm = 0.6, widthSafety = 1): number {
        const widthPx = mmToPx(widthMm, this.dpi) * widthSafety
        const approxCharWidthPx = fontSizePx * charWidthEm
        return Math.max(4, Math.floor(widthPx / approxCharWidthPx))
    }

    private longestLineFitsWidth(
        lines: string[],
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

    private wrapLines(lines: string[], maxChars: number): { lines: string[], didChopWord: boolean } {
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
        const state: WrapState = { lines: [], current: '', didChopWord: false }

        for (const word of line.split(' ')) {
            this.processWord(word, maxChars, state)
        }

        if (state.current) state.lines.push(state.current)

        return { lines: state.lines, didChopWord: state.didChopWord }
    }

    private processWord(word: string, maxChars: number, state: WrapState): void {
        const next = this.combine(state.current, word)

        if (next.length <= maxChars) {
            state.current = next
            return
        }

        if (state.current) {
            state.lines.push(state.current)
            state.current = word
            return
        }

        state.didChopWord = true
        state.lines.push(...this.wrapLongToken(word, maxChars))
        state.current = ''
    }

    private wrapLongToken(token: string, maxChars: number): string[] {
        const parts: string[] = []
        for (let i = 0; i < token.length; i += maxChars) {
            parts.push(token.substring(i, i + maxChars))
        }
        return parts
    }

    private combine(current: string, word: string): string {
        if (!current) return word
        return `${current} ${word}`
    }

    private doesFitHeight(lineCount: number, heightMm: number, fontSizePx: number): boolean {
        const heightPx = mmToPx(heightMm, this.dpi)
        const lineHeightPx = fontSizePx * 1.2
        const requiredPx = lineCount * lineHeightPx
        return requiredPx <= heightPx
    }
}
