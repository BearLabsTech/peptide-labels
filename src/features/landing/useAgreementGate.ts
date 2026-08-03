import { useCallback, useState } from 'react'
import {
  AGREEMENT_SAVE_FAILED_MESSAGE,
  hasCurrentAgreementAcknowledgment,
  persistAgreementAcknowledgment,
} from './landingPersistence'

export interface AgreementGateState {
  readonly needsAcknowledgment: boolean
  readonly persistError: string | null
  readonly acknowledge: () => void
}

/**
 * Thin React wrapper around agreement persistence.
 * Holds only the gate flag; read/write logic is already tested in landingPersistence.
 */
export function useAgreementGate(): AgreementGateState {
  const [needsAcknowledgment, setNeedsAcknowledgment] = useState(
    () => !hasCurrentAgreementAcknowledgment(),
  )
  const [persistError, setPersistError] = useState<string | null>(null)

  const acknowledge = useCallback(() => {
    const result = persistAgreementAcknowledgment()
    if (!result.ok) {
      setPersistError(result.error || AGREEMENT_SAVE_FAILED_MESSAGE)
      return
    }
    setPersistError(null)
    setNeedsAcknowledgment(false)
  }, [])

  return { needsAcknowledgment, persistError, acknowledge }
}
