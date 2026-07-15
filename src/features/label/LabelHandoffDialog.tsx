import './CalculatorView.css'

export interface LabelHandoffDialogProps {
    onConfirm: () => void
    onCancel: () => void
}

export function LabelHandoffDialog({ onConfirm, onCancel }: LabelHandoffDialogProps) {
    return (
        <div className="handoff-backdrop" role="presentation">
            <div className="handoff-dialog" role="dialog" aria-modal="true" aria-labelledby="handoff-title">
                <h2 id="handoff-title">Turn this into a label?</h2>
                <p>Open the label designer with these values?</p>
                <div className="handoff-dialog__actions">
                    <button type="button" className="btn-secondary-inline" onClick={onCancel}>
                        Keep calculating
                    </button>
                    <button type="button" className="btn-primary" onClick={onConfirm}>
                        Yes, make a label
                    </button>
                </div>
            </div>
        </div>
    )
}
