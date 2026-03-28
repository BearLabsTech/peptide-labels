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
    doseUnit: 'mg',
    vendorCoa: 'https://github.com'
  }
}

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
    reconstitutionDate: '',
    doseUnit: 'mcg',
    vendorCoa: '',
    groupCoa: '',
    myCoa: '',
    customImage: '',
    isUntested: false
  }
}

export default function App() {
  const composer = useMemo(() => new LabelComposer(), [])
  const todayPicker = getTodayPickerDate()

  const [selectedDate, setSelectedDate] = useState('')
  const [isFreeTextDate, setIsFreeTextDate] = useState(false)
  const [input, setInput] = useState<LabelModelInput>(getEmptyInput())

  // Updated: isUntested now counts as user activity
  const isPristine = !input.compoundName && !input.compoundAmount &&
    !input.reconstitutionAmount && !input.protocolAmount &&
    !input.protocolFrequency && !input.reconstitutionDate &&
    !input.reconstitutionType && !input.vendorCoa &&
    !input.groupCoa && !input.myCoa && !input.customImage &&
    !input.isUntested;

  // 1. Run the math engine
  const vialMg = parseFloat(input.compoundAmount || '0')
  const waterMl = parseFloat(input.reconstitutionAmount || '0')
  const doseAmount = parseFloat(input.protocolAmount || '0')
  const doseUnit = input.doseUnit || 'mcg'

  const mathResult = isPristine ? null : calculateDrawVolume({ vialMg, waterMl, doseAmount, doseUnit })

  // 2. Prepare Sidebar Input
  const sidebarInput = {
    ...input,
    protocolUnits: mathResult ? `${mathResult.drawUnits} units` : '',
    concentration: mathResult ? `${mathResult.concentrationMgPerMl}mg per ml` : ''
  }

  // 3. Prepare Label Input
  let labelInput: LabelModelInput;

  if (isPristine) {
    labelInput = getExampleInput(todayPicker);
  } else {
    labelInput = { ...sidebarInput }
    if (labelInput.compoundAmount) labelInput.compoundAmount = `${labelInput.compoundAmount}mg`
    if (labelInput.reconstitutionAmount) labelInput.reconstitutionAmount = `${labelInput.reconstitutionAmount}ml`
    if (labelInput.protocolAmount) labelInput.protocolAmount = `${labelInput.protocolAmount}${doseUnit}`
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
        input={sidebarInput}
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