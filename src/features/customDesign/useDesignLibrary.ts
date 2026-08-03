import { useCallback, useEffect, useMemo, useState } from 'react'
import type { DesignDocument } from './designDocument'
import {
  createIndexedDbDesignLibrary,
  type DesignLibraryStore,
} from './designLibrary'

export interface UseDesignLibraryOptions {
  /** Injectable for tests; defaults to the IndexedDB-backed library. */
  library?: DesignLibraryStore
}

export interface DesignLibraryState {
  readonly library: DesignLibraryStore
  readonly designs: DesignDocument[]
  readonly error: string | null
  readonly isLoading: boolean
  readonly setError: (message: string | null) => void
  readonly refresh: () => Promise<void>
}

/**
 * Thin React wrapper around the {@link DesignLibrary} port.
 * Holds list/loading/error state; CRUD itself lives on the port (already tested via fakes).
 */
export function useDesignLibrary({
  library: libraryProp,
}: UseDesignLibraryOptions = {}): DesignLibraryState {
  const library = useMemo(
    () => libraryProp ?? createIndexedDbDesignLibrary(),
    [libraryProp],
  )
  const [designs, setDesigns] = useState<DesignDocument[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    try {
      setDesigns(await library.list())
      setError(null)
    } catch (err) {
      console.error('Design library load failed', err)
      setError('Couldn’t load your local design library.')
    } finally {
      setIsLoading(false)
    }
  }, [library])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { library, designs, error, isLoading, setError, refresh }
}
