import { describe, it, expect } from 'vitest'
import { hasCoaLinks, buildQrCodes } from './coaLinks'

describe('coaLinks', () => {
  it('should detect when any COA URL is present', () => {
    expect(hasCoaLinks({})).toBe(false)
    expect(hasCoaLinks({ vendorCoa: 'https://example.com' })).toBe(true)
    expect(hasCoaLinks({ customCoa1Link: 'https://example.com' })).toBe(true)
  })

  it('should build QR entries with custom COA names', () => {
    expect(buildQrCodes({
      vendorCoa: 'https://vendor.test',
      customCoa1Name: 'Lab COA',
      customCoa1Link: 'https://lab.test',
    })).toEqual([
      { type: 'Vendor COA', url: 'https://vendor.test' },
      { type: 'Lab COA', url: 'https://lab.test' },
    ])
  })
})
