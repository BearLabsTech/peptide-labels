import { describe, it, expect } from 'vitest'
import {
  LABEL_SPACING,
  labelSpacingCssVarName,
  type LabelSpacingKey,
} from './labelSpacing'
import { labelSpacingCssVars } from './labelSpacingCssVars'

/**
 * Expected CSS unit suffix per metric. Pad-relative fractions are unitless so
 * CSS can multiply them; absolute gaps are literal CSS lengths.
 * Kept independent of `labelSpacing.ts`'s own unit table on purpose —
 * this pins the *contract*, so a unit typo in the module fails this test.
 */
const EXPECTED_UNIT: Record<LabelSpacingKey, string> = {
  titleBandGapFrac: '',
  sparseTitleTestingGapFrac: '',
  testingColumnPadLeftFrac: '',
  testingColumnGapCqw: 'cqw',
  qrSlotPadTopCqw: 'cqw',
}

describe('labelSpacingCssVars', () => {
  const emitted = labelSpacingCssVars() as Record<string, string>
  const keys = Object.keys(LABEL_SPACING) as LabelSpacingKey[]

  it('should emit exactly one CSS custom property per LABEL_SPACING metric', () => {
    expect(Object.keys(emitted)).toHaveLength(keys.length)
  })

  it.each(keys)(
    'should emit %s as the engine constant with the expected unit, so layout math and LabelPreview.css can never silently drift apart',
    (key) => {
      const varName = labelSpacingCssVarName(key)
      const value = emitted[varName]

      expect(value, `no CSS custom property emitted for LABEL_SPACING.${key}`).toBeDefined()
      expect(value).toBe(`${LABEL_SPACING[key]}${EXPECTED_UNIT[key]}`)
    },
  )

  it('should round-trip every emitted value back to the exact LABEL_SPACING number regardless of unit suffix', () => {
    for (const key of keys) {
      const varName = labelSpacingCssVarName(key)
      expect(parseFloat(emitted[varName])).toBe(LABEL_SPACING[key])
    }
  })
})
