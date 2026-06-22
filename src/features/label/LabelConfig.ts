import { DEFAULT_DPI, SKIP_DEFAULT_TARGET } from './print/defaults'
import { previewBaseWidthPx } from './print/dimensions'
import { resolvePrintTarget } from './print/PrintTargetResolver'

/** @deprecated Prefer PrintTarget from print/ module. Kept for gradual migration. */
export const LABEL_CONFIG = {
  printer: {
    dpi: DEFAULT_DPI,
  },
  dimensions: {
    widthMm: SKIP_DEFAULT_TARGET.labelWidthMm,
    heightMm: SKIP_DEFAULT_TARGET.labelHeightMm,
    paddingMm: SKIP_DEFAULT_TARGET.paddingMm,
  },
  ui: {
    baseContainerWidthPx: previewBaseWidthPx(resolvePrintTarget({})),
  },
}
