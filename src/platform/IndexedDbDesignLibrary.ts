import type { DesignLibrary } from '../features/label/domain/ports'

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

type DatedDocument = { readonly id: string; readonly updatedAt: string }

/**
 * IndexedDB-backed design library. Documents must carry `id` and `updatedAt`
 * (the sort key used when listing).
 */
export class IndexedDbDesignLibrary<TDocument extends DatedDocument>
  implements DesignLibrary<TDocument>
{
  async list(): Promise<TDocument[]> {
    const db = await openDesignLibraryDb()
    try {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const rows = await idbRequest(store.getAll())
      return (rows as TDocument[]).slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    } finally {
      db.close()
    }
  }

  async get(id: string): Promise<TDocument | null> {
    const db = await openDesignLibraryDb()
    try {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const row = await idbRequest(store.get(id))
      return row ? structuredClone(row as TDocument) : null
    } finally {
      db.close()
    }
  }

  async put(document: TDocument): Promise<void> {
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
  }

  async remove(id: string): Promise<void> {
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
  }
}

export function createIndexedDbDesignLibrary<
  TDocument extends DatedDocument,
>(): DesignLibrary<TDocument> {
  return new IndexedDbDesignLibrary<TDocument>()
}
