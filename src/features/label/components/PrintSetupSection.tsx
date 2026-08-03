import { AccordionSection, TextInput } from './FormInputs'
import { DEFAULT_STOCK_ID } from '../../../print/printCatalog'
import type { PrintSetupSelection, Printer, LabelStock } from '../../../print/types'
import { VialCapacityControl } from './VialCapacityControl'
import { usePrintSetupSectionViewModel } from './usePrintSetupSectionViewModel'

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
  fontSize: '1rem',
  boxSizing: 'border-box' as const,
  color: 'var(--color-text-main)',
  backgroundColor: 'var(--color-surface)',
}

export interface PrintSetupSectionProps {
  selection: PrintSetupSelection
  onChange: (next: PrintSetupSelection) => void
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function PrintSetupSection({
  selection,
  onChange,
  defaultOpen = true,
  open,
  onOpenChange,
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
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
          Printer (optional)
        </label>
        <select
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
        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
          Vial capacity
        </label>
        <VialCapacityControl
          value={vm.vialCapacityMl}
          onChange={vm.selectVialCapacity}
        />
      </div>

      {!vm.useCustomSize ? (
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
            Label stock
          </label>
          <select
            value={vm.stockId ?? DEFAULT_STOCK_ID}
            onChange={(e) => vm.selectCatalogStock(e.target.value)}
            style={{ ...inputStyle, cursor: 'pointer' }}
          >
            {vm.filtered.stocks.map((stock: LabelStock) => {
              const recommended = vm.filtered.recommendedStockIds.includes(stock.id)
              const isDefault = stock.id === DEFAULT_STOCK_ID
              const suffix = recommended ? ' — recommended' : isDefault ? ' — default' : ''
              return (
                <option key={stock.id} value={stock.id}>
                  {stock.name}{suffix}
                </option>
              )
            })}
          </select>
          <button
            type="button"
            onClick={vm.enableCustomSize}
            style={{
              marginTop: 8,
              background: 'none',
              border: 'none',
              padding: 0,
              color: 'var(--color-primary)',
              fontSize: '0.8rem',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Enter custom dimensions
          </button>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <TextInput
                label="Width (mm)"
                value={vm.customWidth}
                onChange={vm.changeCustomWidth}
                placeholder="40"
              />
            </div>
            <div style={{ flex: 1 }}>
              <TextInput
                label="Height (mm)"
                value={vm.customHeight}
                onChange={vm.changeCustomHeight}
                placeholder="20"
              />
            </div>
          </div>
          <p style={{
            fontSize: '0.75rem',
            color: vm.customDimensionsValid ? 'var(--color-text-muted)' : 'var(--color-danger)',
            margin: '0 0 12px',
          }}>
            {vm.customDimensionsValid
              ? 'Custom size uses rectangular corners and standard padding.'
              : 'Enter a positive width and height.'}
          </p>
          <button
            type="button"
            onClick={() => vm.selectCatalogStock(DEFAULT_STOCK_ID)}
            style={{
              marginBottom: 16,
              background: 'none',
              border: 'none',
              padding: 0,
              color: 'var(--color-primary)',
              fontSize: '0.8rem',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Use catalog label stock
          </button>
        </>
      )}
    </AccordionSection>
    </div>
  )
}
