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

function getExampleInput(todayPicker: string): LabelModelInput {
  return {
    compoundName: 'Tirzepatide',
    compoundAmount: '20',
    vialUnit: 'mg',
    reconstitutionAmount: '2',
    reconstitutionType: 'BAC Water',
    protocolAmount: '5',
    measureUnit: 'mg',
    protocolFrequency: 'Weekly',
    reconstitutionDate: formatDate(todayPicker),
    vendorCoa: 'https://github.com'
  }
}

function getEmptyInput(): LabelModelInput {
  return {
    compoundName: '', compoundAmount: '', reconstitutionAmount: '',
    reconstitutionType: '', concentration: '', protocolUnits: '',
    protocolAmount: '', protocolFrequency: '', reconstitutionDate: '',
    measureUnit: 'mcg', vendorCoa: '', groupCoa: '', myCoa: '', customImage: '',
    isUntested: false, vialUnit: 'mg'
  }
}

export default function App() {
  const composer = useMemo(() => new LabelComposer(), [])
  const todayPicker = getTodayPickerDate()

  const [selectedDate, setSelectedDate] = useState('')
  const [isFreeTextDate, setIsFreeTextDate] = useState(false)
  const [input, setInput] = useState<LabelModelInput>(getEmptyInput())

  const isPristine = !input.compoundName && !input.compoundAmount &&
    !input.reconstitutionAmount && !input.protocolAmount &&
    !input.protocolFrequency && !input.reconstitutionDate &&
    !input.reconstitutionType && !input.vendorCoa &&
    !input.groupCoa && !input.myCoa && !input.customImage &&
    !input.isUntested;

  let labelInput: LabelModelInput;

  if (isPristine) {
    labelInput = getExampleInput(todayPicker);
  } else {
    labelInput = { ...input }
    if (labelInput.reconstitutionAmount && !labelInput.reconstitutionAmount.includes('ml')) {
      labelInput.reconstitutionAmount = `${labelInput.reconstitutionAmount}ml`
    }
  }

  const model = composer.compose(labelInput)

  function updateField<K extends keyof LabelModelInput>(field: K, value: any) {
    setInput(prev => ({ ...prev, [field]: value }))
  }

  function updateDateFromPicker(value: string) {
    setSelectedDate(value)
    updateField('reconstitutionDate', formatDate(value))
  }

  return (
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