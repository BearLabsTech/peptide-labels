import { AgreementModal } from './AgreementModal'
import './LandingPage.css'

export type LandingEntry = 'calculator' | 'designer'

export interface LandingPageProps {
    needsAcknowledgment: boolean
    onAcknowledge: () => void
    onChoose: (entry: LandingEntry) => void
}

export function LandingPage({ needsAcknowledgment, onAcknowledge, onChoose }: LandingPageProps) {
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
                        Calculator
                    </button>
                    <button
                        type="button"
                        className="btn-primary landing-page__cta landing-page__cta--secondary"
                        disabled={needsAcknowledgment}
                        onClick={() => onChoose('designer')}
                    >
                        Label designer
                    </button>
                </div>
            </div>
            {needsAcknowledgment && <AgreementModal onAcknowledge={onAcknowledge} />}
        </div>
    )
}
