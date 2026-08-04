import { USER_AGREEMENT_VERSION } from '../../content/userAgreementVersion'
import type { KeyValueStore } from '../../shared/ports'
import { LocalStorageKeyValueStore } from '../../platform/LocalStorageKeyValueStore'
import { err, ok, type Result } from '../../shared/result'

const STORAGE_KEY = 'peptide-labels.user-agreement'
const defaultStore: KeyValueStore = new LocalStorageKeyValueStore()

export const AGREEMENT_SAVE_FAILED_MESSAGE = 'Settings could not be saved.'

export interface AgreementAcknowledgment {
    readonly version: number
    readonly acknowledgedAt: string
}

export type ReadAgreementAcknowledgmentResult =
    | { kind: 'absent' }
    | { kind: 'ok'; value: AgreementAcknowledgment }
    | { kind: 'corrupt' }
    | { kind: 'unavailable' }

export function readAgreementAcknowledgmentDetailed(
    store: KeyValueStore = defaultStore,
): ReadAgreementAcknowledgmentResult {
    const read = store.get(STORAGE_KEY)
    if (read.kind === 'absent') return { kind: 'absent' }
    if (read.kind === 'unavailable') return { kind: 'unavailable' }

    try {
        const parsed = JSON.parse(read.value) as Partial<AgreementAcknowledgment>
        if (typeof parsed.version !== 'number' || typeof parsed.acknowledgedAt !== 'string') {
            return { kind: 'corrupt' }
        }
        return { kind: 'ok', value: { version: parsed.version, acknowledgedAt: parsed.acknowledgedAt } }
    } catch (error) {
        console.error('Agreement acknowledgment read failed', error)
        return { kind: 'corrupt' }
    }
}

export function readAgreementAcknowledgment(
    store: KeyValueStore = defaultStore,
): AgreementAcknowledgment | null {
    const result = readAgreementAcknowledgmentDetailed(store)
    return result.kind === 'ok' ? result.value : null
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
): Result<AgreementAcknowledgment, string> {
    const record: AgreementAcknowledgment = {
        version: USER_AGREEMENT_VERSION,
        acknowledgedAt: now().toISOString(),
    }
    const write = store.set(STORAGE_KEY, JSON.stringify(record))
    if (!write.ok) {
        return err(AGREEMENT_SAVE_FAILED_MESSAGE)
    }
    return ok(record)
}

export function clearAgreementAcknowledgment(store: KeyValueStore = defaultStore): void {
    store.remove(STORAGE_KEY)
}
