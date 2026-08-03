import { useRef } from 'react'
import { loadUserAgreementMarkdown } from './loadUserAgreement'
import { renderSimpleMarkdown } from './renderSimpleMarkdown'
import { useDialogAccessibility } from '../label/useDialogAccessibility'
import './LandingPage.css'

export interface AgreementModalProps {
    onAcknowledge: () => void
}

export function AgreementModal({ onAcknowledge }: AgreementModalProps) {
    const buttonRef = useRef<HTMLButtonElement>(null)
    const dialogRef = useDialogAccessibility({ initialFocusRef: buttonRef })
    const body = renderSimpleMarkdown(loadUserAgreementMarkdown())

    return (
        <div className="agreement-modal-backdrop" role="presentation">
            <div
                ref={dialogRef}
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
