export function VialCapacityWarning({ vialCapacityMl }: { vialCapacityMl: number }) {
    return (
        <p
            role="alert"
            style={{
                margin: '8px 0 12px',
                padding: '9px 11px',
                border: '1px solid #f5c26b',
                borderRadius: 6,
                background: '#fff8e8',
                color: '#7a4b00',
                fontSize: '0.8rem',
                lineHeight: 1.4,
            }}
        >
            Water volume exceeds the selected {vialCapacityMl} ml vial capacity. Your values are unchanged.
        </p>
    )
}
