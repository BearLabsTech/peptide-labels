import { parseNumericField } from '../peptideMath'
import { DrawUnitsSyringe } from './DrawUnitsSyringe'
import { SyringeCapacityControl } from './SyringeCapacityControl'
import {
    isDrawOverSyringeCapacity,
    syringeMaxUnits,
    type SyringeCapacityMl,
} from './syringeCapacity'
import './SyringeAssist.css'

export interface SyringeAssistProps {
    capacityMl: SyringeCapacityMl
    onCapacityChange: (next: SyringeCapacityMl) => void
    drawUnitsLabel?: string
}

export function SyringeAssist({
    capacityMl,
    onCapacityChange,
    drawUnitsLabel,
}: SyringeAssistProps) {
    const drawUnits = parseNumericField(drawUnitsLabel)
    const hasDraw = drawUnits > 0
    const over = hasDraw && isDrawOverSyringeCapacity(drawUnits, capacityMl)

    return (
        <div className="syringe-assist">
            <SyringeCapacityControl value={capacityMl} onChange={onCapacityChange} />
            <DrawUnitsSyringe
                drawUnits={hasDraw ? drawUnits : null}
                capacityMl={capacityMl}
            />
            {over && (
                <p className="syringe-assist__warn" role="status">
                    Draw volume ({drawUnits} units) is above this {syringeMaxUnits(capacityMl)}-unit
                    syringe. Pick a larger syringe if needed — the number was not changed.
                </p>
            )}
        </div>
    )
}
