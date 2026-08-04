import { describe, it, expect } from 'vitest'
import { pxToCqw } from './Scaling'

describe('Scaling Utilities', () => {
    // Skip-default 40×20 at 300 DPI → 472 px base width (buildExportSpec / previewBaseWidthPx).
    const baseWidthPx = 472

    it('should convert absolute layout pixels to container query width percentages', () => {
        expect(pxToCqw(32, baseWidthPx)).toBe('6.779661016949152cqw')
        expect(pxToCqw(16, baseWidthPx)).toBe('3.389830508474576cqw')
        expect(pxToCqw(baseWidthPx, baseWidthPx)).toBe('100cqw')
    })
})
