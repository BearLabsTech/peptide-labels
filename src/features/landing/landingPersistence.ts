import { USER_AGREEMENT_VERSION } from '../../content/userAgreementVersion'

const STORAGE_KEY = 'peptide-labels.user-agreement'

export interface AgreementAcknowledgment {
    readonly version: number
    readonly acknowledgedAt: string
}

export function readAgreementAcknowledgment(): AgreementAcknowledgment | null {
    if (typeof localStorage === 'undefined') return null
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
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

export function hasCurrentAgreementAcknowledgment(): boolean {
    const stored = readAgreementAcknowledgment()
    return stored?.version === USER_AGREEMENT_VERSION
}

export function persistAgreementAcknowledgment(
    now: () => Date = () => new Date(),
): AgreementAcknowledgment {
    const record: AgreementAcknowledgment = {
        version: USER_AGREEMENT_VERSION,
        acknowledgedAt: now().toISOString(),
    }
    if (typeof localStorage !== 'undefined') {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(record))
        } catch {
            // Acknowledgment still applies to the current session.
        }
    }
    return record
}

export function clearAgreementAcknowledgment(): void {
    if (typeof localStorage !== 'undefined') {
        try {
            localStorage.removeItem(STORAGE_KEY)
        } catch {
            // Clearing storage is best-effort in restricted contexts.
        }
    }
}
