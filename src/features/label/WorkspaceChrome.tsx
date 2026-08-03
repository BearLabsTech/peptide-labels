import type { ReactNode } from 'react'
import { WORKSPACE_MODE_LABELS } from './uiStrings'
import './CalculatorView.css'

export type WorkspaceMode = 'calculator' | 'designer' | 'customDesign'

export interface WorkspaceChromeProps {
    mode: WorkspaceMode
    onModeChange: (mode: WorkspaceMode) => void
    children: ReactNode
}

export function WorkspaceChrome({ mode, onModeChange, children }: WorkspaceChromeProps) {
    return (
        <div className="workspace-shell">
            <header className="workspace-header">
                <div className="workspace-header__brand">Peptide Labels</div>
                <div className="mode-segment" role="group" aria-label="App mode">
                    <button
                        type="button"
                        className={mode === 'calculator' ? 'mode-segment__btn mode-segment__btn--active' : 'mode-segment__btn'}
                        aria-pressed={mode === 'calculator'}
                        onClick={() => onModeChange('calculator')}
                    >
                        {WORKSPACE_MODE_LABELS.calculator}
                    </button>
                    <button
                        type="button"
                        className={mode === 'designer' ? 'mode-segment__btn mode-segment__btn--active' : 'mode-segment__btn'}
                        aria-pressed={mode === 'designer'}
                        onClick={() => onModeChange('designer')}
                    >
                        {WORKSPACE_MODE_LABELS.designer}
                    </button>
                    <button
                        type="button"
                        className={mode === 'customDesign' ? 'mode-segment__btn mode-segment__btn--active' : 'mode-segment__btn'}
                        aria-pressed={mode === 'customDesign'}
                        onClick={() => onModeChange('customDesign')}
                    >
                        {WORKSPACE_MODE_LABELS.customDesign}
                    </button>
                </div>
            </header>
            <div className="workspace-body">{children}</div>
        </div>
    )
}
