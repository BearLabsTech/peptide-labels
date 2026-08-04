import { describe, it, expect } from 'vitest'
import {
  DEFAULT_LABEL_LAYOUT_MODE,
  formatDrawVolumeLabel,
  parseNumericDisplayPrefix,
  resolveLabelLayoutMode,
} from './labelModel'
import { formatDisplayNumber } from './peptideMath'

describe('parseNumericDisplayPrefix', () => {
  it('should parse a bare numeric water amount for the print path', () => {
    expect(parseNumericDisplayPrefix('2')).toBe(2)
    expect(`${formatDisplayNumber(parseNumericDisplayPrefix('2')!)} ml`).toBe('2 ml')
  })

  it('should parse water amounts that already include ml', () => {
    expect(parseNumericDisplayPrefix('2ml')).toBe(2)
    expect(parseNumericDisplayPrefix('2 ml')).toBe(2)
  })

  it('should return undefined for empty input', () => {
    expect(parseNumericDisplayPrefix('')).toBeNull()
  })
})

describe('formatDrawVolumeLabel', () => {
  it('should append units to a bare numeric draw volume', () => {
    expect(formatDrawVolumeLabel('10')).toBe('10 units')
  })

  it('should leave draw volume unchanged when units are already present', () => {
    expect(formatDrawVolumeLabel('10 units')).toBe('10 units')
  })

  it('should return empty string for missing values', () => {
    expect(formatDrawVolumeLabel('')).toBe('')
    expect(formatDrawVolumeLabel(undefined)).toBe('')
  })
})

describe('resolveLabelLayoutMode', () => {
  it('should default to the identity header layout', () => {
    expect(resolveLabelLayoutMode({})).toBe(DEFAULT_LABEL_LAYOUT_MODE)
    expect(resolveLabelLayoutMode({ labelLayoutMode: 'identityHeader' })).toBe('identityHeader')
  })
})
