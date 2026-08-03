import { describe, expect, it } from 'vitest'
import type { DesignDocumentValidationIssue } from '../validationPrimitives'
import { validateElementBase, validateFrame, validateTextOrQrContent } from './elementValidator'

describe('validateFrame', () => {
  it('should accept a frame with positive finite dimensions', () => {
    const issues: DesignDocumentValidationIssue[] = []
    const ok = validateFrame({ xMm: 0, yMm: 0, widthMm: 10, heightMm: 5 }, 'frame', issues)
    expect(ok).toBe(true)
    expect(issues).toHaveLength(0)
  })

  it('should reject a non-object frame', () => {
    const issues: DesignDocumentValidationIssue[] = []
    const ok = validateFrame('not-a-frame', 'frame', issues)
    expect(ok).toBe(false)
    expect(issues[0]?.message).toBe('must be an object')
  })

  it('should reject a frame with a non-finite coordinate', () => {
    const issues: DesignDocumentValidationIssue[] = []
    const ok = validateFrame({ xMm: NaN, yMm: 0, widthMm: 10, heightMm: 5 }, 'frame', issues)
    expect(ok).toBe(false)
    expect(issues.some((issue) => issue.path === 'frame.xMm')).toBe(true)
  })

  it('should reject a frame with a non-positive width', () => {
    const issues: DesignDocumentValidationIssue[] = []
    const ok = validateFrame({ xMm: 0, yMm: 0, widthMm: 0, heightMm: 5 }, 'frame', issues)
    expect(ok).toBe(false)
    expect(issues.some((issue) => issue.path === 'frame.widthMm')).toBe(true)
  })

  it('should reject a frame with a non-positive height', () => {
    const issues: DesignDocumentValidationIssue[] = []
    const ok = validateFrame({ xMm: 0, yMm: 0, widthMm: 5, heightMm: -1 }, 'frame', issues)
    expect(ok).toBe(false)
    expect(issues.some((issue) => issue.path === 'frame.heightMm')).toBe(true)
  })
})

describe('validateElementBase', () => {
  const validBase = {
    id: 'el-1',
    frame: { xMm: 0, yMm: 0, widthMm: 10, heightMm: 5 },
    rotationDeg: 90,
    zIndex: 2,
  }

  it('should build the shared base fields from valid input', () => {
    const issues: DesignDocumentValidationIssue[] = []
    const base = validateElementBase(validBase, 'elements[0]', issues)
    expect(base).toEqual(validBase)
    expect(issues).toHaveLength(0)
  })

  it('should reject a missing or empty id', () => {
    const issues: DesignDocumentValidationIssue[] = []
    const base = validateElementBase({ ...validBase, id: '' }, 'elements[0]', issues)
    expect(base).toBeNull()
    expect(issues.some((issue) => issue.path === 'elements[0].id')).toBe(true)
  })

  it('should reject an invalid frame', () => {
    const issues: DesignDocumentValidationIssue[] = []
    const base = validateElementBase({ ...validBase, frame: 'nope' }, 'elements[0]', issues)
    expect(base).toBeNull()
  })

  it('should reject a non-finite rotationDeg', () => {
    const issues: DesignDocumentValidationIssue[] = []
    const base = validateElementBase({ ...validBase, rotationDeg: 'ninety' }, 'elements[0]', issues)
    expect(base).toBeNull()
    expect(issues.some((issue) => issue.path === 'elements[0].rotationDeg')).toBe(true)
  })

  it('should reject a non-finite zIndex', () => {
    const issues: DesignDocumentValidationIssue[] = []
    const base = validateElementBase({ ...validBase, zIndex: undefined }, 'elements[0]', issues)
    expect(base).toBeNull()
    expect(issues.some((issue) => issue.path === 'elements[0].zIndex')).toBe(true)
  })
})

describe('validateTextOrQrContent', () => {
  const slotKeys = new Set(['compoundName'])

  it('should accept static content with a string body', () => {
    const issues: DesignDocumentValidationIssue[] = []
    const ok = validateTextOrQrContent({ kind: 'static', text: 'hello' }, 'content', issues, slotKeys)
    expect(ok).toBe(true)
  })

  it('should reject static content whose text is not a string', () => {
    const issues: DesignDocumentValidationIssue[] = []
    const ok = validateTextOrQrContent({ kind: 'static', text: 42 }, 'content', issues, slotKeys)
    expect(ok).toBe(false)
  })

  it('should reject slot content referencing an empty slot key', () => {
    const issues: DesignDocumentValidationIssue[] = []
    const ok = validateTextOrQrContent({ kind: 'slot', slotKey: '' }, 'content', issues, slotKeys)
    expect(ok).toBe(false)
    expect(issues[0]?.message).toBe('must be a non-empty string')
  })

  it('should reject an unrecognized content kind', () => {
    const issues: DesignDocumentValidationIssue[] = []
    const ok = validateTextOrQrContent({ kind: 'weird' }, 'content', issues, slotKeys)
    expect(ok).toBe(false)
    expect(issues[0]?.message).toBe('must be static or slot')
  })

  it('should reject non-object content', () => {
    const issues: DesignDocumentValidationIssue[] = []
    const ok = validateTextOrQrContent(null, 'content', issues, slotKeys)
    expect(ok).toBe(false)
  })
})
