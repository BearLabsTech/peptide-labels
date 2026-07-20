import type { DesignDocument } from './designDocument'

export interface DesignLibraryStore {
  list(): Promise<DesignDocument[]>
  get(id: string): Promise<DesignDocument | null>
  put(document: DesignDocument): Promise<void>
  remove(id: string): Promise<void>
}

const DB_NAME = 'peptide-labels-designs'
const DB_VERSION = 1
const STORE_NAME = 'designs'

function openDesignLibraryDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is unavailable'))
      return
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error ?? new Error('Failed to open design library'))
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
  })
}

function idbRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'))
  })
}

/** Browser-backed private design library (design docs include embedded assets). */
export function createIndexedDbDesignLibrary(): DesignLibraryStore {
  return {
    async list() {
      const db = await openDesignLibraryDb()
      try {
        const tx = db.transaction(STORE_NAME, 'readonly')
        const store = tx.objectStore(STORE_NAME)
        const rows = await idbRequest(store.getAll())
        return (rows as DesignDocument[]).slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      } finally {
        db.close()
      }
    },

    async get(id) {
      const db = await openDesignLibraryDb()
      try {
        const tx = db.transaction(STORE_NAME, 'readonly')
        const store = tx.objectStore(STORE_NAME)
        const row = await idbRequest(store.get(id))
        return (row as DesignDocument | undefined) ?? null
      } finally {
        db.close()
      }
    },

    async put(document) {
      const db = await openDesignLibraryDb()
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)
        await idbRequest(store.put(document))
        await new Promise<void>((resolve, reject) => {
          tx.oncomplete = () => resolve()
          tx.onerror = () => reject(tx.error ?? new Error('Failed to save design'))
          tx.onabort = () => reject(tx.error ?? new Error('Save aborted'))
        })
      } finally {
        db.close()
      }
    },

    async remove(id) {
      const db = await openDesignLibraryDb()
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)
        await idbRequest(store.delete(id))
        await new Promise<void>((resolve, reject) => {
          tx.oncomplete = () => resolve()
          tx.onerror = () => reject(tx.error ?? new Error('Failed to remove design'))
          tx.onabort = () => reject(tx.error ?? new Error('Remove aborted'))
        })
      } finally {
        db.close()
      }
    },
  }
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
    id: typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `design-${stamp}`,
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
