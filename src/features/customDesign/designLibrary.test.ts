import { describe, expect, it } from 'vitest'
import { SAMPLE_MITOCHONDRIA_DESIGN } from './fixtures/sampleMitochondriaDesign'
import {
  prepareDesignForLibrary,
  touchDesignUpdatedAt,
} from './designLibrary'
import { createMemoryDesignLibrary } from '../../test/memoryDesignLibrary'
import type { DesignDocument } from './designDocument'

describe('createMemoryDesignLibrary (DesignLibrary port)', () => {
  it('should list designs newest-updated first', async () => {
    const older: DesignDocument = {
      ...SAMPLE_MITOCHONDRIA_DESIGN,
      id: 'older',
      updatedAt: '2020-01-01T00:00:00.000Z',
    }
    const newer: DesignDocument = {
      ...SAMPLE_MITOCHONDRIA_DESIGN,
      id: 'newer',
      updatedAt: '2024-06-01T00:00:00.000Z',
    }
    const library = createMemoryDesignLibrary([older, newer])

    const listed = await library.list()
    expect(listed.map((doc) => doc.id)).toEqual(['newer', 'older'])
  })

  it('should get a clone so mutating the result does not change the store', async () => {
    const library = createMemoryDesignLibrary([SAMPLE_MITOCHONDRIA_DESIGN])
    const got = await library.get(SAMPLE_MITOCHONDRIA_DESIGN.id)
    expect(got).not.toBeNull()
    if (!got) return

    expect(got).not.toBe(SAMPLE_MITOCHONDRIA_DESIGN)
    ;(got as { name: string }).name = 'mutated'
    const again = await library.get(SAMPLE_MITOCHONDRIA_DESIGN.id)
    expect(again?.name).toBe(SAMPLE_MITOCHONDRIA_DESIGN.name)
  })

  it('should return null for an unknown id', async () => {
    const library = createMemoryDesignLibrary()
    expect(await library.get('missing')).toBeNull()
  })

  it('should put and remove documents by id', async () => {
    const library = createMemoryDesignLibrary()
    await library.put(SAMPLE_MITOCHONDRIA_DESIGN)
    expect((await library.list()).map((doc) => doc.id)).toEqual([
      SAMPLE_MITOCHONDRIA_DESIGN.id,
    ])

    await library.remove(SAMPLE_MITOCHONDRIA_DESIGN.id)
    expect(await library.list()).toEqual([])
    expect(await library.get(SAMPLE_MITOCHONDRIA_DESIGN.id)).toBeNull()
  })

  it('should store a clone on put so later caller mutations do not leak in', async () => {
    const library = createMemoryDesignLibrary()
    const input = structuredClone(SAMPLE_MITOCHONDRIA_DESIGN) as {
      -readonly [K in keyof DesignDocument]: DesignDocument[K]
    }
    await library.put(input)
    input.name = 'mutated-after-put'
    expect((await library.get(input.id))?.name).toBe(SAMPLE_MITOCHONDRIA_DESIGN.name)
  })
})

describe('prepareDesignForLibrary', () => {
  it('should assign a fresh id, private visibility, and matching timestamps', () => {
    const now = () => new Date('2024-05-01T12:00:00.000Z')
    const prepared = prepareDesignForLibrary(SAMPLE_MITOCHONDRIA_DESIGN, now)

    expect(prepared.id).not.toBe(SAMPLE_MITOCHONDRIA_DESIGN.id)
    expect(prepared.visibility).toBe('private')
    expect(prepared.createdAt).toBe('2024-05-01T12:00:00.000Z')
    expect(prepared.updatedAt).toBe('2024-05-01T12:00:00.000Z')
    expect(prepared.name).toBe(SAMPLE_MITOCHONDRIA_DESIGN.name)
    expect(prepared).not.toBe(SAMPLE_MITOCHONDRIA_DESIGN)
  })
})

describe('touchDesignUpdatedAt', () => {
  it('should update only the updatedAt timestamp', () => {
    const now = () => new Date('2025-01-15T08:30:00.000Z')
    const touched = touchDesignUpdatedAt(SAMPLE_MITOCHONDRIA_DESIGN, now)

    expect(touched.updatedAt).toBe('2025-01-15T08:30:00.000Z')
    expect(touched.id).toBe(SAMPLE_MITOCHONDRIA_DESIGN.id)
    expect(touched.createdAt).toBe(SAMPLE_MITOCHONDRIA_DESIGN.createdAt)
    expect(touched.name).toBe(SAMPLE_MITOCHONDRIA_DESIGN.name)
  })
})
