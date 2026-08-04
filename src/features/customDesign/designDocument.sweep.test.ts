import { describe, expect, it } from 'vitest'
import {
  DESIGN_DOCUMENT_SCHEMA_VERSION,
  type DesignDocument,
  type DesignElement,
  type DesignFrame,
} from './designDocument'
import { parseDesignDocument, serializeDesignDocument } from './designDocumentCodec'
import { parseDesignPackage, serializeDesignPackage } from './designPackage'
import { SAMPLE_MITOCHONDRIA_DESIGN } from './fixtures/sampleMitochondriaDesign'
import { validateDesignDocument } from './validateDesignDocument'

function baseFrame(overrides: Partial<DesignFrame> = {}): DesignFrame {
  return { xMm: 1, yMm: 1, widthMm: 10, heightMm: 5, ...overrides }
}

function minimalValidDocument(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: DESIGN_DOCUMENT_SCHEMA_VERSION,
    id: 'doc-minimal',
    name: 'Minimal',
    createdAt: '2026-08-03T00:00:00.000Z',
    updatedAt: '2026-08-03T00:00:00.000Z',
    visibility: 'private',
    stock: { kind: 'catalog', stockId: '40x20-rounded' },
    slots: [],
    assets: [],
    elements: [],
    ...overrides,
  }
}

function textElement(id: string, extras: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id,
    type: 'text',
    frame: baseFrame(),
    rotationDeg: 0,
    zIndex: 1,
    content: { kind: 'static', text: 'hello' },
    fontId: 'sans',
    fontSizePt: 8,
    bold: false,
    alignH: 'left',
    alignV: 'top',
    wrap: false,
    fill: 'none',
    ink: 'black',
    ...extras,
  }
}

function imageElement(id: string, assetId: string): Record<string, unknown> {
  return {
    id,
    type: 'image',
    frame: baseFrame(),
    rotationDeg: 0,
    zIndex: 1,
    assetId,
    objectFit: 'contain',
  }
}

function qrElement(id: string): Record<string, unknown> {
  return {
    id,
    type: 'qr',
    frame: baseFrame({ widthMm: 8, heightMm: 8 }),
    rotationDeg: 0,
    zIndex: 1,
    content: { kind: 'static', text: 'https://example.com' },
  }
}

function shapeElement(id: string): Record<string, unknown> {
  return {
    id,
    type: 'shape',
    frame: baseFrame(),
    rotationDeg: 0,
    zIndex: 0,
    shape: 'rect',
    stroke: true,
    fill: false,
  }
}

/** Constructed docs covering both stock variants and all four element kinds. */
function constructedDocuments(): DesignDocument[] {
  const catalog = validateDesignDocument(
    minimalValidDocument({
      id: 'doc-catalog-all-kinds',
      slots: [{ key: 'compoundName', label: 'Compound name', type: 'text', required: true }],
      assets: [{ id: 'asset-a', mimeType: 'image/png', dataBase64: 'AAAA' }],
      elements: [
        textElement('el-text', { content: { kind: 'slot', slotKey: 'compoundName' } }),
        imageElement('el-image', 'asset-a'),
        qrElement('el-qr'),
        shapeElement('el-shape'),
      ],
    }),
  )
  const custom = validateDesignDocument(
    minimalValidDocument({
      id: 'doc-custom-stock',
      stock: {
        kind: 'custom',
        widthMm: 40,
        heightMm: 20,
        shape: 'rounded',
        cornerRadiusMm: 2,
        paddingMm: 1,
      },
      elements: [textElement('el-empty-static', { content: { kind: 'static', text: '' } })],
    }),
  )
  if (!catalog.ok || !custom.ok) {
    throw new Error('constructedDocuments fixtures must validate')
  }
  return [catalog.document, custom.document, SAMPLE_MITOCHONDRIA_DESIGN]
}

function assertSuccessfulInvariants(document: DesignDocument): void {
  const slotKeys = document.slots.map((s) => s.key)
  expect(new Set(slotKeys).size).toBe(slotKeys.length)

  const assetIds = document.assets.map((a) => a.id)
  expect(new Set(assetIds).size).toBe(assetIds.length)

  const elementIds = document.elements.map((e) => e.id)
  expect(new Set(elementIds).size).toBe(elementIds.length)

  const slotKeySet = new Set(slotKeys)
  const assetIdSet = new Set(assetIds)

  for (const el of document.elements) {
    const { frame } = el
    expect(Number.isFinite(frame.xMm)).toBe(true)
    expect(Number.isFinite(frame.yMm)).toBe(true)
    expect(Number.isFinite(frame.widthMm)).toBe(true)
    expect(Number.isFinite(frame.heightMm)).toBe(true)
    expect(frame.widthMm).toBeGreaterThan(0)
    expect(frame.heightMm).toBeGreaterThan(0)

    if (el.type === 'text' || el.type === 'qr') {
      if (el.content.kind === 'slot') {
        expect(slotKeySet.has(el.content.slotKey)).toBe(true)
      }
    }
    if (el.type === 'image') {
      expect(assetIdSet.has(el.assetId)).toBe(true)
    }
  }
}

/** Fixed adversarial list — no random generation. */
const ADVERSARIAL_INPUTS: unknown[] = [
  null,
  [],
  42,
  '',
  true,
  { __proto__: { polluted: true } },
  { nested: { deeply: { a: 1 } } },
  minimalValidDocument({ schemaVersion: 99 }),
  minimalValidDocument({ id: '' }),
  minimalValidDocument({ id: '   ' }),
  minimalValidDocument({ name: 12 }),
  minimalValidDocument({ createdAt: '' }),
  minimalValidDocument({ updatedAt: null }),
  minimalValidDocument({ visibility: 'secret' }),
  minimalValidDocument({ stock: null }),
  minimalValidDocument({ stock: { kind: 'catalog', stockId: '' } }),
  minimalValidDocument({
    stock: {
      kind: 'custom',
      widthMm: Number.NaN,
      heightMm: 20,
      shape: 'rounded',
      cornerRadiusMm: 0,
      paddingMm: 0,
    },
  }),
  minimalValidDocument({
    stock: {
      kind: 'custom',
      widthMm: Number.POSITIVE_INFINITY,
      heightMm: 20,
      shape: 'rounded',
      cornerRadiusMm: 0,
      paddingMm: 0,
    },
  }),
  minimalValidDocument({ slots: 'nope' }),
  minimalValidDocument({ assets: {} }),
  minimalValidDocument({ elements: 7 }),
  minimalValidDocument({
    slots: [
      { key: 'a', label: 'A', type: 'text', required: true },
      { key: 'a', label: 'Dup', type: 'text', required: false },
    ],
  }),
  minimalValidDocument({
    assets: [
      { id: 'x', mimeType: 'image/png', dataBase64: 'AA' },
      { id: 'x', mimeType: 'image/jpeg', dataBase64: 'BB' },
    ],
  }),
  minimalValidDocument({
    elements: [textElement('same'), textElement('same')],
  }),
  minimalValidDocument({
    elements: [textElement('el-1', { content: { kind: 'slot', slotKey: 'missing' } })],
  }),
  minimalValidDocument({
    elements: [imageElement('el-img', 'missing-asset')],
  }),
  minimalValidDocument({
    elements: [textElement('el-1', { frame: baseFrame({ widthMm: 0 }) })],
  }),
  minimalValidDocument({
    elements: [textElement('el-1', { frame: baseFrame({ heightMm: Number.NaN }) })],
  }),
  // Missing each required top-level field in turn
  (() => {
    const d = minimalValidDocument()
    delete d.id
    return d
  })(),
  (() => {
    const d = minimalValidDocument()
    delete d.name
    return d
  })(),
  (() => {
    const d = minimalValidDocument()
    delete d.stock
    return d
  })(),
  (() => {
    const d = minimalValidDocument()
    delete d.slots
    return d
  })(),
  (() => {
    const d = minimalValidDocument()
    delete d.elements
    return d
  })(),
  (() => {
    const d = minimalValidDocument()
    delete d.assets
    return d
  })(),
]

describe('design document validator sweep', () => {
  it('should never throw for any adversarial input', () => {
    for (const input of ADVERSARIAL_INPUTS) {
      expect(() => validateDesignDocument(input)).not.toThrow()
      const result = validateDesignDocument(input)
      expect(result.ok === true || result.ok === false).toBe(true)
    }
  })

  it('should keep successful results internally consistent', () => {
    for (const document of constructedDocuments()) {
      const result = validateDesignDocument(document)
      expect(result.ok).toBe(true)
      if (!result.ok) return
      assertSuccessfulInvariants(result.document)
    }
  })

  it('should be idempotent: re-validating a success deep-equals the same document', () => {
    for (const document of constructedDocuments()) {
      const first = validateDesignDocument(document)
      expect(first.ok).toBe(true)
      if (!first.ok) return
      const second = validateDesignDocument(first.document)
      expect(second.ok).toBe(true)
      if (!second.ok) return
      expect(second.document).toEqual(first.document)
    }
  })

  it('should round-trip serialize/parse for constructed documents covering both stocks and all element kinds', () => {
    for (const document of constructedDocuments()) {
      const parsed = parseDesignDocument(serializeDesignDocument(document))
      expect(parsed.ok).toBe(true)
      if (!parsed.ok) return
      expect(parsed.document).toEqual(document)
    }
  })

  it('should pin deliberate codec pairing asymmetry both ways', () => {
    const document = SAMPLE_MITOCHONDRIA_DESIGN
    // Package wrapper has no top-level schemaVersion — bare document parse must fail.
    const asPackage = serializeDesignPackage(document)
    const bareParseOfPackage = parseDesignDocument(asPackage)
    expect(bareParseOfPackage.ok).toBe(false)

    // Package parser accepts a bare document (schemaVersion present).
    const asBare = serializeDesignDocument(document)
    const packageParseOfBare = parseDesignPackage(asBare)
    expect(packageParseOfBare.ok).toBe(true)
    if (packageParseOfBare.ok) {
      expect(packageParseOfBare.document).toEqual(document)
    }
  })

  it('should surface slot/asset/element issues even when stock is also bad', () => {
    const input = minimalValidDocument({
      stock: { kind: 'catalog', stockId: '' },
      elements: [textElement('el-1', { content: { kind: 'slot', slotKey: 'missing' } })],
    })
    const result = validateDesignDocument(input)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.issues.some((i) => i.path.startsWith('stock'))).toBe(true)
      expect(result.issues.some((i) => i.message.includes('unknown slot key'))).toBe(true)
    }
  })

  it('should pin permissive createdAt/updatedAt (any non-empty string, not only ISO)', () => {
    const result = validateDesignDocument(
      minimalValidDocument({ createdAt: 'yesterday', updatedAt: 'not-iso-either' }),
    )
    expect(result.ok).toBe(true)
  })

  it('should pin that dataBase64 is accepted without decoding when shape-valid', () => {
    const result = validateDesignDocument(
      minimalValidDocument({
        assets: [{ id: 'asset-a', mimeType: 'image/png', dataBase64: 'not-real-base64!!!' }],
        elements: [imageElement('el-img', 'asset-a')],
      }),
    )
    expect(result.ok).toBe(true)
  })

  it('should pin that empty static text content is valid', () => {
    const result = validateDesignDocument(
      minimalValidDocument({
        elements: [textElement('el-empty', { content: { kind: 'static', text: '' } })],
      }),
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      const el = result.document.elements[0] as DesignElement
      expect(el.type).toBe('text')
      if (el.type === 'text') {
        expect(el.content).toEqual({ kind: 'static', text: '' })
      }
    }
  })
})
