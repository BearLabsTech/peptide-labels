import { syringeMaxUnits, type SyringeCapacityMl } from './syringeCapacity'
import './DrawUnitsSyringe.css'

export interface DrawUnitsSyringeProps {
    drawUnits: number | null
    capacityMl: SyringeCapacityMl
}

const BARREL_X = 36
const BARREL_Y = 28
const BARREL_W = 280
const BARREL_H = 36

export function DrawUnitsSyringe({ drawUnits, capacityMl }: DrawUnitsSyringeProps) {
    const maxUnits = syringeMaxUnits(capacityMl)
    const clamped = drawUnits == null || !(drawUnits > 0)
        ? 0
        : Math.min(drawUnits, maxUnits)
    const fillRatio = clamped / maxUnits
    const fillWidth = BARREL_W * fillRatio
    const tickStep = maxUnits <= 30 ? 5 : 10
    const ticks: number[] = []
    for (let u = 0; u <= maxUnits; u += tickStep) ticks.push(u)

    return (
        <svg
            className="draw-units-syringe"
            viewBox="0 0 360 90"
            role="img"
            aria-label={
                drawUnits != null && drawUnits > 0
                    ? `Syringe scale showing ${drawUnits} units on a ${maxUnits}-unit syringe`
                    : `Empty ${maxUnits}-unit syringe scale`
            }
        >
            {/* Needle hub */}
            <rect x="12" y="38" width="24" height="16" rx="2" className="draw-units-syringe__plunger" />
            <line x1="4" y1="46" x2="12" y2="46" className="draw-units-syringe__stroke" />

            {/* Barrel */}
            <rect
                x={BARREL_X}
                y={BARREL_Y}
                width={BARREL_W}
                height={BARREL_H}
                rx="4"
                className="draw-units-syringe__barrel"
            />
            {fillWidth > 0 && (
                <rect
                    x={BARREL_X}
                    y={BARREL_Y}
                    width={fillWidth}
                    height={BARREL_H}
                    rx="4"
                    className="draw-units-syringe__fill"
                />
            )}
            {fillWidth > 0 && (
                <line
                    x1={BARREL_X + fillWidth}
                    y1={BARREL_Y - 4}
                    x2={BARREL_X + fillWidth}
                    y2={BARREL_Y + BARREL_H + 4}
                    className="draw-units-syringe__marker"
                />
            )}

            {/* Plunger */}
            <rect
                x={BARREL_X + BARREL_W}
                y={BARREL_Y + 8}
                width="28"
                height={BARREL_H - 16}
                className="draw-units-syringe__plunger"
            />
            <rect
                x={BARREL_X + BARREL_W + 28}
                y={BARREL_Y + 2}
                width="8"
                height={BARREL_H - 4}
                rx="2"
                className="draw-units-syringe__plunger"
            />

            {ticks.map((u) => {
                const x = BARREL_X + (u / maxUnits) * BARREL_W
                return (
                    <g key={u}>
                        <line
                            x1={x}
                            y1={BARREL_Y + BARREL_H}
                            x2={x}
                            y2={BARREL_Y + BARREL_H + 8}
                            className="draw-units-syringe__tick"
                        />
                        <text
                            x={x}
                            y={BARREL_Y + BARREL_H + 20}
                            textAnchor="middle"
                            className="draw-units-syringe__label"
                        >
                            {u}
                        </text>
                    </g>
                )
            })}
        </svg>
    )
}
