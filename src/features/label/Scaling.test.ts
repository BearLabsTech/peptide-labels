import { describe, it, expect } from 'vitest'
import { pxToCqw } from './Scaling'
import { previewBaseWidthPx } from './print/dimensions'
import { resolvePrintTarget } from './print/PrintTargetResolver'

describe('Scaling Utilities', () => {
    const baseWidthPx = previewBaseWidthPx(resolvePrintTarget({}))

    it('converts absolute layout pixels to container query width percentages', () => {
        expect(pxToCqw(32, baseWidthPx)).toBe(`${(32 / baseWidthPx) * 100}cqw`)
        expect(pxToCqw(16, baseWidthPx)).toBe(`${(16 / baseWidthPx) * 100}cqw`)
        expect(pxToCqw(baseWidthPx, baseWidthPx)).toBe('100cqw')
    })
})
