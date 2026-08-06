import { useMemo } from 'react'
import type { PrintTarget } from '../../print/types'
import { CanvasTextMeasurer } from '../../platform/CanvasTextMeasurer'
import { LabelComposer } from './LabelComposer'
import { LABEL_FONT_FAMILY } from './labelTypography'

/**
 * Builds a LabelComposer with a canvas-backed TextMeasurer. Lives in a hook
 * (not a .tsx view) so production can import the platform adapter without
 * violating the views-must-not-import-platform eslint rule.
 */
export function useLabelComposer(printTarget: PrintTarget): LabelComposer {
  return useMemo(() => {
    const measurer = new CanvasTextMeasurer(LABEL_FONT_FAMILY)
    return new LabelComposer(printTarget, measurer)
  }, [printTarget])
}
