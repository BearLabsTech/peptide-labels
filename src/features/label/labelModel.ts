export interface LabelModel {
  lines: string[]
}

export interface LabelModelInput {
  compoundName?: string
  compoundAmount?: string
  vialUnit?: 'mg' | 'IU'
  reconstitutionAmount?: string
  reconstitutionType?: string
  concentration?: string

  protocolUnits?: string
  protocolAmount?: string
  protocolFrequency?: string

  reconstitutionDate?: string
  reconstitutionDateIsFreeText?: boolean
  measureUnit?: 'mg' | 'mcg' | 'IU'

  // Global Settings
  dateFormat?: 'YYYYMMDD' | 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD'

  // Source Info
  vendorName?: string
  groupBuyName?: string
  batchNumber?: string
  batchDate?: string
  batchDateIsFreeText?: boolean

  // COA Links
  vendorCoa?: string
  groupBuyCoa?: string
  testGroupCoa?: string
  myCoa?: string
  customCoa1Name?: string
  customCoa1Link?: string
  customCoa2Name?: string
  customCoa2Link?: string

  // Media
  customImage?: string

  // Status
  isUntested?: boolean
}