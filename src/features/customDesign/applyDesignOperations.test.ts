import { describe, expect, it, vi } from 'vitest'
import { createMemoryDesignLibrary } from '../../test/memoryDesignLibrary'
import { SAMPLE_MITOCHONDRIA_DESIGN } from './fixtures/sampleMitochondriaDesign'
import { serializeDesignPackage } from './designPackage'
import {
  deriveApplyDesignFlags,
  emptySlotValues,
  exportApplyDesignLabelPng,
  exportDesignFileToDisk,
  formatDesignImportIssues,
  importDesignFile,
  openDesignState,
  refreshLibraryDesigns,
  removeDesignFromLibrary,
  saveDesignToLibrary,
  stockLabelFor,
} from './applyDesignOperations'
import type { DesignDocument } from './designDocument'

function fileFromDocument(document: DesignDocument): File {
  return new File([serializeDesignPackage(document)], 'design.peptide-design', {
    type: 'application/json',
  })
}

describe('emptySlotValues', () => {
  it('should map every slot key to an empty string', () => {
    expect(emptySlotValues(['compoundName', 'protocolAmount'])).toEqual({
      compoundName: '',
      protocolAmount: '',
    })
  })
})

describe('stockLabelFor', () => {
  it('should show the catalog stock id for a catalog-backed design', () => {
    expect(stockLabelFor(SAMPLE_MITOCHONDRIA_DESIGN)).toBe('40x20-rounded')
  })

  it('should show the width and height for a custom-stock design', () => {
    const custom: DesignDocument = {
      ...SAMPLE_MITOCHONDRIA_DESIGN,
      stock: { kind: 'custom', widthMm: 40, heightMm: 30, shape: 'rectangular', cornerRadiusMm: 0, paddingMm: 2 },
    }
    expect(stockLabelFor(custom)).toBe('40 × 30 mm')
  })
})

describe('openDesignState', () => {
  it('should reset slot values, export error, and status message for the newly opened design', () => {
    const state = openDesignState(SAMPLE_MITOCHONDRIA_DESIGN)
    expect(state.design).toBe(SAMPLE_MITOCHONDRIA_DESIGN)
    expect(state.exportError).toBeNull()
    expect(state.statusMessage).toBeNull()
    for (const slot of SAMPLE_MITOCHONDRIA_DESIGN.slots) {
      expect(state.slotValues[slot.key]).toBe('')
    }
  })
})

describe('deriveApplyDesignFlags', () => {
  it('should flag the built-in sample and report library membership from the loaded list', () => {
    const flags = deriveApplyDesignFlags(SAMPLE_MITOCHONDRIA_DESIGN, {}, [])
    expect(flags.isBuiltinSample).toBe(true)
    expect(flags.isInLibrary).toBe(false)
    expect(flags.canExportPng).toBe(false)
  })

  it('should report a design as in-library once it appears in the loaded library list', () => {
    const flags = deriveApplyDesignFlags(SAMPLE_MITOCHONDRIA_DESIGN, {}, [SAMPLE_MITOCHONDRIA_DESIGN])
    expect(flags.isInLibrary).toBe(true)
  })

  it('should only allow export once every required slot is filled', () => {
    const slotValues = Object.fromEntries(
      SAMPLE_MITOCHONDRIA_DESIGN.slots
        .filter((slot) => slot.required)
        .map((slot) => [slot.key, 'value']),
    )
    expect(deriveApplyDesignFlags(SAMPLE_MITOCHONDRIA_DESIGN, slotValues, []).canExportPng).toBe(true)
  })
})

describe('refreshLibraryDesigns', () => {
  it('should load the library listing and clear any prior error', async () => {
    const library = createMemoryDesignLibrary([SAMPLE_MITOCHONDRIA_DESIGN])
    const onLoaded = vi.fn()
    const onError = vi.fn()

    await refreshLibraryDesigns(library, onLoaded, onError)

    expect(onLoaded).toHaveBeenCalledWith([SAMPLE_MITOCHONDRIA_DESIGN])
    expect(onError).toHaveBeenCalledWith(null)
  })

  it('should surface a discoverable error when the library store throws', async () => {
    const library = {
      list: vi.fn().mockRejectedValue(new Error('boom')),
      get: vi.fn(),
      put: vi.fn(),
      remove: vi.fn(),
    }
    const onLoaded = vi.fn()
    const onError = vi.fn()

    await refreshLibraryDesigns(library, onLoaded, onError)

    expect(onLoaded).not.toHaveBeenCalled()
    expect(onError).toHaveBeenCalledWith('Couldn’t load your local design library.')
  })
})

describe('saveDesignToLibrary', () => {
  it('should clone the built-in sample into the library with a fresh id', async () => {
    const library = createMemoryDesignLibrary()
    const result = await saveDesignToLibrary(library, SAMPLE_MITOCHONDRIA_DESIGN, true, false)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.saved.id).not.toBe(SAMPLE_MITOCHONDRIA_DESIGN.id)
      expect(await library.get(result.saved.id)).not.toBeNull()
    }
  })

  it('should update an already-saved design in place rather than cloning it again', async () => {
    const library = createMemoryDesignLibrary([SAMPLE_MITOCHONDRIA_DESIGN])
    const result = await saveDesignToLibrary(library, SAMPLE_MITOCHONDRIA_DESIGN, false, true)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.saved.id).toBe(SAMPLE_MITOCHONDRIA_DESIGN.id)
    }
  })

  it('should surface a discoverable error when the store rejects the save', async () => {
    const library = {
      list: vi.fn(),
      get: vi.fn(),
      put: vi.fn().mockRejectedValue(new Error('boom')),
      remove: vi.fn(),
    }
    const result = await saveDesignToLibrary(library, SAMPLE_MITOCHONDRIA_DESIGN, true, false)
    expect(result).toEqual({ ok: false, error: 'Couldn’t save the design to your local library.' })
  })
})

describe('removeDesignFromLibrary', () => {
  it('should remove the design from the store', async () => {
    const library = createMemoryDesignLibrary([SAMPLE_MITOCHONDRIA_DESIGN])
    const result = await removeDesignFromLibrary(library, SAMPLE_MITOCHONDRIA_DESIGN.id)
    expect(result).toEqual({ ok: true })
    expect(await library.get(SAMPLE_MITOCHONDRIA_DESIGN.id)).toBeNull()
  })

  it('should surface a discoverable error when the store rejects the removal', async () => {
    const library = {
      list: vi.fn(),
      get: vi.fn(),
      put: vi.fn(),
      remove: vi.fn().mockRejectedValue(new Error('boom')),
    }
    const result = await removeDesignFromLibrary(library, 'missing-id')
    expect(result).toEqual({ ok: false, error: 'Couldn’t remove the design.' })
  })
})

describe('formatDesignImportIssues', () => {
  it('should format each issue as path: message, or message alone when path is empty', () => {
    expect(
      formatDesignImportIssues([
        { path: 'schemaVersion', message: 'must be 1' },
        { path: '', message: 'JSON parse failed' },
      ]),
    ).toEqual(['schemaVersion: must be 1', 'JSON parse failed'])
  })
})

describe('importDesignFile', () => {
  it('should import a valid design package and save it to the library with a fresh id', async () => {
    const library = createMemoryDesignLibrary()
    const result = await importDesignFile(library, fileFromDocument(SAMPLE_MITOCHONDRIA_DESIGN))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.imported.id).not.toBe(SAMPLE_MITOCHONDRIA_DESIGN.id)
      expect(await library.get(result.imported.id)).not.toBeNull()
    }
  })

  it('should reject a malformed file and return the validation issues for the UI', async () => {
    const library = createMemoryDesignLibrary()
    const badFile = new File(['not json'], 'bad.peptide-design')
    const result = await importDesignFile(library, badFile)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toBe('That file isn’t a valid peptide design package.')
    expect(result.issues?.some((issue) => issue.message === 'JSON parse failed')).toBe(true)
  })

  it('should reject an invalid design document and surface path-specific issues', async () => {
    const library = createMemoryDesignLibrary()
    const badDoc = {
      format: 'peptide-design',
      formatVersion: 1,
      document: { ...SAMPLE_MITOCHONDRIA_DESIGN, schemaVersion: 99 },
    }
    const badFile = new File([JSON.stringify(badDoc)], 'bad.peptide-design', {
      type: 'application/json',
    })
    const result = await importDesignFile(library, badFile)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.issues?.some((issue) => issue.path === 'schemaVersion')).toBe(true)
    expect(
      formatDesignImportIssues(result.issues ?? []).some((line) =>
        line.startsWith('schemaVersion:'),
      ),
    ).toBe(true)
  })
})

describe('exportDesignFileToDisk', () => {
  it('should download the design package and report success', () => {
    const downloader = { download: vi.fn() }
    const result = exportDesignFileToDisk(SAMPLE_MITOCHONDRIA_DESIGN, downloader)
    expect(result).toEqual({ ok: true })
    expect(downloader.download).toHaveBeenCalledTimes(1)
  })

  it('should surface a discoverable error when the downloader throws', () => {
    const downloader = {
      download: vi.fn(() => {
        throw new Error('boom')
      }),
    }
    const result = exportDesignFileToDisk(SAMPLE_MITOCHONDRIA_DESIGN, downloader)
    expect(result).toEqual({ ok: false, error: 'Couldn’t export the design file.' })
  })
})

describe('exportApplyDesignLabelPng', () => {
  it('should export via the injected export function and report success', async () => {
    const exportLabel = vi.fn().mockResolvedValue(undefined)
    const element = {} as HTMLDivElement
    const printTarget = {
      labelWidthMm: 40,
      labelHeightMm: 20,
      effectiveDpi: 300,
      paddingMm: 2,
      shape: 'rounded' as const,
      cornerRadiusMm: 2,
      vialCapacityMl: 3,
    }

    const result = await exportApplyDesignLabelPng(element, printTarget, 'Tirzepatide', exportLabel)

    expect(result).toEqual({ ok: true })
    expect(exportLabel).toHaveBeenCalledWith(element, printTarget, 'Tirzepatide')
  })

  it('should surface a discoverable error when the export function throws', async () => {
    const exportLabel = vi.fn().mockRejectedValue(new Error('boom'))
    const element = {} as HTMLDivElement
    const printTarget = {
      labelWidthMm: 40,
      labelHeightMm: 20,
      effectiveDpi: 300,
      paddingMm: 2,
      shape: 'rounded' as const,
      cornerRadiusMm: 2,
      vialCapacityMl: 3,
    }

    const result = await exportApplyDesignLabelPng(element, printTarget, 'Tirzepatide', exportLabel)

    expect(result).toEqual({ ok: false, error: 'Couldn’t download the label. Try again.' })
  })
})
