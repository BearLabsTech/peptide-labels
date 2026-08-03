import { AgreementModal } from './AgreementModal'
import { WORKSPACE_MODE_LABELS } from '../label/uiStrings'
import './LandingPage.css'

export type LandingEntry = 'calculator' | 'designer' | 'customDesign'

export interface LandingPageProps {
    needsAcknowledgment: boolean
    onAcknowledge: () => void
    onChoose: (entry: LandingEntry) => void
    persistError?: string | null
}

export function LandingPage({
    needsAcknowledgment,
    onAcknowledge,
    onChoose,
    persistError = null,
}: LandingPageProps) {
    return (
        <div className="landing-page">
            <div className="landing-page__content" aria-hidden={needsAcknowledgment || undefined}>
                <p className="landing-page__brand">Peptide Labels</p>
                <h1 className="landing-page__headline">Build vial labels with consistent math</h1>
                <p className="landing-page__lede">
                    Research use only — not medical advice. Choose how you want to start.
                </p>
                <div className="landing-page__ctas">
                    <button
                        type="button"
                        className="btn-primary landing-page__cta"
                        disabled={needsAcknowledgment}
                        onClick={() => onChoose('calculator')}
                    >
                        {WORKSPACE_MODE_LABELS.calculator}
                    </button>
                    <button
                        type="button"
                        className="btn-primary landing-page__cta landing-page__cta--secondary"
                        disabled={needsAcknowledgment}
                        onClick={() => onChoose('designer')}
                    >
                        {WORKSPACE_MODE_LABELS.designer}
                    </button>
                    <button
                        type="button"
                        className="btn-primary landing-page__cta landing-page__cta--secondary"
                        disabled={needsAcknowledgment}
                        onClick={() => onChoose('customDesign')}
                    >
                        {WORKSPACE_MODE_LABELS.customDesign}
                    </button>
                </div>
                {persistError && (
                    <p className="label-export-error" role="alert">
                        {persistError}
                    </p>
                )}
            </div>
            {needsAcknowledgment && <AgreementModal onAcknowledge={onAcknowledge} />}
        </div>
    )
}
