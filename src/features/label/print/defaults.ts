import { DEFAULT_STOCK_ID, getStockById } from './printCatalog'
import type { PrintTarget } from './types'
import { DEFAULT_VIAL_CAPACITY_ML } from '../vialCapacity'

export const DEFAULT_DPI = 300

/** Custom mm entry when no catalog stock is selected. */
export const CUSTOM_STOCK_PADDING_MM = 1

const defaultStock = getStockById(DEFAULT_STOCK_ID)!

export const SKIP_DEFAULT_TARGET: PrintTarget = {
  labelWidthMm: defaultStock.widthMm,
  labelHeightMm: defaultStock.heightMm,
  effectiveDpi: DEFAULT_DPI,
  paddingMm: defaultStock.paddingMm,
  shape: defaultStock.shape,
  cornerRadiusMm: defaultStock.cornerRadiusMm,
  stockId: defaultStock.id,
  dimensionId: defaultStock.dimensionId,
  vialCapacityMl: DEFAULT_VIAL_CAPACITY_ML,
}
