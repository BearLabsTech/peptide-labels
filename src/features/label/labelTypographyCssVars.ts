import type { CSSProperties } from 'react'
import { cssVars } from '../../shared/cssVars'
import { CSS_VAR_NAME, CSS_VAR_UNIT, LABEL_TYPOGRAPHY, type LabelTypographyKey } from './labelTypography'

/**
 * Emits every {@link LABEL_TYPOGRAPHY} metric as a CSS custom property on the
 * label container, for `LabelPreview.tsx` to spread into its inline style.
 * Split out from `labelTypography.ts` so the pure metrics module — which
 * `LabelLayoutEngine.ts` imports for layout math — carries no React type
 * dependency.
 */
export function labelTypographyCssVars(): CSSProperties {
  const record = {} as Record<`--${string}`, string>
  for (const key of Object.keys(LABEL_TYPOGRAPHY) as LabelTypographyKey[]) {
    record[CSS_VAR_NAME[key]] = `${LABEL_TYPOGRAPHY[key]}${CSS_VAR_UNIT[key]}`
  }
  return cssVars(record)
}
