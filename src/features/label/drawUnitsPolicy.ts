export const DRAW_UNIT_QUICK_PICKS = [
    5, 10, 15, 20, 25, 30, 35, 40, 45, 50,
    60, 70, 80, 90, 100,
] as const

export function nextDrawUnitQuickPick(minimum: number): number | null {
    return DRAW_UNIT_QUICK_PICKS.find((units) => units >= minimum) ?? null
}

export function previousDrawUnitQuickPick(maximum: number): number | null {
    for (let index = DRAW_UNIT_QUICK_PICKS.length - 1; index >= 0; index -= 1) {
        const units = DRAW_UNIT_QUICK_PICKS[index]
        if (units <= maximum) return units
    }
    return null
}
