import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { USER_AGREEMENT_VERSION } from '../../content/userAgreementVersion'
import {
    clearAgreementAcknowledgment,
    hasCurrentAgreementAcknowledgment,
    persistAgreementAcknowledgment,
    readAgreementAcknowledgment,
} from './landingPersistence'
import { installMemoryLocalStorage } from '../../test/memoryLocalStorage'

describe('landingPersistence', () => {
    beforeEach(() => {
        installMemoryLocalStorage()
    })

    afterEach(() => {
        clearAgreementAcknowledgment()
    })

    it('should report missing acknowledgment when nothing is stored', () => {
        expect(hasCurrentAgreementAcknowledgment()).toBe(false)
        expect(readAgreementAcknowledgment()).toBeNull()
    })

    it('should treat the current version as acknowledged after persist', () => {
        const fixed = new Date('2026-07-14T12:00:00.000Z')
        const record = persistAgreementAcknowledgment(() => fixed)
        expect(record.version).toBe(USER_AGREEMENT_VERSION)
        expect(record.acknowledgedAt).toBe(fixed.toISOString())
        expect(hasCurrentAgreementAcknowledgment()).toBe(true)
    })

    it('should require acknowledgment again when the stored version is stale', () => {
        localStorage.setItem(
            'peptide-labels.user-agreement',
            JSON.stringify({ version: USER_AGREEMENT_VERSION - 1, acknowledgedAt: '2020-01-01T00:00:00.000Z' }),
        )
        expect(hasCurrentAgreementAcknowledgment()).toBe(false)
    })

    it('should reject malformed and incomplete stored records', () => {
        localStorage.setItem('peptide-labels.user-agreement', '{invalid')
        expect(readAgreementAcknowledgment()).toBeNull()

        localStorage.setItem(
            'peptide-labels.user-agreement',
            JSON.stringify({ version: USER_AGREEMENT_VERSION }),
        )
        expect(readAgreementAcknowledgment()).toBeNull()
    })

    it('should remain safe when browser storage is unavailable', () => {
        delete (globalThis as { localStorage?: Storage }).localStorage
        expect(readAgreementAcknowledgment()).toBeNull()
        expect(persistAgreementAcknowledgment(() => new Date('2026-07-14T12:00:00.000Z'))).toEqual({
            version: USER_AGREEMENT_VERSION,
            acknowledgedAt: '2026-07-14T12:00:00.000Z',
        })
        expect(() => clearAgreementAcknowledgment()).not.toThrow()
    })

    it('should tolerate storage write and removal failures', () => {
        localStorage.setItem = () => {
            throw new Error('blocked')
        }
        expect(() => persistAgreementAcknowledgment()).not.toThrow()

        installMemoryLocalStorage()
        localStorage.removeItem = () => {
            throw new Error('blocked')
        }
        expect(() => clearAgreementAcknowledgment()).not.toThrow()
    })
})
