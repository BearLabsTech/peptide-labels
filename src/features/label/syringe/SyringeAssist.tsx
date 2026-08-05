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
    syringeCapacityMl: SyringeCapacityMl
    onCapacityChange: (next: SyringeCapacityMl) => void
    drawUnitsLabel?: string
}

export function SyringeAssist({
    syringeCapacityMl,
    onCapacityChange,
    drawUnitsLabel,
}: SyringeAssistProps) {
    const drawUnits = parseNumericField(drawUnitsLabel)
    const hasDraw = drawUnits != null && drawUnits > 0
    const over = hasDraw && isDrawOverSyringeCapacity(drawUnits, syringeCapacityMl)

    return (
        <div className="syringe-assist">
            <SyringeCapacityControl value={syringeCapacityMl} onChange={onCapacityChange} />
            <DrawUnitsSyringe
                drawUnits={hasDraw ? drawUnits : null}
                syringeCapacityMl={syringeCapacityMl}
            />
            {over && (
                <p className="syringe-assist__warn" role="status">
                    Draw volume ({drawUnits} units) is above this {syringeMaxUnits(syringeCapacityMl)}-unit
                    syringe. Pick a larger syringe if needed — the number was not changed.
                </p>
            )}
        </div>
    )
}
