import { getPrinterById } from '../../../print/printCatalog'
import { formatPrintTargetSummary } from '../../../print/printTargetSummary'
import type { PrintTarget } from '../../../print/types'

export interface PrintTargetBannerProps {
  printTarget: PrintTarget
  onChange?: () => void
}

export function PrintTargetBanner({ printTarget, onChange }: PrintTargetBannerProps) {
  const printerName = printTarget.printerId
    ? getPrinterById(printTarget.printerId)?.name
    : undefined
  const { primary, secondary } = formatPrintTargetSummary(printTarget, printerName)

  return (
    <div className="print-target-banner">
      <div className="print-target-banner-text">
        <div className="print-target-banner-primary">{primary}</div>
        <div className="print-target-banner-secondary">{secondary}</div>
      </div>
      {onChange && (
        <button type="button" className="print-target-banner-change" onClick={onChange}>
          Change
        </button>
      )}
    </div>
  )
}
