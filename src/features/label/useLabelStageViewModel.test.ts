import { describe, expect, it, vi } from 'vitest'
import { exportLabelToPng } from './useLabelStageViewModel'
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
        const exportLabel = vi.fn().mockResolvedValue(undefined)
        const element = {} as HTMLDivElement

        const result = await exportLabelToPng(element, printTarget, 'Tirzepatide', exportLabel)

        expect(result).toEqual({ ok: true })
        expect(exportLabel).toHaveBeenCalledWith(element, printTarget, 'Tirzepatide')
    })

    it('should surface a discoverable error when the export function throws', async () => {
        const exportLabel = vi.fn().mockRejectedValue(new Error('boom'))
        const element = {} as HTMLDivElement

        const result = await exportLabelToPng(element, printTarget, undefined, exportLabel)

        expect(result).toEqual({ ok: false, error: 'Couldn’t download the label. Try again.' })
    })
})
