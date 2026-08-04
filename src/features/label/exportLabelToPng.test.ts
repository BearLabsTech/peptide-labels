import { describe, expect, it } from 'vitest'
import { exportLabelToPng } from './exportLabelToPng'
import type { PrintTarget } from '../../print/types'

const printTarget: PrintTarget = {
    labelWidthMm: 40,
    labelHeightMm: 20,
    effectiveDpi: 300,
    paddingMm: 2,
    shape: 'rounded',
    cornerRadiusMm: 2,
    vialCapacityMl: 3,
}

describe('exportLabelToPng', () => {
    it('should export via the injected export function and report success', async () => {
        const calls: Array<[HTMLDivElement, PrintTarget, string | undefined]> = []
        const exportLabel = async (
            element: HTMLDivElement,
            target: PrintTarget,
            compoundName?: string,
        ) => {
            calls.push([element, target, compoundName])
        }
        const element = {} as HTMLDivElement

        const result = await exportLabelToPng(element, printTarget, 'Tirzepatide', exportLabel)

        expect(result).toEqual({ ok: true })
        expect(calls).toEqual([[element, printTarget, 'Tirzepatide']])
    })

    it('should surface a discoverable error when the export function throws', async () => {
        const exportLabel = async () => {
            throw new Error('boom')
        }
        const element = {} as HTMLDivElement

        const result = await exportLabelToPng(element, printTarget, undefined, exportLabel)

        expect(result).toEqual({ ok: false, error: 'Couldn’t download the label. Try again.' })
    })
})
