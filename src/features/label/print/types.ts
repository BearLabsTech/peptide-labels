export type VialSizeMl = 3 | 10

export interface PrintTarget {
  labelWidthMm: number
  labelHeightMm: number
  effectiveDpi: number
  paddingMm: number
  printerId?: string
  labelId?: string
  vialMl?: VialSizeMl
}

export interface PrintSetupSelection {
  printerId?: string
  labelId?: string
  widthMm?: number
  heightMm?: number
  vialMl?: VialSizeMl
}

export interface Printer {
  id: string
  name: string
  dpi: number
  labelIds: string[]
}

export interface LabelSize {
  id: string
  name: string
  widthMm: number
  heightMm: number
  printerIds: string[]
}

export interface VialRecommendation {
  vialMl: VialSizeMl
  labelId: string
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
  labels: LabelSize[]
  recommendedLabelIds: string[]
}
