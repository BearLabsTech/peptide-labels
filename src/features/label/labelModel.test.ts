import { describe, it, expect } from 'vitest'
import {
  DEFAULT_LABEL_LAYOUT_MODE,
  formatDrawVolumeLabel,
  formatWaterVolumeLabel,
  resolveLabelLayoutMode,
} from './labelModel'

describe('formatWaterVolumeLabel', () => {
  it('should append ml to a bare numeric water amount', () => {
    expect(formatWaterVolumeLabel('2')).toBe('2 ml')
  })

  it('should normalize water amounts that already include ml', () => {
    expect(formatWaterVolumeLabel('2ml')).toBe('2 ml')
    expect(formatWaterVolumeLabel('2 ml')).toBe('2 ml')
  })

  it('should return empty string for missing values', () => {
    expect(formatWaterVolumeLabel('')).toBe('')
    expect(formatWaterVolumeLabel(undefined)).toBe('')
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