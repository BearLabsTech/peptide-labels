import { useMemo, useState } from 'react'
import { LabelComposer } from './features/label/LabelComposer'
import type { LabelModelInput } from './features/label/labelModel'
import { ControlSidebar } from './features/label/ControlSidebar'
import { LabelStage } from './features/label/LabelStage'
import './App.css'

function getTodayDateString(): string {
  return new Date().toISOString().slice(0, 10)
}

function getExampleInput(today: string): LabelModelInput {
  return {
    compoundName: 'Tirzepatide',
    compoundAmount: '20',
    vialUnit: 'mg',
    vendorName: 'Bear Labs',
    batchNumber: 'BL-2026',
    reconstitutionAmount: '2',
    reconstitutionType: 'BAC Water',
    protocolAmount: '5',
    measureUnit: 'mg',
    protocolFrequency: 'Weekly',
    reconstitutionDate: today,
    dateFormat: 'YYYYMMDD',
    vendorCoa: 'https://github.com'
  }
}

function getEmptyInput(): LabelModelInput {
  return {
    compoundName: '', compoundAmount: '', reconstitutionAmount: '',
    reconstitutionType: '', concentration: '', protocolUnits: '',
    protocolAmount: '', protocolFrequency: '', reconstitutionDate: '',
    measureUnit: 'mcg', vendorCoa: '', groupBuyCoa: '', testGroupCoa: '',
    myCoa: '', customImage: '', isUntested: false, vialUnit: 'mg',
    dateFormat: 'YYYYMMDD'
  }
}

export default function App() {
  const composer = useMemo(() => new LabelComposer(), [])
  const today = getTodayDateString()
  const [input, setInput] = useState<LabelModelInput>(getEmptyInput())

  const isPristine = !input.compoundName && !input.compoundAmount &&
    !input.reconstitutionAmount && !input.protocolAmount &&
    !input.protocolFrequency && !input.reconstitutionDate &&
    !input.reconstitutionType && !input.vendorCoa &&
    !input.groupBuyCoa && !input.myCoa && !input.customImage &&
    !input.isUntested && !input.vendorName;

  let labelInput: LabelModelInput;

  if (isPristine) {
    labelInput = getExampleInput(today);
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

  return (
    <div className="app-container">
      <ControlSidebar input={input} updateField={updateField} />
      <LabelStage model={model} compoundName={input.compoundName} isExampleMode={isPristine} />
    </div>
  )
}