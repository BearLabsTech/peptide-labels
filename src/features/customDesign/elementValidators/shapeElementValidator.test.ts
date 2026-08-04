import { describe, expect, it } from 'vitest'
import type { ElementValidationContext } from './elementValidator'
import { shapeElementValidator } from './shapeElementValidator'

function context(overrides: Partial<ElementValidationContext> = {}): ElementValidationContext {
  return {
    path: 'elements[0]',
    slotKeys: new Set(),
    assetIds: new Set(),
    ...overrides,
  }
}

function validShapeElement(): Record<string, unknown> {
  return {
    id: 'el-border',
    frame: { xMm: 0.6, yMm: 0.6, widthMm: 38.8, heightMm: 18.8 },
    rotationDeg: 0,
    zIndex: 0,
    shape: 'rect',
    stroke: true,
    fill: false,
  }
}

describe('shapeElementValidator', () => {
  it('should accept a well-formed rect shape element', () => {
    const result = shapeElementValidator.validate(validShapeElement(), context())
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.type).toBe('shape')
      expect(result.value.shape).toBe('rect')
    }
  })

  it('should reject a shape element with an unknown shape kind', () => {
    const input = { ...validShapeElement(), shape: 'triangle' }
    const result = shapeElementValidator.validate(input, context())
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.some((issue) => issue.message.includes('must be rect or line'))).toBe(
        true,
      )
    }
  })

  it('should reject a shape element with a non-boolean stroke flag', () => {
    const input = { ...validShapeElement(), stroke: 'yes' }
    const result = shapeElementValidator.validate(input, context())
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.some((issue) => issue.path.endsWith('.stroke'))).toBe(true)
    }
  })

  it('should reject a shape element with a non-boolean fill flag', () => {
    const input = { ...validShapeElement(), fill: 'no' }
    const result = shapeElementValidator.validate(input, context())
    expect(result.ok).toBe(false)
  })

  it('should reject non-object input', () => {
    const result = shapeElementValidator.validate(undefined, context())
    expect(result.ok).toBe(false)
  })

  it('should reject an element that fails the shared base checks', () => {
    const input = { ...validShapeElement(), rotationDeg: 'zero' }
    const result = shapeElementValidator.validate(input, context())
    expect(result.ok).toBe(false)
  })
})
