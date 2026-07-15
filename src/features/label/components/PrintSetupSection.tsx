import { useMemo, useState } from 'react'
import { AccordionSection, TextInput } from './FormInputs'
import { filterCatalog } from '../print/PrintCatalogFilter'
import { DEFAULT_STOCK_ID, getStockById } from '../print/printCatalog'
import type { PrintSetupSelection, Printer, LabelStock } from '../print/types'
import { VialCapacityControl } from './VialCapacityControl'
import { normalizeVialCapacityMl } from '../vialCapacity'
import { parsePositiveMm } from '../print/dimensions'

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
  const filtered = useMemo(() => filterCatalog(selection), [selection])
  const [customSizeRequested, setCustomSizeRequested] = useState(
    selection.widthMm != null && selection.heightMm != null && !selection.stockId,
  )
  const [customWidth, setCustomWidth] = useState(String(selection.widthMm ?? 40))
  const [customHeight, setCustomHeight] = useState(String(selection.heightMm ?? 20))
  const useCustomSize = customSizeRequested
    || (selection.widthMm != null && selection.heightMm != null && !selection.stockId)
  const customDimensionsValid = parsePositiveMm(customWidth) != null
    && parsePositiveMm(customHeight) != null

  function update(partial: Partial<PrintSetupSelection>) {
    onChange({ ...selection, ...partial })
  }

  function selectCatalogStock(stockId: string) {
    setCustomSizeRequested(false)
    update({ stockId, labelId: undefined, widthMm: undefined, heightMm: undefined })
  }

  function enableCustomSize() {
    const current = selection.stockId ? getStockById(selection.stockId) : undefined
    const widthMm = current?.widthMm ?? selection.widthMm ?? 40
    const heightMm = current?.heightMm ?? selection.heightMm ?? 20
    setCustomSizeRequested(true)
    setCustomWidth(String(widthMm))
    setCustomHeight(String(heightMm))
    update({
      stockId: undefined,
      labelId: undefined,
      widthMm,
      heightMm,
    })
  }

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
          Vial capacity
        </label>
        <VialCapacityControl
          value={normalizeVialCapacityMl(selection.vialCapacityMl)}
          onChange={(vialCapacityMl) => update({ vialCapacityMl })}
        />
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
                value={customWidth}
                onChange={(value) => {
                  setCustomWidth(value)
                  const widthMm = parsePositiveMm(value)
                  if (widthMm != null) {
                    update({ widthMm, stockId: undefined, labelId: undefined })
                  }
                }}
                placeholder="40"
              />
            </div>
            <div style={{ flex: 1 }}>
              <TextInput
                label="Height (mm)"
                value={customHeight}
                onChange={(value) => {
                  setCustomHeight(value)
                  const heightMm = parsePositiveMm(value)
                  if (heightMm != null) {
                    update({ heightMm, stockId: undefined, labelId: undefined })
                  }
                }}
                placeholder="20"
              />
            </div>
          </div>
          <p style={{
            fontSize: '0.75rem',
            color: customDimensionsValid ? 'var(--color-text-muted)' : 'var(--color-danger)',
            margin: '0 0 12px',
          }}>
            {customDimensionsValid
              ? 'Custom size uses rectangular corners and standard padding.'
              : 'Enter a positive width and height.'}
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
