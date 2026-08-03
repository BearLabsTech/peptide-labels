import type { VialCapacityMl } from './vialCapacity'

export type { VialCapacityMl } from './vialCapacity'

export type LabelShape = 'rounded' | 'rectangular'

/** Physical adhesive stock profile (size + corner shape + padding). */
export interface LabelStock {
  readonly id: string
  readonly name: string
  /** Dimension group for printer compatibility (e.g. `40x20`). */
  readonly dimensionId: string
  readonly widthMm: number
  readonly heightMm: number
  readonly shape: LabelShape
  readonly cornerRadiusMm: number
  readonly paddingMm: number
}

export interface PrintTarget {
  readonly labelWidthMm: number
  readonly labelHeightMm: number
  readonly effectiveDpi: number
  readonly paddingMm: number
  readonly shape: LabelShape
  readonly cornerRadiusMm: number
  readonly stockId?: string
  readonly dimensionId?: string
  readonly printerId?: string
  readonly vialCapacityMl: VialCapacityMl
}

export interface PrintSetupSelection {
  readonly printerId?: string
  readonly stockId?: string
  /** @deprecated Legacy; migrated to stockId on load. */
  readonly labelId?: string
  readonly widthMm?: number
  readonly heightMm?: number
  readonly vialCapacityMl?: VialCapacityMl
  /** @deprecated Legacy; migrated to vialCapacityMl on load. */
  readonly vialMl?: number
}

export interface Printer {
  readonly id: string
  readonly name: string
  /** Native DPI; used for export when this printer is selected. */
  readonly dpi: number
  readonly dimensionIds: readonly string[]
}

export interface VialRecommendation {
  readonly vialCapacityMl: VialCapacityMl
  readonly stockId: string
  readonly rank: number
  readonly printerId?: string
}

export interface ExportSpec {
  readonly canvasWidthPx: number
  readonly canvasHeightPx: number
  readonly pixelRatio: 1
  readonly dpi: number
}

export interface FilteredCatalog {
  readonly printers: readonly Printer[]
  readonly stocks: readonly LabelStock[]
  readonly recommendedStockIds: readonly string[]
}
