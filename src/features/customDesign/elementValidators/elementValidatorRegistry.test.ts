import { describe, expect, it } from 'vitest'
import { ELEMENT_VALIDATORS, validateElement } from './elementValidatorRegistry'

function context() {
  return { path: 'elements[0]', slotKeys: new Set<string>(), assetIds: new Set<string>() }
}

describe('ELEMENT_VALIDATORS registry', () => {
  it('should register exactly one validator per known element kind', () => {
    expect(Object.keys(ELEMENT_VALIDATORS).sort()).toEqual(['image', 'qr', 'shape', 'text'])
  })
})

describe('validateElement dispatch', () => {
  it('should reject non-object input', () => {
    const result = validateElement('not-an-object', context())
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.some((issue) => issue.message === 'must be an object')).toBe(true)
    }
  })

  it('should reject an unknown element kind', () => {
    const result = validateElement(
      {
        id: 'el-x',
        frame: { xMm: 0, yMm: 0, widthMm: 1, heightMm: 1 },
        rotationDeg: 0,
        zIndex: 0,
        type: 'video',
      },
      context(),
    )
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(
        result.error.some((issue) => issue.message.includes('must be text, image, qr, or shape')),
      ).toBe(true)
    }
  })

  it('should dispatch a known kind to its registered validator', () => {
    const result = validateElement(
      {
        id: 'el-shape',
        frame: { xMm: 0, yMm: 0, widthMm: 1, heightMm: 1 },
        rotationDeg: 0,
        zIndex: 0,
        type: 'shape',
        shape: 'rect',
        stroke: true,
        fill: false,
      },
      context(),
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.type).toBe('shape')
    }
  })
})
