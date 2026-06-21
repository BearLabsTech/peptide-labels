import { PRINT_CATALOG, getLabelById, getPrinterById } from './printCatalog'
import type { FilteredCatalog, LabelSize, PrintSetupSelection, Printer, VialRecommendation } from './types'

type Spec<T> = (item: T) => boolean

function and<T>(...specs: Spec<T>[]): Spec<T> {
  return (item) => specs.every((s) => s(item))
}

function printerSupportsLabel(printerId: string): Spec<LabelSize> {
  return (label) => label.printerIds.includes(printerId)
}

function labelSupportsPrinter(labelId: string): Spec<Printer> {
  return (printer) => printer.labelIds.includes(labelId)
}

export function filterCatalog(selection: Partial<PrintSetupSelection> = {}): FilteredCatalog {
  const printerSpecs: Spec<Printer>[] = []
  const labelSpecs: Spec<LabelSize>[] = []

  if (selection.labelId) {
    const label = getLabelById(selection.labelId)
    if (label) {
      printerSpecs.push(labelSupportsPrinter(label.id))
    }
  }

  if (selection.printerId) {
    const printer = getPrinterById(selection.printerId)
    if (printer) {
      labelSpecs.push(printerSupportsLabel(printer.id))
    }
  }

  const printers =
    printerSpecs.length === 0
      ? [...PRINT_CATALOG.printers]
      : PRINT_CATALOG.printers.filter(and(...printerSpecs))

  const labels =
    labelSpecs.length === 0
      ? [...PRINT_CATALOG.labels]
      : PRINT_CATALOG.labels.filter(and(...labelSpecs))

  const recommendedLabelIds = buildRecommendedLabelIds(selection, labels)

  return { printers, labels, recommendedLabelIds }
}

function buildRecommendedLabelIds(
  selection: Partial<PrintSetupSelection>,
  visibleLabels: LabelSize[],
): string[] {
  if (selection.vialMl == null) return []

  const visibleIds = new Set(visibleLabels.map((l) => l.id))

  return PRINT_CATALOG.vialRecommendations
    .filter((rec: VialRecommendation) =>
      rec.vialMl === selection.vialMl &&
      (!selection.printerId || !rec.printerId || rec.printerId === selection.printerId) &&
      visibleIds.has(rec.labelId),
    )
    .sort((a, b) => a.rank - b.rank)
    .map((rec) => rec.labelId)
}
