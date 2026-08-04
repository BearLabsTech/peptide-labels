import { useMemo, useState } from 'react'
import type { PrintSetupSelection } from '../../../print/types'
import {
  computeCustomDimensionsValid,
  computeUseCustomSize,
  customHeightPatch,
  customWidthPatch,
  DEFAULT_STOCK_ID,
  enableCustomSizeState,
  filterCatalog,
  isPersistedCustomSize,
  normalizeVialCapacityMl,
  selectCatalogStockPatch,
  type PrintSetupSectionViewModel,
} from './printSetupSectionViewModel'

export type { PrintSetupSectionViewModel } from './printSetupSectionViewModel'
export {
  computeCustomDimensionsValid,
  computeUseCustomSize,
  customHeightPatch,
  customWidthPatch,
  enableCustomSizeState,
  isPersistedCustomSize,
  selectCatalogStockPatch,
} from './printSetupSectionViewModel'

/**
 * Owns the catalog-vs-custom-size state machine for {@link PrintSetupSection.tsx}: which
 * panel shows, the draft width/height text, and whether they parse to a valid size.
 * Pure helpers live in {@link ./printSetupSectionViewModel.ts}.
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
