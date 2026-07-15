import { describe, it, expect } from 'vitest'
import { buildQrCodes } from './coaLinks'

describe('coaLinks', () => {
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

  it('should trim links and omit invalid or unsupported URLs', () => {
    expect(buildQrCodes({
      vendorCoa: '  https://vendor.test/report  ',
      groupBuyCoa: 'not a url',
      testGroupCoa: 'javascript:alert(1)',
      myCoa: 'ftp://example.test/report',
      customCoa1Name: '   ',
      customCoa1Link: 'http://lab.test/report',
    })).toEqual([
      { type: 'Vendor COA', url: 'https://vendor.test/report' },
      { type: 'Custom 1', url: 'http://lab.test/report' },
    ])
  })
})
