import {
    SYRINGE_CAPACITY_OPTIONS_ML,
    type SyringeCapacityMl,
} from './syringeCapacity'

export interface SyringeCapacityControlProps {
    value: SyringeCapacityMl
    onChange: (next: SyringeCapacityMl) => void
}

export function SyringeCapacityControl({ value, onChange }: SyringeCapacityControlProps) {
    return (
        <div className="syringe-capacity-control" role="group" aria-label="Syringe capacity">
            <span className="syringe-capacity-control__label">Syringe</span>
            <div className="syringe-capacity-control__options">
                {SYRINGE_CAPACITY_OPTIONS_ML.map((ml) => {
                    const selected = value === ml
                    return (
                        <button
                            key={ml}
                            type="button"
                            className={
                                selected
                                    ? 'syringe-capacity-control__btn syringe-capacity-control__btn--active'
                                    : 'syringe-capacity-control__btn'
                            }
                            aria-pressed={selected}
                            onClick={() => onChange(ml)}
                        >
                            {ml.toFixed(1)} ml
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
