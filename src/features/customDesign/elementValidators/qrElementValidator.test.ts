import { describe, expect, it } from 'vitest'
import type { ElementValidationContext } from './elementValidator'
import { qrElementValidator } from './qrElementValidator'

function context(overrides: Partial<ElementValidationContext> = {}): ElementValidationContext {
  return {
    path: 'elements[0]',
    slotKeys: new Set(['batchNumber']),
    assetIds: new Set(),
    ...overrides,
  }
}

function validQrElement(): Record<string, unknown> {
  return {
    id: 'el-qr',
    frame: { xMm: 1, yMm: 1, widthMm: 8, heightMm: 8 },
    rotationDeg: 0,
    zIndex: 4,
    content: { kind: 'slot', slotKey: 'batchNumber' },
  }
}

describe('qrElementValidator', () => {
  it('should accept a well-formed QR element bound to a known slot', () => {
    const result = qrElementValidator.validate(validQrElement(), context())
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.type).toBe('qr')
      expect(result.value.content).toEqual({ kind: 'slot', slotKey: 'batchNumber' })
    }
  })

  it('should accept a QR element with static text content', () => {
    const input = { ...validQrElement(), content: { kind: 'static', text: 'https://example.com' } }
    const result = qrElementValidator.validate(input, context())
    expect(result.ok).toBe(true)
  })

  it('should reject a QR element bound to an unknown slot key', () => {
    const input = { ...validQrElement(), content: { kind: 'slot', slotKey: 'missingSlot' } }
    const result = qrElementValidator.validate(input, context())
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.issues.some((issue) => issue.message.includes('unknown slot key'))).toBe(true)
    }
  })

  it('should reject non-object input', () => {
    const result = qrElementValidator.validate(null, context())
    expect(result.ok).toBe(false)
  })

  it('should reject an element that fails the shared base checks', () => {
    const input = { ...validQrElement(), frame: 'nope' }
    const result = qrElementValidator.validate(input, context())
    expect(result.ok).toBe(false)
  })
})
