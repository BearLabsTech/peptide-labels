import { describe, expect, it } from 'vitest'
import type { ElementValidationContext } from './elementValidator'
import { imageElementValidator } from './imageElementValidator'

function context(overrides: Partial<ElementValidationContext> = {}): ElementValidationContext {
  return {
    path: 'elements[0]',
    slotKeys: new Set(),
    assetIds: new Set(['asset-mito']),
    ...overrides,
  }
}

function validImageElement(): Record<string, unknown> {
  return {
    id: 'el-mito-image',
    frame: { xMm: 26, yMm: 8.5, widthMm: 11, heightMm: 9 },
    rotationDeg: 0,
    zIndex: 1,
    assetId: 'asset-mito',
    objectFit: 'contain',
  }
}

describe('imageElementValidator', () => {
  it('should accept a well-formed image element referencing a known asset', () => {
    const result = imageElementValidator.validate(validImageElement(), context())
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.type).toBe('image')
      expect(result.value.assetId).toBe('asset-mito')
      expect(result.value.objectFit).toBe('contain')
    }
  })

  it('should reject an image element with a missing assetId', () => {
    const input = { ...validImageElement(), assetId: '' }
    const result = imageElementValidator.validate(input, context())
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.issues.some((issue) => issue.message === 'must be a non-empty string')).toBe(
        true,
      )
    }
  })

  it('should reject an image element referencing an unknown asset id', () => {
    const input = { ...validImageElement(), assetId: 'asset-does-not-exist' }
    const result = imageElementValidator.validate(input, context())
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.issues.some((issue) => issue.message.includes('unknown asset id'))).toBe(true)
    }
  })

  it('should reject an image element with an invalid objectFit', () => {
    const input = { ...validImageElement(), objectFit: 'stretch' }
    const result = imageElementValidator.validate(input, context())
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.issues.some((issue) => issue.path.endsWith('.objectFit'))).toBe(true)
    }
  })

  it('should reject non-object input', () => {
    const result = imageElementValidator.validate(42, context())
    expect(result.ok).toBe(false)
  })

  it('should reject an element that fails the shared base checks', () => {
    const input = { ...validImageElement(), id: '' }
    const result = imageElementValidator.validate(input, context())
    expect(result.ok).toBe(false)
  })
})
