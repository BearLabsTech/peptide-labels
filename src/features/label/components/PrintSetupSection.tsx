import { AccordionSection } from './FormInputs'
import type { PrintSetupSelection, Printer } from '../../../print/types'
import { VialCapacityControl } from './VialCapacityControl'
import { PrintSetupCatalogStockPanel } from './PrintSetupCatalogStockPanel'
import { PrintSetupCustomDimensionsPanel } from './PrintSetupCustomDimensionsPanel'
import { usePrintSetupSectionViewModel } from './usePrintSetupSectionViewModel'
import { inputStyle } from './formStyles'

export interface PrintSetupSectionProps {
  selection: PrintSetupSelection
  onChange: (next: PrintSetupSelection) => void
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  persistError?: string | null
  loadNotice?: string | null
  onDismissLoadNotice?: () => void
}

export function PrintSetupSection({
  selection,
  onChange,
  defaultOpen = true,
  open,
  onOpenChange,
  persistError = null,
  loadNotice = null,
  onDismissLoadNotice,
}: PrintSetupSectionProps) {
  const vm = usePrintSetupSectionViewModel(selection, onChange)

  return (
    <div id="print-setup">
    <AccordionSection
      title="Print setup"
      defaultOpen={defaultOpen}
      open={open}
      onOpenChange={onOpenChange}
    >
      {loadNotice && (
        <div
          className="label-export-error"
          role="alert"
          style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'flex-start' }}
        >
          <p style={{ margin: 0, flex: 1 }}>{loadNotice}</p>
          {onDismissLoadNotice && (
            <button
              type="button"
              onClick={onDismissLoadNotice}
              aria-label="Dismiss notice"
              style={{
                flexShrink: 0,
                border: '1px solid currentColor',
                borderRadius: 4,
                background: 'transparent',
                color: 'inherit',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '2px 8px',
              }}
            >
              Dismiss
            </button>
          )}
        </div>
      )}
      {persistError && (
        <p className="label-export-error" role="alert" style={{ marginBottom: 12 }}>
          {persistError}
        </p>
      )}
      <div style={{ marginBottom: 16 }}>
        <label htmlFor="print-setup-printer" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
          Printer (optional)
        </label>
        <select
          id="print-setup-printer"
          value={vm.printerId ?? ''}
          onChange={(e) => vm.selectPrinter(e.target.value || undefined)}
          style={{ ...inputStyle, cursor: 'pointer' }}
        >
          <option value="">Default (300 DPI export)</option>
          {vm.filtered.printers.map((p: Printer) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 16 }}>
        {/*
          Heading only — VialCapacityControl already exposes aria-label on its
          chip group and custom input, so a wrapping <label> would not associate
          cleanly with a multi-control widget.
        */}
        <div style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
          Vial capacity
        </div>
        <VialCapacityControl
          value={vm.vialCapacityMl}
          onChange={vm.selectVialCapacity}
        />
      </div>

      {!vm.useCustomSize ? (
        <PrintSetupCatalogStockPanel
          stockId={vm.stockId}
          stocks={vm.filtered.stocks}
          recommendedStockIds={vm.filtered.recommendedStockIds}
          onSelectStock={vm.selectCatalogStock}
          onEnableCustomSize={vm.enableCustomSize}
        />
      ) : (
        <PrintSetupCustomDimensionsPanel
          customWidth={vm.customWidth}
          customHeight={vm.customHeight}
          customDimensionsValid={vm.customDimensionsValid}
          onChangeCustomWidth={vm.changeCustomWidth}
          onChangeCustomHeight={vm.changeCustomHeight}
          onSelectCatalogStock={vm.selectCatalogStock}
        />
      )}
    </AccordionSection>
    </div>
  )
}
