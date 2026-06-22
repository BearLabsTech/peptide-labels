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
  printerIds: ['niimbot-b21', 'niimbot-m2', 'niimbot-b21-pro'],
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
  printerIds: ['niimbot-b21', 'niimbot-m2', 'niimbot-b21-pro'],
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
  printerIds: ['niimbot-b21', 'niimbot-m2', 'niimbot-b21-pro'],
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
  printerIds: ['niimbot-b21', 'niimbot-m2', 'niimbot-b21-pro'],
}

export const DEFAULT_STOCK_ID = STOCK_40X20_ROUNDED.id

export const PRINT_CATALOG = {
  stocks: [
    STOCK_40X20_ROUNDED,
    STOCK_40X20_RECT,
    STOCK_50X30_ROUNDED,
    STOCK_50X30_RECT,
  ] as const satisfies readonly LabelStock[],
  printers: [
    {
      id: 'niimbot-b21',
      name: 'Niimbot B21',
      dpi: 203,
      labelIds: ['40x20', '50x30'],
    },
    {
      id: 'niimbot-m2',
      name: 'Niimbot M2',
      dpi: 300,
      labelIds: ['40x20', '50x30'],
    },
    {
      id: 'niimbot-b21-pro',
      name: 'Niimbot B21 Pro',
      dpi: 300,
      labelIds: ['40x20', '50x30'],
    },
  ] as const satisfies readonly Printer[],
  vialRecommendations: [
    { vialMl: 3, stockId: '40x20-rounded', rank: 1 },
    { vialMl: 3, stockId: '50x30-rounded', rank: 2 },
    { vialMl: 10, stockId: '50x30-rounded', rank: 1 },
    { vialMl: 10, stockId: '40x20-rounded', rank: 2 },
  ] satisfies readonly VialRecommendation[],
} as const

export function getPrinterById(id: string): Printer | undefined {
  return PRINT_CATALOG.printers.find((p) => p.id === id)
}

export function getStockById(id: string): LabelStock | undefined {
  return PRINT_CATALOG.stocks.find((s) => s.id === id)
}
