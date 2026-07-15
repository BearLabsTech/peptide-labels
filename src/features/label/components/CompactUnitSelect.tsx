export interface CompactUnitSelectProps {
    label: string
    value: string
    options: readonly string[]
    onChange: (value: string) => void
}

export function CompactUnitSelect({ label, value, options, onChange }: CompactUnitSelectProps) {
    return (
        <label className="compact-unit">
            <span className="visually-hidden">{label}</span>
            <select
                className="compact-unit__select"
                value={value}
                aria-label={label}
                onChange={(e) => onChange(e.target.value)}
            >
                {options.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                ))}
            </select>
        </label>
    )
}
