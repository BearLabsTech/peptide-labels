import { describe, expect, it } from 'vitest'
import type { ElementValidationContext } from './elementValidator'
import { textElementValidator } from './textElementValidator'

function context(overrides: Partial<ElementValidationContext> = {}): ElementValidationContext {
  return {
    path: 'elements[0]',
    slotKeys: new Set(['compoundName']),
    assetIds: new Set(),
    ...overrides,
  }
}

function validTextElement(): Record<string, unknown> {
  return {
    id: 'el-name',
    frame: { xMm: 6, yMm: 2.2, widthMm: 22, heightMm: 6 },
    rotationDeg: 0,
    zIndex: 3,
    content: { kind: 'slot', slotKey: 'compoundName' },
    fontId: 'display',
    fontSizePt: 8,
    bold: true,
    alignH: 'left',
    alignV: 'middle',
    wrap: true,
    fill: 'none',
    ink: 'black',
  }
}

describe('textElementValidator', () => {
  it('should accept a well-formed text element bound to a known slot', () => {
    const result = textElementValidator.validate(validTextElement(), context())
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.type).toBe('text')
      expect(result.value.id).toBe('el-name')
      expect(result.value.fontId).toBe('display')
    }
  })

  it('should reject a text element with an unknown curated font id', () => {
    const input = { ...validTextElement(), fontId: 'comic-sans-unbundled' }
    const result = textElementValidator.validate(input, context())
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.issues.some((issue) => issue.message.includes('unknown curated font id'))).toBe(
        true,
      )
    }
  })

  it('should reject a text element bound to an unknown slot key', () => {
    const input = { ...validTextElement(), content: { kind: 'slot', slotKey: 'missingSlot' } }
    const result = textElementValidator.validate(input, context())
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.issues.some((issue) => issue.message.includes('unknown slot key'))).toBe(true)
    }
  })

  it('should reject non-object input', () => {
    const result = textElementValidator.validate('not-an-object', context())
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.issues[0]?.message).toBe('must be an object')
    }
  })

  it('should reject an element that fails the shared base checks', () => {
    const input = { ...validTextElement(), id: '' }
    const result = textElementValidator.validate(input, context())
    expect(result.ok).toBe(false)
  })

  it('should reject invalid bold, alignment, wrap, fill, and ink fields', () => {
    const input = {
      ...validTextElement(),
      bold: 'yes',
      alignH: 'diagonal',
      alignV: 'somewhere',
      wrap: 'no',
      fill: 'gradient',
      ink: 'rainbow',
    }
    const result = textElementValidator.validate(input, context())
    expect(result.ok).toBe(false)
    if (!result.ok) {
      const paths = result.issues.map((issue) => issue.path)
      expect(paths).toContain(`${context().path}.bold`)
      expect(paths).toContain(`${context().path}.alignH`)
      expect(paths).toContain(`${context().path}.alignV`)
      expect(paths).toContain(`${context().path}.wrap`)
      expect(paths).toContain(`${context().path}.fill`)
      expect(paths).toContain(`${context().path}.ink`)
    }
  })

  it('should reject a missing fontId and a non-positive fontSizePt', () => {
    const input = { ...validTextElement(), fontId: '', fontSizePt: 0 }
    const result = textElementValidator.validate(input, context())
    expect(result.ok).toBe(false)
    if (!result.ok) {
      const paths = result.issues.map((issue) => issue.path)
      expect(paths).toContain(`${context().path}.fontId`)
      expect(paths).toContain(`${context().path}.fontSizePt`)
    }
  })
})
