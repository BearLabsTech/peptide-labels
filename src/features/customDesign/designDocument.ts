/**
 * Versioned custom label design document (Slice 0 schema).
 * Source of truth for freeform designs — not HTML.
 */

export const DESIGN_DOCUMENT_SCHEMA_VERSION = 1 as const

export type DesignDocumentSchemaVersion = typeof DESIGN_DOCUMENT_SCHEMA_VERSION

/** Sharing intent. Local-only designs use private until cloud slices ship. */
export type DesignVisibility = 'private' | 'unlisted' | 'public'

export const DEFAULT_DESIGN_VISIBILITY: DesignVisibility = 'private'

/** Catalog stock id from the print catalog, or explicit custom dimensions. */
export type DesignStock =
  | { kind: 'catalog'; stockId: string }
  | {
      kind: 'custom'
      widthMm: number
      heightMm: number
      shape: 'rounded' | 'rectangular'
      cornerRadiusMm: number
      paddingMm: number
    }

/** Axis-aligned box frame in millimetres on the label surface. */
export interface DesignFrame {
  xMm: number
  yMm: number
  widthMm: number
  heightMm: number
}

export type TextAlignH = 'left' | 'center' | 'right'
export type TextAlignV = 'top' | 'middle' | 'bottom'

/** Normal black ink on paper, or reverse (solid fill with unprinted glyphs). */
export type TextInk = 'black' | 'reverse'

/** Background fill for a text box. Solid + reverse ink = inverted band. */
export type TextFill = 'none' | 'solid'

export type ImageObjectFit = 'contain' | 'cover'

export type ShapeKind = 'rect' | 'line'

/**
 * Built-in slot keys aligned with structured label identity / protocol fields.
 * Custom slots use other keys (e.g. author-defined ids).
 */
export const BUILT_IN_SLOT_KEYS = [
  'compoundName',
  'compoundAmount',
  'reconstitutionAmount',
  'concentration',
  'protocolAmount',
  'protocolUnits',
  'protocolFrequency',
  'reconstitutionDate',
  'vendorName',
  'groupBuyName',
  'batchNumber',
  'batchDate',
] as const

export type BuiltInSlotKey = (typeof BUILT_IN_SLOT_KEYS)[number]

export type DesignSlotValueType = 'text' | 'number' | 'url'

export interface DesignSlot {
  key: string
  label: string
  type: DesignSlotValueType
  required: boolean
}

export type DesignTextContent =
  | { kind: 'static'; text: string }
  | { kind: 'slot'; slotKey: string }

export type DesignQrContent =
  | { kind: 'static'; text: string }
  | { kind: 'slot'; slotKey: string }

export interface DesignElementBase {
  id: string
  frame: DesignFrame
  /** Degrees clockwise; 90 / 270 common for vertical side text. */
  rotationDeg: number
  zIndex: number
}

export interface DesignTextElement extends DesignElementBase {
  type: 'text'
  content: DesignTextContent
  /** Id from the curated font list (resolved by the renderer later). */
  fontId: string
  fontSizePt: number
  bold: boolean
  alignH: TextAlignH
  alignV: TextAlignV
  wrap: boolean
  fill: TextFill
  ink: TextInk
}

export interface DesignImageElement extends DesignElementBase {
  type: 'image'
  assetId: string
  objectFit: ImageObjectFit
}

export interface DesignQrElement extends DesignElementBase {
  type: 'qr'
  content: DesignQrContent
}

export interface DesignShapeElement extends DesignElementBase {
  type: 'shape'
  shape: ShapeKind
  stroke: boolean
  fill: boolean
}

export type DesignElement =
  | DesignTextElement
  | DesignImageElement
  | DesignQrElement
  | DesignShapeElement

export type DesignAssetMimeType = 'image/png' | 'image/jpeg' | 'image/webp'

/**
 * Embedded image bytes (no external URLs).
 * `dataBase64` is raw base64 without a `data:` URL prefix.
 */
export interface DesignAsset {
  id: string
  mimeType: DesignAssetMimeType
  dataBase64: string
}

export interface DesignDocument {
  schemaVersion: DesignDocumentSchemaVersion
  id: string
  name: string
  createdAt: string
  updatedAt: string
  visibility: DesignVisibility
  stock: DesignStock
  slots: DesignSlot[]
  elements: DesignElement[]
  assets: DesignAsset[]
}

/** Curated font ids for MVP authoring (renderer maps these later). */
export const CURATED_DESIGN_FONT_IDS = [
  'sans',
  'serif',
  'mono',
  'display',
] as const

export type CuratedDesignFontId = (typeof CURATED_DESIGN_FONT_IDS)[number]

export function isBuiltInSlotKey(key: string): key is BuiltInSlotKey {
  return (BUILT_IN_SLOT_KEYS as readonly string[]).includes(key)
}
