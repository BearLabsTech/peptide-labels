import type { ReactNode } from 'react'
import { isPresetSelected } from '../calculatorPresets'

export interface ChipSelectProps {
    label: string
    value: string
    presets: readonly string[]
    onChange: (value: string) => void
    /** Shown on chips only (e.g. " mg", " units"). */
    chipSuffix?: string
    placeholder?: string
    disabled?: boolean
    /** Compact trailing control (e.g. unit select). */
    trailing?: ReactNode
}

export function ChipSelect({
    label,
    value,
    presets,
    onChange,
    chipSuffix = '',
    placeholder = 'Custom',
    disabled,
    trailing,
}: ChipSelectProps) {
    const numeric = value.match(/[\d.]+/)?.[0] ?? ''

    return (
        <div className={`chip-row${disabled ? ' chip-row--disabled' : ''}`}>
            <div className="chip-row__label">{label}</div>
            <div className="chip-row__controls">
                <div className="chip-row__chips" role="group" aria-label={label}>
                    {presets.map((preset) => {
                        const selected = isPresetSelected(value, preset)
                        return (
                            <button
                                key={preset}
                                type="button"
                                disabled={disabled}
                                className={selected ? 'chip-row__chip chip-row__chip--active' : 'chip-row__chip'}
                                aria-pressed={selected}
                                onClick={() => onChange(preset)}
                            >
                                {preset}{chipSuffix}
                            </button>
                        )
                    })}
                </div>
                <input
                    className="chip-row__custom"
                    type="text"
                    inputMode="decimal"
                    disabled={disabled}
                    placeholder={placeholder}
                    value={numeric}
                    aria-label={`${label} custom value`}
                    onChange={(e) => onChange(e.target.value)}
                />
                {trailing ? <div className="chip-row__trailing">{trailing}</div> : null}
            </div>
        </div>
    )
}
