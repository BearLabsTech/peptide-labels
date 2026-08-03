import { describe, it, expect } from 'vitest'
import {
  DESIGN_DOCUMENT_SCHEMA_VERSION,
  DEFAULT_DESIGN_VISIBILITY,
  isBuiltInSlotKey,
} from './designDocument'
import type { DesignDocument } from './designDocument'
import { parseDesignDocument, serializeDesignDocument } from './designDocumentCodec'
import { validateDesignDocument } from './validateDesignDocument'
import { SAMPLE_MITOCHONDRIA_DESIGN } from './fixtures/sampleMitochondriaDesign'

/** Deeply mutable clone for constructing invalid fixtures; production types stay readonly. */
type DeepWritable<T> = T extends readonly (infer U)[]
  ? DeepWritable<U>[]
  : T extends object
    ? { -readonly [K in keyof T]: DeepWritable<T[K]> }
    : T

function cloneDesign(document: DesignDocument): DeepWritable<DesignDocument> {
  return structuredClone(document) as DeepWritable<DesignDocument>
}

describe('DesignDocument schema', () => {
  it('should use schema version 1 and private visibility by default for the golden fixture', () => {
    expect(SAMPLE_MITOCHONDRIA_DESIGN.schemaVersion).toBe(DESIGN_DOCUMENT_SCHEMA_VERSION)
    expect(SAMPLE_MITOCHONDRIA_DESIGN.visibility).toBe(DEFAULT_DESIGN_VISIBILITY)
    expect(SAMPLE_MITOCHONDRIA_DESIGN.visibility).toBe('private')
  })

  it('should recognize built-in compound identity slot keys', () => {
    expect(isBuiltInSlotKey('compoundName')).toBe(true)
    expect(isBuiltInSlotKey('compoundAmount')).toBe(true)
    expect(isBuiltInSlotKey('customPurityNote')).toBe(false)
  })
})

describe('validateDesignDocument', () => {
  it('should accept the mitochondria golden fixture', () => {
    const result = validateDesignDocument(SAMPLE_MITOCHONDRIA_DESIGN)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.document.id).toBe('design-fixture-mitochondria-40x20')
      expect(result.document.elements.some((el) => el.type === 'text' && el.rotationDeg === 270)).toBe(
        true,
      )
      expect(
        result.document.elements.some(
          (el) => el.type === 'text' && el.fill === 'solid' && el.ink === 'reverse',
        ),
      ).toBe(true)
      expect(result.document.elements.some((el) => el.type === 'image')).toBe(true)
    }
  })

  it('should return a newly built document distinct from the caller input (no shared references)', () => {
    const input = cloneDesign(SAMPLE_MITOCHONDRIA_DESIGN)
    const originalName = input.name
    const result = validateDesignDocument(input)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.document).not.toBe(input)
    expect(result.document.slots).not.toBe(input.slots)
    expect(result.document.elements).not.toBe(input.elements)
    expect(result.document.assets).not.toBe(input.assets)
    expect(result.document.stock).not.toBe(input.stock)
    ;(result.document as DeepWritable<DesignDocument>).name = 'mutated-after-validate'
    expect(input.name).toBe(originalName)
  })

  it('should reject an unknown schema version', () => {
    const bad = cloneDesign(SAMPLE_MITOCHONDRIA_DESIGN) as unknown as Record<string, unknown>
    bad.schemaVersion = 99
    const result = validateDesignDocument(bad)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.issues.some((i) => i.path === 'schemaVersion')).toBe(true)
    }
  })

  it('should reject a text box bound to a missing slot key', () => {
    const bad = cloneDesign(SAMPLE_MITOCHONDRIA_DESIGN)
    const nameEl = bad.elements.find((el) => el.id === 'el-name')
    expect(nameEl?.type).toBe('text')
    if (nameEl?.type === 'text') {
      nameEl.content = { kind: 'slot', slotKey: 'missingSlot' }
    }
    const result = validateDesignDocument(bad)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.issues.some((i) => i.message.includes('unknown slot key'))).toBe(true)
    }
  })

  it('should reject an image box that references a missing asset', () => {
    const bad = cloneDesign(SAMPLE_MITOCHONDRIA_DESIGN)
    const imageEl = bad.elements.find((el) => el.id === 'el-mito-image')
    expect(imageEl?.type).toBe('image')
    if (imageEl?.type === 'image') {
      imageEl.assetId = 'asset-does-not-exist'
    }
    const result = validateDesignDocument(bad)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.issues.some((i) => i.message.includes('unknown asset id'))).toBe(true)
    }
  })

  it('should reject assets stored as data URIs or http URLs instead of raw base64', () => {
    const asDataUri = cloneDesign(SAMPLE_MITOCHONDRIA_DESIGN)
    asDataUri.assets[0].dataBase64 = `data:image/png;base64,${asDataUri.assets[0].dataBase64}`
    expect(validateDesignDocument(asDataUri).ok).toBe(false)

    const asUrl = cloneDesign(SAMPLE_MITOCHONDRIA_DESIGN)
    asUrl.assets[0].dataBase64 = 'https://example.com/mito.png'
    expect(validateDesignDocument(asUrl).ok).toBe(false)
  })

  it('should reject duplicate slot keys', () => {
    const bad = cloneDesign(SAMPLE_MITOCHONDRIA_DESIGN)
    bad.slots.push({
      key: 'compoundName',
      label: 'Duplicate',
      type: 'text',
      required: false,
    })
    const result = validateDesignDocument(bad)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.issues.some((i) => i.message.includes('duplicate slot key'))).toBe(true)
    }
  })

  it('should reject an unknown curated font id', () => {
    const bad = cloneDesign(SAMPLE_MITOCHONDRIA_DESIGN)
    const nameEl = bad.elements.find((el) => el.id === 'el-name')
    if (nameEl?.type === 'text') {
      nameEl.fontId = 'comic-sans-unbundled'
    }
    const result = validateDesignDocument(bad)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.issues.some((i) => i.message.includes('unknown curated font id'))).toBe(true)
    }
  })

  it('should reject non-positive frame dimensions', () => {
    const bad = cloneDesign(SAMPLE_MITOCHONDRIA_DESIGN)
    bad.elements[0].frame.widthMm = 0
    const result = validateDesignDocument(bad)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.issues.some((i) => i.path.includes('widthMm'))).toBe(true)
    }
  })
})

describe('serializeDesignDocument and parseDesignDocument', () => {
  it('should round-trip the mitochondria golden fixture through JSON', () => {
    const json = serializeDesignDocument(SAMPLE_MITOCHONDRIA_DESIGN)
    const parsed = parseDesignDocument(json)
    expect(parsed.ok).toBe(true)
    if (parsed.ok) {
      expect(parsed.document).toEqual(SAMPLE_MITOCHONDRIA_DESIGN)
    }
  })

  it('should preserve rotationDeg and inverted text style across round-trip', () => {
    const json = serializeDesignDocument(SAMPLE_MITOCHONDRIA_DESIGN)
    const parsed = parseDesignDocument(json)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return

    const side = parsed.document.elements.find((el) => el.id === 'el-side-label')
    const amount = parsed.document.elements.find((el) => el.id === 'el-amount-inverted')
    expect(side?.type).toBe('text')
    expect(amount?.type).toBe('text')
    if (side?.type === 'text') {
      expect(side.rotationDeg).toBe(270)
    }
    if (amount?.type === 'text') {
      expect(amount.fill).toBe('solid')
      expect(amount.ink).toBe('reverse')
      expect(amount.content).toEqual({ kind: 'slot', slotKey: 'compoundAmount' })
    }
  })

  it('should preserve embedded image asset bytes across round-trip', () => {
    const json = serializeDesignDocument(SAMPLE_MITOCHONDRIA_DESIGN)
    const parsed = parseDesignDocument(json)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.document.assets).toEqual(SAMPLE_MITOCHONDRIA_DESIGN.assets)
    const image = parsed.document.elements.find((el) => el.id === 'el-mito-image')
    expect(image?.type).toBe('image')
    if (image?.type === 'image') {
      expect(image.assetId).toBe('asset-mito')
    }
  })

  it('should fail parse when JSON is malformed', () => {
    const result = parseDesignDocument('{ not json')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.parseError).toBeTruthy()
    }
  })
})
