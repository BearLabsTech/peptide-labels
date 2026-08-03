import { useCallback, useState } from 'react'
import {
  hasCurrentAgreementAcknowledgment,
  persistAgreementAcknowledgment,
} from './landingPersistence'

export interface AgreementGateState {
  readonly needsAcknowledgment: boolean
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

  const acknowledge = useCallback(() => {
    persistAgreementAcknowledgment()
    setNeedsAcknowledgment(false)
  }, [])

  return { needsAcknowledgment, acknowledge }
}
