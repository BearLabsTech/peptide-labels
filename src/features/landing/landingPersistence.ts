import { USER_AGREEMENT_VERSION } from '../../content/userAgreementVersion'
import type { KeyValueStore } from '../label/domain/ports'
import { LocalStorageKeyValueStore } from '../../platform/LocalStorageKeyValueStore'

const STORAGE_KEY = 'peptide-labels.user-agreement'
const defaultStore: KeyValueStore = new LocalStorageKeyValueStore()

export interface AgreementAcknowledgment {
    readonly version: number
    readonly acknowledgedAt: string
}

export function readAgreementAcknowledgment(
    store: KeyValueStore = defaultStore,
): AgreementAcknowledgment | null {
    try {
        const raw = store.get(STORAGE_KEY)
        if (!raw) return null
        const parsed = JSON.parse(raw) as Partial<AgreementAcknowledgment>
        if (typeof parsed.version !== 'number' || typeof parsed.acknowledgedAt !== 'string') {
            return null
        }
        return { version: parsed.version, acknowledgedAt: parsed.acknowledgedAt }
    } catch {
        return null
    }
}

export function hasCurrentAgreementAcknowledgment(
    store: KeyValueStore = defaultStore,
): boolean {
    const stored = readAgreementAcknowledgment(store)
    return stored?.version === USER_AGREEMENT_VERSION
}

export function persistAgreementAcknowledgment(
    now: () => Date = () => new Date(),
    store: KeyValueStore = defaultStore,
): AgreementAcknowledgment {
    const record: AgreementAcknowledgment = {
        version: USER_AGREEMENT_VERSION,
        acknowledgedAt: now().toISOString(),
    }
    store.set(STORAGE_KEY, JSON.stringify(record))
    return record
}

export function clearAgreementAcknowledgment(store: KeyValueStore = defaultStore): void {
    store.remove(STORAGE_KEY)
}
