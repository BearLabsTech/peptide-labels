import { useMemo, useState } from 'react'
import { LabelComposer } from './features/label/LabelComposer'
import type { LabelModelInput } from './features/label/labelModel'
import { ControlSidebar } from './features/label/ControlSidebar'
import { LabelStage } from './features/label/LabelStage'

function getTodayPickerDate(): string {
  return new Date().toISOString().slice(0, 10)
}

function formatDate(value: string): string {
  return value.replaceAll('-', '')
}

export default function App() {
  const composer = useMemo(() => new LabelComposer(), [])
  const todayPicker = getTodayPickerDate()

  const [selectedDate, setSelectedDate] = useState(todayPicker)
  const [isFreeTextDate, setIsFreeTextDate] = useState(false)
  const [input, setInput] = useState<LabelModelInput>(initialInput(todayPicker))

  const model = composer.compose(input)

  function updateField<K extends keyof LabelModelInput>(field: K, value: string) {
    setInput(prev => ({ ...prev, [field]: value }))
  }

  function updateDateFromPicker(value: string) {
    setSelectedDate(value)
    updateField('reconstitutionDate', formatDate(value))
  }

  return (
    <div style={{
      display: 'flex',
      width: '100%',
      maxWidth: '1280px',
      height: '100vh',
      backgroundColor: 'white',
      boxShadow: '0 0 20px rgba(0,0,0,0.05)'
    }}>
      <ControlSidebar
        input={input}
        updateField={updateField}
        selectedDate={selectedDate}
        updateDateFromPicker={updateDateFromPicker}
        isFreeTextDate={isFreeTextDate}
        setIsFreeTextDate={setIsFreeTextDate}
      />
      <LabelStage model={model} compoundName={input.compoundName} />
    </div>
  )
}

function initialInput(todayPicker: string): LabelModelInput {
  return {
    compoundName: 'Tirzepatide',
    compoundAmount: '20mg',
    reconstitutionAmount: '2ml',
    reconstitutionType: 'BAC',
    concentration: '1mg per 10 units',
    protocolUnits: '40 units', 
    protocolAmount: '4mg',     
    protocolFrequency: 'Weekly',
    reconstitutionDate: formatDate(todayPicker)
  }
}