import { useEffect, useRef } from 'react'
import { loadUserAgreementMarkdown } from './loadUserAgreement'
import { renderSimpleMarkdown } from './renderSimpleMarkdown'
import './LandingPage.css'

export interface AgreementModalProps {
    onAcknowledge: () => void
}

export function AgreementModal({ onAcknowledge }: AgreementModalProps) {
    const buttonRef = useRef<HTMLButtonElement>(null)
    const body = renderSimpleMarkdown(loadUserAgreementMarkdown())

    useEffect(() => {
        buttonRef.current?.focus()
    }, [])

    return (
        <div className="agreement-modal-backdrop" role="presentation">
            <div
                className="agreement-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="agreement-modal-title"
            >
                <span className="agreement-modal__badge">Research</span>
                <div className="agreement-modal__body" id="agreement-modal-title">
                    {body}
                </div>
                <div className="agreement-modal__actions">
                    <button
                        ref={buttonRef}
                        type="button"
                        className="agreement-modal__cta"
                        onClick={onAcknowledge}
                    >
                        I understand
                    </button>
                </div>
            </div>
        </div>
    )
}
