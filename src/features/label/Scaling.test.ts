import { describe, it, expect } from 'vitest'
import { pxToCqw } from './scaling'

describe('Scaling Utilities', () => {
    it('converts absolute layout pixels to container query width percentages', () => {
        // Assuming a base label width of 320px:
        // 32px should be exactly 10% of the container width (10cqw)
        expect(pxToCqw(32)).toBe('10cqw')

        // 16px should be exactly 5% of the container width (5cqw)
        expect(pxToCqw(16)).toBe('5cqw')

        // 320px should be 100% of the container width (100cqw)
        expect(pxToCqw(320)).toBe('100cqw')
    })
})