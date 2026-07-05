import { RangeInput } from './FormInputs'
import type { ColumnWidthBounds } from '../labelLayoutConstants'

export interface ColumnWidthSliderProps {
  label: string
  value: number | undefined
  onChange: (percent: number) => void
  bounds: ColumnWidthBounds
}

export function ColumnWidthSlider({ label, value, onChange, bounds }: ColumnWidthSliderProps) {
  return (
    <RangeInput
      label={label}
      value={value ?? bounds.defaultPercent}
      onChange={onChange}
      min={bounds.minPercent}
      max={bounds.maxPercent}
      formatValue={(v) => `${v}%`}
    />
  )
}
