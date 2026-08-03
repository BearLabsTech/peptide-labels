import type { DesignLibrary } from '../../shared/ports'
import { createIndexedDbDesignLibrary as createPlatformIndexedDbDesignLibrary } from '../../platform/IndexedDbDesignLibrary'
import { randomId } from '../../platform/randomId'
import type { DesignDocument } from './designDocument'

/** Feature-local alias for the shared {@link DesignLibrary} port. */
export type DesignLibraryStore = DesignLibrary<DesignDocument>

/** Browser-backed private design library (design docs include embedded assets). */
export function createIndexedDbDesignLibrary(): DesignLibraryStore {
  return createPlatformIndexedDbDesignLibrary<DesignDocument>()
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
