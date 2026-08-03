import { describe, expect, it } from 'vitest'
import { exportFileName } from './exportFileName'

describe('exportFileName', () => {
  it('should return label-export.png when the compound name is undefined', () => {
    expect(exportFileName(undefined)).toBe('label-export.png')
  })

  it('should lowercase a compound name before the -export.png suffix', () => {
    expect(exportFileName('Tirzepatide')).toBe('tirzepatide-export.png')
  })

  it('should preserve spaces and slashes in the compound name (today’s behavior)', () => {
    expect(exportFileName('BPC-157 / TB-500')).toBe('bpc-157 / tb-500-export.png')
  })
})
