import { useMemo, useState } from 'react'
import { LabelComposer } from './features/label/LabelComposer'
import type { LabelModelInput } from './features/label/labelModel'
import { ControlSidebar } from './features/label/ControlSidebar'
import { LabelStage } from './features/label/LabelStage'
import './App.css'

function getTodayPickerDate(): string {
  return new Date().toISOString().slice(0, 10)
}

function formatDate(value: string): string {
  return value.replaceAll('-', '')
}

// The Ghost Data
function getExampleInput(todayPicker: string): LabelModelInput {
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

// The Real Data: Now 100% empty, including the date
function getEmptyInput(): LabelModelInput {
  return {
    compoundName: '',
    compoundAmount: '',
    reconstitutionAmount: '',
    reconstitutionType: '',
    concentration: '',
    protocolUnits: '',
    protocolAmount: '',
    protocolFrequency: '',
    reconstitutionDate: ''
  }
}

export default function App() {
  const composer = useMemo(() => new LabelComposer(), [])
  const todayPicker = getTodayPickerDate()

  // Start the picker completely empty so the native placeholder shows
  const [selectedDate, setSelectedDate] = useState('')
  const [isFreeTextDate, setIsFreeTextDate] = useState(false)
  const [input, setInput] = useState<LabelModelInput>(getEmptyInput())

  const isPristine = !input.compoundName && !input.compoundAmount &&
    !input.reconstitutionAmount && !input.reconstitutionType &&
    !input.concentration && !input.protocolUnits &&
    !input.protocolAmount && !input.protocolFrequency &&
    !input.reconstitutionDate; // Added date to the pristine check

  const model = composer.compose(isPristine ? getExampleInput(todayPicker) : input)

  function updateField<K extends keyof LabelModelInput>(field: K, value: string) {
    setInput(prev => ({ ...prev, [field]: value }))
  }

  function updateDateFromPicker(value: string) {
    setSelectedDate(value)
    updateField('reconstitutionDate', formatDate(value))
  }

  return (
    // Replaced the inline style block with the CSS class
    <div className="app-container">
      <ControlSidebar
        input={input}
        updateField={updateField}
        selectedDate={selectedDate}
        updateDateFromPicker={updateDateFromPicker}
        isFreeTextDate={isFreeTextDate}
        setIsFreeTextDate={setIsFreeTextDate}
      />
      <LabelStage
        model={model}
        compoundName={input.compoundName}
        isExampleMode={isPristine}
      />
    </div>
  )
}