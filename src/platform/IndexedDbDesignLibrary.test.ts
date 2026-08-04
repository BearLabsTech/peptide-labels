import { describe, expect, it } from 'vitest'
import { selectListableDocuments } from './IndexedDbDesignLibrary'

describe('selectListableDocuments', () => {
  it('should return valid rows newest-first when one row is malformed', () => {
    const skipped: string[] = []
    const listed = selectListableDocuments(
      [
        { id: 'older', updatedAt: '2020-01-01T00:00:00.000Z', name: 'Older' },
        { id: 'broken' }, // missing updatedAt — previously threw and killed the whole list
        { id: 'newer', updatedAt: '2024-06-01T00:00:00.000Z', name: 'Newer' },
        null,
        { id: 'blank-date', updatedAt: '   ' },
      ],
      (detail) => {
        skipped.push(detail)
      },
    )

    expect(listed.map((doc) => doc.id)).toEqual(['newer', 'older'])
    expect(skipped).toHaveLength(3)
  })

  it('should clone listed rows so mutating the result does not touch the source', () => {
    const source = { id: 'a', updatedAt: '2024-01-01T00:00:00.000Z', name: 'Original' }
    const listed = selectListableDocuments<{ id: string; updatedAt: string; name: string }>(
      [source],
      () => {},
    )
    expect(listed).toHaveLength(1)
    listed[0]!.name = 'Mutated'
    expect(source.name).toBe('Original')
  })
})
