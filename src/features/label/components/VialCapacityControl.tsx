import { useState } from 'react'
import {
    MIN_VIAL_CAPACITY_ML,
    VIAL_CAPACITY_PRESETS_ML,
    type VialCapacityMl,
} from '../vialCapacity'

export interface VialCapacityControlProps {
    value: VialCapacityMl
    onChange: (value: VialCapacityMl) => void
}

export function VialCapacityControl({ value, onChange }: VialCapacityControlProps) {
    const [draft, setDraft] = useState(String(value))

    const invalid = draft !== '' && (!(Number(draft) >= MIN_VIAL_CAPACITY_ML) || !Number.isFinite(Number(draft)))

    return (
        <div className="chip-row__controls">
            <div className="chip-row__chips" role="group" aria-label="Vial capacity">
                {VIAL_CAPACITY_PRESETS_ML.map((capacity) => {
                    const selected = value === capacity
                    return (
                        <button
                            key={capacity}
                            type="button"
                            className={selected ? 'chip-row__chip chip-row__chip--active' : 'chip-row__chip'}
                            aria-pressed={selected}
                            onClick={() => {
                                setDraft(String(capacity))
                                onChange(capacity)
                            }}
                        >
                            {capacity} ml
                        </button>
                    )
                })}
            </div>
            <input
                aria-label="Vial capacity custom value"
                className="chip-row__custom"
                type="text"
                inputMode="decimal"
                placeholder="Custom"
                value={draft}
                onChange={(event) => {
                    const next = event.target.value
                    setDraft(next)
                    const parsed = Number(next)
                    if (Number.isFinite(parsed) && parsed >= MIN_VIAL_CAPACITY_ML) {
                        onChange(parsed)
                    }
                }}
            />
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>ml</span>
            {invalid && (
                <div role="alert" style={{ flexBasis: '100%', color: '#b42318', fontSize: '0.75rem' }}>
                    Vial capacity must be at least 1 ml.
                </div>
            )}
        </div>
    )
}
