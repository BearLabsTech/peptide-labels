import { describe, it, expect } from 'vitest'
import {
  LABEL_TYPOGRAPHY,
  labelTypographyCssVarName,
  labelTypographyCssVars,
  type LabelTypographyKey,
} from './labelTypography'

/**
 * Expected CSS unit suffix per metric. Ratios/line-heights are unitless so
 * `LabelPreview.css` can multiply them (`calc(var(--x) * 1em)`); the box
 * chrome metrics are literal CSS lengths so they must carry their unit.
 * Kept independent of `labelTypography.ts`'s own unit table on purpose —
 * this pins the *contract*, so a unit typo in the module fails this test.
 */
const EXPECTED_UNIT: Record<LabelTypographyKey, string> = {
  sectionLabelEm: '',
  contentEm: '',
  contentLineHeightEm: '',
  borderWidthPx: 'px',
  boxPadVerticalCqw: 'cqw',
  boxGapCqw: 'cqw',
  titleLineHeightEm: '',
}

describe('labelTypographyCssVars', () => {
  const emitted = labelTypographyCssVars() as Record<string, string>
  const keys = Object.keys(LABEL_TYPOGRAPHY) as LabelTypographyKey[]

  it('should emit exactly one CSS custom property per LABEL_TYPOGRAPHY metric', () => {
    expect(Object.keys(emitted)).toHaveLength(keys.length)
  })

  it.each(keys)(
    'should emit %s as the engine constant with the expected unit, so LabelLayoutEngine.ts and LabelPreview.css can never silently drift apart',
    (key) => {
      const varName = labelTypographyCssVarName(key)
      const value = emitted[varName]

      expect(value, `no CSS custom property emitted for LABEL_TYPOGRAPHY.${key}`).toBeDefined()
      expect(value).toBe(`${LABEL_TYPOGRAPHY[key]}${EXPECTED_UNIT[key]}`)
    },
  )

  it('should round-trip every emitted value back to the exact LABEL_TYPOGRAPHY number regardless of unit suffix', () => {
    for (const key of keys) {
      const varName = labelTypographyCssVarName(key)
      expect(parseFloat(emitted[varName])).toBe(LABEL_TYPOGRAPHY[key])
    }
  })
})
