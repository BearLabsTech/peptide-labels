import type { PrintTarget } from './types'

export const DEFAULT_DPI = 300
export const LABEL_PADDING_MM = 2

export const SKIP_DEFAULT_LABEL_ID = '40x20'

export const SKIP_DEFAULT_TARGET: PrintTarget = {
  labelWidthMm: 40,
  labelHeightMm: 20,
  effectiveDpi: DEFAULT_DPI,
  paddingMm: LABEL_PADDING_MM,
  labelId: SKIP_DEFAULT_LABEL_ID,
  vialMl: 3,
}
