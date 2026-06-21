import type { LabelSize, Printer, VialRecommendation } from './types'

const LABEL_40X20: LabelSize = {
  id: '40x20',
  name: '40 × 20 mm',
  widthMm: 40,
  heightMm: 20,
  printerIds: ['niimbot-b21', 'niimbot-m2', 'niimbot-b21-pro'],
}

const LABEL_50X30: LabelSize = {
  id: '50x30',
  name: '50 × 30 mm',
  widthMm: 50,
  heightMm: 30,
  printerIds: ['niimbot-b21', 'niimbot-m2', 'niimbot-b21-pro'],
}

export const PRINT_CATALOG = {
  labels: [LABEL_40X20, LABEL_50X30] as const satisfies readonly LabelSize[],
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
    { vialMl: 3, labelId: '40x20', rank: 1 },
    { vialMl: 3, labelId: '50x30', rank: 2 },
    { vialMl: 10, labelId: '50x30', rank: 1 },
    { vialMl: 10, labelId: '40x20', rank: 2 },
  ] satisfies readonly VialRecommendation[],
} as const

export function getPrinterById(id: string): Printer | undefined {
  return PRINT_CATALOG.printers.find((p) => p.id === id)
}

export function getLabelById(id: string): LabelSize | undefined {
  return PRINT_CATALOG.labels.find((l) => l.id === id)
}
