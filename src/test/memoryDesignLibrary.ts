import type { DesignLibrary } from '../shared/ports'
import type { DesignDocument } from '../features/customDesign/designDocument'

/**
 * In-memory {@link DesignLibrary} for unit tests (no IndexedDB).
 * Mirrors {@link createIndexedDbDesignLibrary} / `IndexedDbDesignLibrary`.
 */
export function createMemoryDesignLibrary(
  initial: DesignDocument[] = [],
): DesignLibrary<DesignDocument> {
  const map = new Map<string, DesignDocument>(
    initial.map((doc) => [doc.id, structuredClone(doc)]),
  )
  return {
    async list() {
      return [...map.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    },
    async get(id) {
      const doc = map.get(id)
      return doc ? structuredClone(doc) : null
    },
    async put(document) {
      map.set(document.id, structuredClone(document))
    },
    async remove(id) {
      map.delete(id)
    },
  }
}
