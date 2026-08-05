import { PRINT_CATALOG, getStockById, getPrinterById } from './printCatalog'
import type { FilteredCatalog, LabelStock, PrintSetupSelection, Printer, VialRecommendation } from './types'

type Spec<T> = (item: T) => boolean

function and<T>(...specs: Spec<T>[]): Spec<T> {
  return (item) => specs.every((s) => s(item))
}

/** A stock is compatible when its dimension is one the printer supports. */
function printerSupportsStock(dimensionIds: readonly string[]): Spec<LabelStock> {
  return (stock) => dimensionIds.includes(stock.dimensionId)
}

function stockSupportsPrinter(dimensionId: string): Spec<Printer> {
  return (printer) => printer.dimensionIds.includes(dimensionId)
}

function resolveDimensionFilter(selection: Partial<PrintSetupSelection>): string | undefined {
  if (selection.stockId) {
    return getStockById(selection.stockId)?.dimensionId
  }
  if (selection.labelId) {
    return selection.labelId
  }
  return undefined
}

export function filterCatalog(selection: Partial<PrintSetupSelection> = {}): FilteredCatalog {
  const printerSpecs: Spec<Printer>[] = []
  const stockSpecs: Spec<LabelStock>[] = []

  const dimensionId = resolveDimensionFilter(selection)
  if (dimensionId) {
    printerSpecs.push(stockSupportsPrinter(dimensionId))
  }

  if (selection.printerId) {
    const printer = getPrinterById(selection.printerId)
    if (printer) {
      stockSpecs.push(printerSupportsStock(printer.dimensionIds))
    }
  }

  const printers =
    printerSpecs.length === 0
      ? [...PRINT_CATALOG.printers]
      : PRINT_CATALOG.printers.filter(and(...printerSpecs))

  const stocks =
    stockSpecs.length === 0
      ? [...PRINT_CATALOG.stocks]
      : PRINT_CATALOG.stocks.filter(and(...stockSpecs))

  const recommendedStockIds = buildRecommendedStockIds(selection, stocks)

  return { printers, stocks, recommendedStockIds }
}

function buildRecommendedStockIds(
  selection: Partial<PrintSetupSelection>,
  visibleStocks: LabelStock[],
): string[] {
  const vialCapacityMl = selection.vialCapacityMl
  if (vialCapacityMl == null) return []

  const visibleIds = new Set(visibleStocks.map((s) => s.id))

  return PRINT_CATALOG.vialRecommendations
    .filter((rec: VialRecommendation) =>
      rec.vialCapacityMl === vialCapacityMl &&
      (!selection.printerId || !rec.printerId || rec.printerId === selection.printerId) &&
      visibleIds.has(rec.stockId),
    )
    .sort((a, b) => a.rank - b.rank)
    .map((rec) => rec.stockId)
}
