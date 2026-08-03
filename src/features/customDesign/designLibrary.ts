import type { DesignLibrary } from '../label/domain/ports'
import { createIndexedDbDesignLibrary as createPlatformIndexedDbDesignLibrary } from '../../platform/IndexedDbDesignLibrary'
import { randomId } from '../../platform/randomId'
import type { DesignDocument } from './designDocument'

/** @deprecated Prefer {@link DesignLibrary} — kept as the feature-local alias. */
export type DesignLibraryStore = DesignLibrary<DesignDocument>

/** Browser-backed private design library (design docs include embedded assets). */
export function createIndexedDbDesignLibrary(): DesignLibraryStore {
  return createPlatformIndexedDbDesignLibrary<DesignDocument>()
}

/** In-memory library for unit tests (no IndexedDB). */
export function createMemoryDesignLibrary(
  initial: DesignDocument[] = [],
): DesignLibraryStore {
  const map = new Map<string, DesignDocument>(initial.map((doc) => [doc.id, structuredClone(doc)]))
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

/** Clone a design into the private library with a fresh id and private visibility. */
export function prepareDesignForLibrary(
  document: DesignDocument,
  now: () => Date = () => new Date(),
): DesignDocument {
  const stamp = now().toISOString()
  return {
    ...structuredClone(document),
    id: randomId(now),
    createdAt: stamp,
    updatedAt: stamp,
    visibility: 'private',
  }
}

export function touchDesignUpdatedAt(
  document: DesignDocument,
  now: () => Date = () => new Date(),
): DesignDocument {
  return {
    ...document,
    updatedAt: now().toISOString(),
  }
}
