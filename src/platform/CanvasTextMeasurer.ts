import type { TextMeasurer } from '../shared/ports'

/**
 * Measures text via an offscreen canvas. Humble: no layout decisions — only
 * `measureText`. Font family is injected so this adapter never imports a
 * feature module (platform → features is banned).
 */
export class CanvasTextMeasurer implements TextMeasurer {
  private readonly fontFamily: string
  private ctx: CanvasRenderingContext2D | null = null

  constructor(fontFamily: string) {
    this.fontFamily = fontFamily
  }

  measureWidthPx(text: string, fontPx: number, fontWeight: number): number {
    if (!text || fontPx <= 0) return 0
    const ctx = this.getContext()
    ctx.font = `${fontWeight} ${fontPx}px ${this.fontFamily}`
    return ctx.measureText(text).width
  }

  private getContext(): CanvasRenderingContext2D {
    if (this.ctx) return this.ctx
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Canvas rendering is unavailable')
    }
    this.ctx = ctx
    return ctx
  }
}
