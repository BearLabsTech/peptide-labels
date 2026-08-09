import type { CSSProperties } from 'react'
import { cssVars } from '../../shared/cssVars'
import {
  LABEL_SPACING,
  SPACING_CSS_VAR_NAME,
  SPACING_CSS_VAR_UNIT,
  type LabelSpacingKey,
} from './labelSpacing'

/**
 * Emits every {@link LABEL_SPACING} metric as a CSS custom property on the
 * label container, for `LabelPreview.tsx` to spread into its inline style.
 * Split out from `labelSpacing.ts` so the pure metrics module carries no
 * React type dependency.
 */
export function labelSpacingCssVars(): CSSProperties {
  const record = {} as Record<`--${string}`, string>
  for (const key of Object.keys(LABEL_SPACING) as LabelSpacingKey[]) {
    record[SPACING_CSS_VAR_NAME[key]] = `${LABEL_SPACING[key]}${SPACING_CSS_VAR_UNIT[key]}`
  }
  return cssVars(record)
}
