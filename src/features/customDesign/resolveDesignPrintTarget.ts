import { DEFAULT_DPI, SKIP_DEFAULT_TARGET } from '../../print/defaults'
import { getPrinterById, getStockById } from '../../print/printCatalog'
import type { PrintTarget } from '../../print/types'
import { DEFAULT_VIAL_CAPACITY_ML, normalizeVialCapacityMl } from '../../print/vialCapacity'
import type { Result } from '../../shared/result'
import { unwrapOr } from '../../shared/result'
import type { DesignDocument, DesignStock } from './designDocument'

export type ResolveDesignPrintTargetOptions = {
  printerId?: string
  vialCapacityMl?: number
}

export type DesignPrintTargetError = {
  readonly kind: 'unknown_catalog_stock'
  readonly stockId: string
}

function resolveEffectiveDpi(printerId?: string): number {
  if (!printerId) return DEFAULT_DPI
  return getPrinterById(printerId)?.dpi ?? DEFAULT_DPI
}

function stockToPrintTarget(
  stock: DesignStock,
  effectiveDpi: number,
  vialCapacityMl: number,
  printerId?: string,
): Result<PrintTarget, DesignPrintTargetError> {
  if (stock.kind === 'catalog') {
    const catalog = getStockById(stock.stockId)
    if (!catalog) {
      return { ok: false, error: { kind: 'unknown_catalog_stock', stockId: stock.stockId } }
    }
    return {
      ok: true,
      value: {
        labelWidthMm: catalog.widthMm,
        labelHeightMm: catalog.heightMm,
        effectiveDpi,
        paddingMm: catalog.paddingMm,
        shape: catalog.shape,
        cornerRadiusMm: catalog.cornerRadiusMm,
        stockId: catalog.id,
        dimensionId: catalog.dimensionId,
        printerId,
        vialCapacityMl,
      },
    }
  }

  return {
    ok: true,
    value: {
      labelWidthMm: stock.widthMm,
      labelHeightMm: stock.heightMm,
      effectiveDpi,
      paddingMm: stock.paddingMm,
      shape: stock.shape,
      cornerRadiusMm: stock.cornerRadiusMm,
      printerId,
      vialCapacityMl,
    },
  }
}

/** Map a design’s locked stock to a PrintTarget for preview/export. */
export function resolveDesignPrintTarget(
  design: DesignDocument,
  options: ResolveDesignPrintTargetOptions = {},
): Result<PrintTarget, DesignPrintTargetError> {
  const effectiveDpi = resolveEffectiveDpi(options.printerId)
  const vialCapacityMl = normalizeVialCapacityMl(
    options.vialCapacityMl ?? DEFAULT_VIAL_CAPACITY_ML,
  )
  return stockToPrintTarget(design.stock, effectiveDpi, vialCapacityMl, options.printerId)
}

/**
 * Same as {@link resolveDesignPrintTarget}, but unknown catalog stocks fall back
 * to {@link SKIP_DEFAULT_TARGET} instead of leaving the caller to handle failure.
 */
export function resolveDesignPrintTargetOrDefault(
  design: DesignDocument,
  options: ResolveDesignPrintTargetOptions = {},
): PrintTarget {
  const vialCapacityMl = normalizeVialCapacityMl(
    options.vialCapacityMl ?? DEFAULT_VIAL_CAPACITY_ML,
  )
  const fallback: PrintTarget = {
    ...SKIP_DEFAULT_TARGET,
    printerId: options.printerId,
    vialCapacityMl,
  }
  const result = resolveDesignPrintTarget(design, options)
  if (!result.ok) {
    console.error(
      `Unknown catalog stock id "${result.error.stockId}"; falling back to default print target`,
      result.error,
    )
  }
  return unwrapOr(result, fallback)
}
