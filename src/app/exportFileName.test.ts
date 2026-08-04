import { describe, expect, it } from 'vitest'
import { exportFileName } from './exportFileName'

describe('exportFileName', () => {
  it('should return label-export.png when the compound name is undefined', () => {
    expect(exportFileName(undefined)).toBe('label-export.png')
  })

  it('should return label-export.png when the compound name is empty or whitespace', () => {
    expect(exportFileName('')).toBe('label-export.png')
    expect(exportFileName('   ')).toBe('label-export.png')
  })

  it('should lowercase a compound name before the -export.png suffix', () => {
    expect(exportFileName('Tirzepatide')).toBe('tirzepatide-export.png')
  })

  // Decision reversed 2026-08-03: an empty stem produced "-export.png", and
  // path separators in the name produced multi-segment download paths. Sanitize
  // unsafe characters and treat blank names as absent.
  it('should sanitize path separators and other filesystem-unsafe characters', () => {
    // Spaces stay (they are filesystem-safe); only the slash becomes '-'.
    expect(exportFileName('BPC-157 / TB-500')).toBe('bpc-157 - tb-500-export.png')
    expect(exportFileName('a\\b:c')).toBe('a-b-c-export.png')
  })
})
