import { describe, expect, it } from 'vitest'
import {
  PEPTIDE_DESIGN_EXTENSION,
  PEPTIDE_DESIGN_FORMAT,
  createDesignPackage,
  designPackageFilename,
  parseDesignPackage,
  serializeDesignPackage,
} from './designPackage'
import { SAMPLE_MITOCHONDRIA_DESIGN } from './fixtures/sampleMitochondriaDesign'
import { serializeDesignDocument } from './designDocumentCodec'
import {
  createMemoryDesignLibrary,
  prepareDesignForLibrary,
} from './designLibrary'

describe('designPackage', () => {
  it('should round-trip a design through the portable package format with embedded assets', () => {
    const json = serializeDesignPackage(SAMPLE_MITOCHONDRIA_DESIGN)
    const parsed = parseDesignPackage(json)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.document).toEqual(SAMPLE_MITOCHONDRIA_DESIGN)
    expect(parsed.document.assets[0]?.dataBase64.length).toBeGreaterThan(20)
  })

  it('should wrap documents with peptide-design format metadata', () => {
    const pkg = createDesignPackage(SAMPLE_MITOCHONDRIA_DESIGN)
    expect(pkg.format).toBe(PEPTIDE_DESIGN_FORMAT)
    expect(pkg.formatVersion).toBe(1)
    expect(pkg.document.id).toBe(SAMPLE_MITOCHONDRIA_DESIGN.id)
  })

  it('should accept a bare DesignDocument JSON for import flexibility', () => {
    const bare = serializeDesignDocument(SAMPLE_MITOCHONDRIA_DESIGN)
    const parsed = parseDesignPackage(bare)
    expect(parsed.ok).toBe(true)
    if (parsed.ok) {
      expect(parsed.document.name).toBe(SAMPLE_MITOCHONDRIA_DESIGN.name)
    }
  })

  it('should reject an unknown package format version', () => {
    const bad = JSON.stringify({
      format: PEPTIDE_DESIGN_FORMAT,
      formatVersion: 99,
      document: SAMPLE_MITOCHONDRIA_DESIGN,
    })
    const parsed = parseDesignPackage(bad)
    expect(parsed.ok).toBe(false)
  })

  it('should build a safe .peptide-design filename from the design name', () => {
    expect(designPackageFilename(SAMPLE_MITOCHONDRIA_DESIGN)).toBe(
      `mitochondria-sample${PEPTIDE_DESIGN_EXTENSION}`,
    )
  })
})

describe('designLibrary memory store', () => {
  it('should save, list, get, and remove private designs', async () => {
    const library = createMemoryDesignLibrary()
    const saved = prepareDesignForLibrary(SAMPLE_MITOCHONDRIA_DESIGN, () => new Date('2026-07-19T18:00:00.000Z'))
    expect(saved.id).not.toBe(SAMPLE_MITOCHONDRIA_DESIGN.id)
    expect(saved.visibility).toBe('private')

    await library.put(saved)
    const listed = await library.list()
    expect(listed).toHaveLength(1)
    expect(listed[0]?.id).toBe(saved.id)

    const loaded = await library.get(saved.id)
    expect(loaded?.assets).toEqual(saved.assets)

    await library.remove(saved.id)
    expect(await library.list()).toHaveLength(0)
  })
})
