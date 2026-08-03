import type { LabelStock, Printer, VialRecommendation } from './types'

const STOCK_40X20_ROUNDED: LabelStock = {
  id: '40x20-rounded',
  name: '40 × 20 mm — rounded',
  dimensionId: '40x20',
  widthMm: 40,
  heightMm: 20,
  shape: 'rounded',
  cornerRadiusMm: 1.2,
  paddingMm: 0.5,
}

const STOCK_40X20_RECT: LabelStock = {
  id: '40x20-rect',
  name: '40 × 20 mm — rectangular',
  dimensionId: '40x20',
  widthMm: 40,
  heightMm: 20,
  shape: 'rectangular',
  cornerRadiusMm: 0,
  paddingMm: 1,
}

const STOCK_50X30_ROUNDED: LabelStock = {
  id: '50x30-rounded',
  name: '50 × 30 mm — rounded',
  dimensionId: '50x30',
  widthMm: 50,
  heightMm: 30,
  shape: 'rounded',
  cornerRadiusMm: 1.5,
  paddingMm: 0.5,
}

const STOCK_50X30_RECT: LabelStock = {
  id: '50x30-rect',
  name: '50 × 30 mm — rectangular',
  dimensionId: '50x30',
  widthMm: 50,
  heightMm: 30,
  shape: 'rectangular',
  cornerRadiusMm: 0,
  paddingMm: 1,
}

const STOCK_40X30_ROUNDED: LabelStock = {
  id: '40x30-rounded',
  name: '40 × 30 mm — rounded',
  dimensionId: '40x30',
  widthMm: 40,
  heightMm: 30,
  shape: 'rounded',
  cornerRadiusMm: 1.5,
  paddingMm: 0.5,
}

const STOCK_40X30_RECT: LabelStock = {
  id: '40x30-rect',
  name: '40 × 30 mm — rectangular',
  dimensionId: '40x30',
  widthMm: 40,
  heightMm: 30,
  shape: 'rectangular',
  cornerRadiusMm: 0,
  paddingMm: 1,
}

export const DEFAULT_STOCK_ID = STOCK_40X20_ROUNDED.id

/**
 * Recursively freezes an object and every array/object it contains, so no
 * caller — including one that casts past `readonly` — can mutate a shared
 * catalog reference and corrupt state for every other holder of it.
 */
function deepFreeze<T>(value: T): Readonly<T> {
  if (Array.isArray(value)) {
    for (const item of value) deepFreeze(item)
    return Object.freeze(value)
  }
  if (value !== null && typeof value === 'object') {
    for (const key of Object.keys(value)) deepFreeze((value as Record<string, unknown>)[key])
    return Object.freeze(value)
  }
  return value
}

export const PRINT_CATALOG = deepFreeze({
  stocks: [
    STOCK_40X20_ROUNDED,
    STOCK_40X20_RECT,
    STOCK_40X30_ROUNDED,
    STOCK_40X30_RECT,
    STOCK_50X30_ROUNDED,
    STOCK_50X30_RECT,
  ] as const satisfies readonly LabelStock[],
  printers: [
    {
      id: 'niimbot-b21',
      name: 'Niimbot B21',
      dpi: 203,
      dimensionIds: ['40x20', '40x30', '50x30'],
    },
    {
      id: 'niimbot-m2',
      name: 'Niimbot M2',
      dpi: 300,
      dimensionIds: ['40x20', '50x30'],
    },
    {
      id: 'niimbot-b21-pro',
      name: 'Niimbot B21 Pro',
      dpi: 300,
      dimensionIds: ['40x20', '40x30', '50x30'],
    },
    {
      id: 'niimbot-b1-pro',
      name: 'Niimbot B1 Pro',
      dpi: 300,
      dimensionIds: ['40x20', '40x30', '50x30'],
    },
  ] as const satisfies readonly Printer[],
  vialRecommendations: [
    { vialCapacityMl: 3, stockId: '40x20-rounded', rank: 1 },
    { vialCapacityMl: 3, stockId: '50x30-rounded', rank: 2 },
    { vialCapacityMl: 10, stockId: '50x30-rounded', rank: 1 },
    { vialCapacityMl: 10, stockId: '40x20-rounded', rank: 2 },
  ] satisfies readonly VialRecommendation[],
} as const)

/** The catalog is deep-frozen, so handing out the live entry is safe — nothing can mutate it. */
export function getPrinterById(id: string): Readonly<Printer> | undefined {
  return PRINT_CATALOG.printers.find((p) => p.id === id)
}

export function getStockById(id: string): Readonly<LabelStock> | undefined {
  return PRINT_CATALOG.stocks.find((s) => s.id === id)
}
