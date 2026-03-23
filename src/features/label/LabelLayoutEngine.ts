export interface LabelLayoutInput {
    lines: string[]
    widthMm: number
    heightMm: number
}

export interface LabelLayoutResult {
    wrappedLines: string[]
    fontSizePx: number
}

interface WrapState {
    lines: string[]
    current: string
    didChopWord: boolean
}

export class LabelLayoutEngine {
    private readonly MIN_FONT_SIZE_PX = 8;
    private readonly INITIAL_FONT_SIZE_PX = 26;

    public layout(input: LabelLayoutInput): LabelLayoutResult {
        for (let size = this.INITIAL_FONT_SIZE_PX; size >= this.MIN_FONT_SIZE_PX; size -= 1) {
            const attempt = this.tryLayoutAtSize(input, size)
            if (attempt.fits) return { wrappedLines: attempt.lines, fontSizePx: size }
        }

        return this.fallbackToMinSize(input)
    }

    private tryLayoutAtSize(input: LabelLayoutInput, fontSizePx: number) {
        const maxChars = this.estimateMaxCharsPerLine(input.widthMm, fontSizePx)
        const wrapResult = this.wrapLines(input.lines, maxChars)

        // DOMAIN RULE: If we chopped a word, and we can still shrink the font, do it.
        if (wrapResult.didChopWord && fontSizePx > this.MIN_FONT_SIZE_PX) {
            return { fits: false, lines: [] }
        }

        const fitsHeight = this.doesFitHeight(wrapResult.lines.length, input.heightMm, fontSizePx)
        return { fits: fitsHeight, lines: wrapResult.lines }
    }

    private fallbackToMinSize(input: LabelLayoutInput): LabelLayoutResult {
        const maxChars = this.estimateMaxCharsPerLine(input.widthMm, this.MIN_FONT_SIZE_PX)
        const wrapResult = this.wrapLines(input.lines, maxChars)
        return { wrappedLines: wrapResult.lines, fontSizePx: this.MIN_FONT_SIZE_PX }
    }

    private estimateMaxCharsPerLine(widthMm: number, fontSizePx: number): number {
        const widthPx = this.mmToPx(widthMm)
        const approxCharWidthPx = fontSizePx * 0.6
        return Math.max(4, Math.floor(widthPx / approxCharWidthPx))
    }

    private mmToPx(mm: number): number {
        const dpi = 203
        const inches = mm / 25.4
        return inches * dpi
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

        // If we get here, a single word is too long and MUST be chopped
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
        const heightPx = this.mmToPx(heightMm)
        const lineHeightPx = fontSizePx * 1.2
        const requiredPx = lineCount * lineHeightPx
        return requiredPx <= heightPx
    }
}