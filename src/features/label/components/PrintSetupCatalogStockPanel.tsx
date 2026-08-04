import { DEFAULT_STOCK_ID } from '../../../print/printCatalog'
import type { LabelStock } from '../../../print/types'
import { inputStyle } from './formStyles'

export interface PrintSetupCatalogStockPanelProps {
  stockId: string | undefined
  stocks: readonly LabelStock[]
  recommendedStockIds: readonly string[]
  onSelectStock: (stockId: string) => void
  onEnableCustomSize: () => void
}

export function PrintSetupCatalogStockPanel({
  stockId,
  stocks,
  recommendedStockIds,
  onSelectStock,
  onEnableCustomSize,
}: PrintSetupCatalogStockPanelProps) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
        Label stock
      </label>
      <select
        value={stockId ?? DEFAULT_STOCK_ID}
        onChange={(e) => onSelectStock(e.target.value)}
        style={{ ...inputStyle, cursor: 'pointer' }}
      >
        {stocks.map((stock) => {
          const recommended = recommendedStockIds.includes(stock.id)
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
        onClick={onEnableCustomSize}
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
  )
}
