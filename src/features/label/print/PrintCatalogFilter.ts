import { PRINT_CATALOG, getStockById, getPrinterById } from './printCatalog'
import type { FilteredCatalog, LabelStock, PrintSetupSelection, Printer, VialRecommendation } from './types'

type Spec<T> = (item: T) => boolean

function and<T>(...specs: Spec<T>[]): Spec<T> {
  return (item) => specs.every((s) => s(item))
}

function printerSupportsStock(printerId: string): Spec<LabelStock> {
  return (stock) => stock.printerIds.includes(printerId)
}

function stockSupportsPrinter(dimensionId: string): Spec<Printer> {
  return (printer) => printer.labelIds.includes(dimensionId)
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
      stockSpecs.push(printerSupportsStock(printer.id))
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
  if (selection.vialMl == null) return []

  const visibleIds = new Set(visibleStocks.map((s) => s.id))

  return PRINT_CATALOG.vialRecommendations
    .filter((rec: VialRecommendation) =>
      rec.vialMl === selection.vialMl &&
      (!selection.printerId || !rec.printerId || rec.printerId === selection.printerId) &&
      visibleIds.has(rec.stockId),
    )
    .sort((a, b) => a.rank - b.rank)
    .map((rec) => rec.stockId)
}
