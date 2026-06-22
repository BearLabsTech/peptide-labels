export type VialSizeMl = 3 | 10

export type LabelShape = 'rounded' | 'rectangular'

/** Physical adhesive stock profile (size + corner shape + padding). */
export interface LabelStock {
  id: string
  name: string
  /** Dimension group for printer compatibility (e.g. `40x20`). */
  dimensionId: string
  widthMm: number
  heightMm: number
  shape: LabelShape
  cornerRadiusMm: number
  paddingMm: number
  printerIds: string[]
}

export interface PrintTarget {
  labelWidthMm: number
  labelHeightMm: number
  effectiveDpi: number
  paddingMm: number
  shape: LabelShape
  cornerRadiusMm: number
  stockId?: string
  dimensionId?: string
  printerId?: string
  vialMl?: VialSizeMl
}

export interface PrintSetupSelection {
  printerId?: string
  stockId?: string
  /** @deprecated Legacy; migrated to stockId on load. */
  labelId?: string
  widthMm?: number
  heightMm?: number
  vialMl?: VialSizeMl
}

export interface Printer {
  id: string
  name: string
  /** Native DPI; used for export when this printer is selected. */
  dpi: number
  labelIds: string[]
}

export interface VialRecommendation {
  vialMl: VialSizeMl
  stockId: string
  rank: number
  printerId?: string
}

export interface ExportSpec {
  canvasWidthPx: number
  canvasHeightPx: number
  pixelRatio: 1
  dpi: number
}

export interface FilteredCatalog {
  printers: Printer[]
  stocks: LabelStock[]
  recommendedStockIds: string[]
}
