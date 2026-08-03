import { useMemo, useState } from 'react'
import { filterCatalog } from '../../../print/PrintCatalogFilter'
import { DEFAULT_STOCK_ID, getStockById } from '../../../print/printCatalog'
import type { FilteredCatalog, PrintSetupSelection } from '../../../print/types'
import { normalizeVialCapacityMl } from '../vialCapacity'
import { parsePositiveMm } from '../../../print/dimensions'

export interface PrintSetupSectionViewModel {
  filtered: FilteredCatalog
  useCustomSize: boolean
  customWidth: string
  customHeight: string
  customDimensionsValid: boolean
  printerId: string | undefined
  stockId: string
  vialCapacityMl: number
  selectPrinter: (printerId: string | undefined) => void
  selectVialCapacity: (vialCapacityMl: number) => void
  selectCatalogStock: (stockId: string) => void
  enableCustomSize: () => void
  changeCustomWidth: (value: string) => void
  changeCustomHeight: (value: string) => void
}

type StockPatch = Pick<PrintSetupSelection, 'stockId' | 'labelId' | 'widthMm' | 'heightMm'>
type DimensionPatch = Pick<PrintSetupSelection, 'widthMm' | 'heightMm' | 'stockId' | 'labelId'> | null

/** True once the selection carries explicit custom dimensions with no catalog stock. */
export function isPersistedCustomSize(selection: PrintSetupSelection): boolean {
  return selection.widthMm != null && selection.heightMm != null && !selection.stockId
}

/** The custom-size panel shows once the user asks for it, or the persisted selection already is one. */
export function computeUseCustomSize(
  customSizeRequested: boolean,
  selection: PrintSetupSelection,
): boolean {
  return customSizeRequested || isPersistedCustomSize(selection)
}

export function computeCustomDimensionsValid(customWidth: string, customHeight: string): boolean {
  return parsePositiveMm(customWidth) != null && parsePositiveMm(customHeight) != null
}

/** Patch clearing any custom dimensions in favor of the chosen catalog stock. */
export function selectCatalogStockPatch(stockId: string): StockPatch {
  return { stockId, labelId: undefined, widthMm: undefined, heightMm: undefined }
}

/** Seeds the custom-size fields from the current catalog stock (or prior custom size) so switching in feels continuous. */
export function enableCustomSizeState(selection: PrintSetupSelection): {
  widthMm: number
  heightMm: number
  patch: StockPatch
} {
  const current = selection.stockId ? getStockById(selection.stockId) : undefined
  const widthMm = current?.widthMm ?? selection.widthMm ?? 40
  const heightMm = current?.heightMm ?? selection.heightMm ?? 20
  return {
    widthMm,
    heightMm,
    patch: { stockId: undefined, labelId: undefined, widthMm, heightMm },
  }
}

/** Only a valid positive width reaches the selection — an invalid keystroke stays local to the text field. */
export function customWidthPatch(value: string): DimensionPatch {
  const widthMm = parsePositiveMm(value)
  return widthMm == null ? null : { widthMm, stockId: undefined, labelId: undefined }
}

/** Only a valid positive height reaches the selection — an invalid keystroke stays local to the text field. */
export function customHeightPatch(value: string): DimensionPatch {
  const heightMm = parsePositiveMm(value)
  return heightMm == null ? null : { heightMm, stockId: undefined, labelId: undefined }
}

/**
 * Owns the catalog-vs-custom-size state machine for {@link PrintSetupSection.tsx}: which
 * panel shows, the draft width/height text, and whether they parse to a valid size.
 */
export function usePrintSetupSectionViewModel(
  selection: PrintSetupSelection,
  onChange: (next: PrintSetupSelection) => void,
): PrintSetupSectionViewModel {
  const filtered = useMemo(() => filterCatalog(selection), [selection])
  const [customSizeRequested, setCustomSizeRequested] = useState(() => isPersistedCustomSize(selection))
  const [customWidth, setCustomWidth] = useState(String(selection.widthMm ?? 40))
  const [customHeight, setCustomHeight] = useState(String(selection.heightMm ?? 20))

  function update(partial: Partial<PrintSetupSelection>) {
    onChange({ ...selection, ...partial })
  }

  function selectCatalogStock(stockId: string) {
    setCustomSizeRequested(false)
    update(selectCatalogStockPatch(stockId))
  }

  function enableCustomSize() {
    const { widthMm, heightMm, patch } = enableCustomSizeState(selection)
    setCustomSizeRequested(true)
    setCustomWidth(String(widthMm))
    setCustomHeight(String(heightMm))
    update(patch)
  }

  function changeCustomWidth(value: string) {
    setCustomWidth(value)
    const patch = customWidthPatch(value)
    if (patch) update(patch)
  }

  function changeCustomHeight(value: string) {
    setCustomHeight(value)
    const patch = customHeightPatch(value)
    if (patch) update(patch)
  }

  return {
    filtered,
    useCustomSize: computeUseCustomSize(customSizeRequested, selection),
    customWidth,
    customHeight,
    customDimensionsValid: computeCustomDimensionsValid(customWidth, customHeight),
    printerId: selection.printerId,
    stockId: selection.stockId ?? DEFAULT_STOCK_ID,
    vialCapacityMl: normalizeVialCapacityMl(selection.vialCapacityMl),
    selectPrinter: (printerId) => update({ printerId }),
    selectVialCapacity: (vialCapacityMl) => update({ vialCapacityMl }),
    selectCatalogStock,
    enableCustomSize,
    changeCustomWidth,
    changeCustomHeight,
  }
}
