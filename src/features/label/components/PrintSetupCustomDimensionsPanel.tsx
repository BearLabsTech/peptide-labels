import { DEFAULT_STOCK_ID } from '../../../print/printCatalog'
import { TextInput } from './FormInputs'

export interface PrintSetupCustomDimensionsPanelProps {
  customWidth: string
  customHeight: string
  customDimensionsValid: boolean
  onChangeCustomWidth: (value: string) => void
  onChangeCustomHeight: (value: string) => void
  onSelectCatalogStock: (stockId: string) => void
}

export function PrintSetupCustomDimensionsPanel({
  customWidth,
  customHeight,
  customDimensionsValid,
  onChangeCustomWidth,
  onChangeCustomHeight,
  onSelectCatalogStock,
}: PrintSetupCustomDimensionsPanelProps) {
  return (
    <>
      <div style={{ display: 'flex', gap: '12px' }}>
        <div style={{ flex: 1 }}>
          <TextInput
            label="Width (mm)"
            value={customWidth}
            onChange={onChangeCustomWidth}
            placeholder="40"
          />
        </div>
        <div style={{ flex: 1 }}>
          <TextInput
            label="Height (mm)"
            value={customHeight}
            onChange={onChangeCustomHeight}
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
        onClick={() => onSelectCatalogStock(DEFAULT_STOCK_ID)}
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
  )
}
