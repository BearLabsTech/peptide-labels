import { useMemo, useState } from 'react'
import { LabelComposer } from './features/label/LabelComposer'
import type { LabelModelInput } from './features/label/labelModel'
import { ControlSidebar } from './features/label/ControlSidebar'
import { LabelStage } from './features/label/LabelStage'
import { calculateDrawVolume } from './features/label/peptideMath'
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
    compoundAmount: '20mg',
    reconstitutionAmount: '2ml',
    reconstitutionType: 'BAC Water',
    concentration: '10mg per ml',
    protocolUnits: '25 units',
    protocolAmount: '5mg',
    protocolFrequency: 'Weekly',
    reconstitutionDate: formatDate(todayPicker),
    doseUnit: 'mg'
  }
}

function getEmptyInput(): LabelModelInput {
  return {
    compoundName: '',
    compoundAmount: '',
    reconstitutionAmount: '',
    reconstitutionType: '', // CHANGED: Now starts empty so it doesn't clutter the label
    concentration: '',
    protocolUnits: '',
    protocolAmount: '',
    protocolFrequency: '',
    reconstitutionDate: '',
    doseUnit: 'mcg'
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
    !input.reconstitutionType; // Added to pristine check

  let activeInput = isPristine ? getExampleInput(todayPicker) : { ...input }

  if (!isPristine) {
    const vialMg = parseFloat(input.compoundAmount || '0')
    const waterMl = parseFloat(input.reconstitutionAmount || '0')
    const doseAmount = parseFloat(input.protocolAmount || '0')
    const doseUnit = input.doseUnit || 'mcg'

    const mathResult = calculateDrawVolume({ vialMg, waterMl, doseAmount, doseUnit })

    if (input.compoundAmount) activeInput.compoundAmount = `${input.compoundAmount}mg`
    if (input.reconstitutionAmount) activeInput.reconstitutionAmount = `${input.reconstitutionAmount}ml`
    if (input.protocolAmount) activeInput.protocolAmount = `${input.protocolAmount}${doseUnit}`

    if (mathResult) {
      activeInput.protocolUnits = `${mathResult.drawUnits} units`
      activeInput.concentration = `${mathResult.concentrationMgPerMl}mg per ml`

      input.protocolUnits = activeInput.protocolUnits;
      input.concentration = activeInput.concentration;
    } else {
      input.protocolUnits = '';
      input.concentration = '';
    }
  }

  const model = composer.compose(activeInput)

  function updateField<K extends keyof LabelModelInput>(field: K, value: string) {
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