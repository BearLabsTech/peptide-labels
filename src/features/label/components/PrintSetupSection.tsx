import { useMemo } from 'react'
import { AccordionSection, TextInput } from './FormInputs'
import { filterCatalog } from '../print/PrintCatalogFilter'
import { DEFAULT_STOCK_ID, getStockById } from '../print/printCatalog'
import type { PrintSetupSelection, Printer, LabelStock } from '../print/types'

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
}

export function PrintSetupSection({ selection, onChange, defaultOpen = true }: PrintSetupSectionProps) {
  const filtered = useMemo(() => filterCatalog(selection), [selection])
  const useCustomSize = selection.widthMm != null && selection.heightMm != null && !selection.stockId

  function update(partial: Partial<PrintSetupSelection>) {
    onChange({ ...selection, ...partial })
  }

  function selectCatalogStock(stockId: string) {
    update({ stockId, labelId: undefined, widthMm: undefined, heightMm: undefined })
  }

  function enableCustomSize() {
    const current = selection.stockId ? getStockById(selection.stockId) : undefined
    update({
      stockId: undefined,
      labelId: undefined,
      widthMm: current?.widthMm ?? 40,
      heightMm: current?.heightMm ?? 20,
    })
  }

  return (
    <div id="print-setup">
    <AccordionSection title="Print setup" defaultOpen={defaultOpen}>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
          Printer (optional)
        </label>
        <select
          value={selection.printerId ?? ''}
          onChange={(e) => update({ printerId: e.target.value || undefined })}
          style={{ ...inputStyle, cursor: 'pointer' }}
        >
          <option value="">Default (300 DPI export)</option>
          {filtered.printers.map((p: Printer) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
          Vial size (optional)
        </label>
        <select
          value={selection.vialMl?.toString() ?? ''}
          onChange={(e) => update({ vialMl: e.target.value ? (Number(e.target.value) as 3 | 10) : undefined })}
          style={{ ...inputStyle, cursor: 'pointer' }}
        >
          <option value="">No preference</option>
          <option value="3">3 ml</option>
        </select>
      </div>

      {!useCustomSize ? (
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
            Label stock
          </label>
          <select
            value={selection.stockId ?? DEFAULT_STOCK_ID}
            onChange={(e) => selectCatalogStock(e.target.value)}
            style={{ ...inputStyle, cursor: 'pointer' }}
          >
            {filtered.stocks.map((stock: LabelStock) => {
              const recommended = filtered.recommendedStockIds.includes(stock.id)
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
            onClick={enableCustomSize}
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
                value={String(selection.widthMm ?? '')}
                onChange={(v) => update({ widthMm: Number(v) || undefined, stockId: undefined, labelId: undefined })}
                placeholder="40"
              />
            </div>
            <div style={{ flex: 1 }}>
              <TextInput
                label="Height (mm)"
                value={String(selection.heightMm ?? '')}
                onChange={(v) => update({ heightMm: Number(v) || undefined, stockId: undefined, labelId: undefined })}
                placeholder="20"
              />
            </div>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '0 0 12px' }}>
            Custom size uses rectangular corners and standard padding.
          </p>
          <button
            type="button"
            onClick={() => selectCatalogStock(DEFAULT_STOCK_ID)}
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
