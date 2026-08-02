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
  | { readonly kind: 'catalog'; readonly stockId: string }
  | {
      readonly kind: 'custom'
      readonly widthMm: number
      readonly heightMm: number
      readonly shape: 'rounded' | 'rectangular'
      readonly cornerRadiusMm: number
      readonly paddingMm: number
    }

/** Axis-aligned box frame in millimetres on the label surface. */
export interface DesignFrame {
  readonly xMm: number
  readonly yMm: number
  readonly widthMm: number
  readonly heightMm: number
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
  readonly key: string
  readonly label: string
  readonly type: DesignSlotValueType
  readonly required: boolean
}

export type DesignTextContent =
  | { readonly kind: 'static'; readonly text: string }
  | { readonly kind: 'slot'; readonly slotKey: string }

export type DesignQrContent =
  | { readonly kind: 'static'; readonly text: string }
  | { readonly kind: 'slot'; readonly slotKey: string }

export interface DesignElementBase {
  readonly id: string
  readonly frame: DesignFrame
  /** Degrees clockwise; 90 / 270 common for vertical side text. */
  readonly rotationDeg: number
  readonly zIndex: number
}

export interface DesignTextElement extends DesignElementBase {
  readonly type: 'text'
  readonly content: DesignTextContent
  /** Id from the curated font list (resolved by the renderer later). */
  readonly fontId: string
  readonly fontSizePt: number
  readonly bold: boolean
  readonly alignH: TextAlignH
  readonly alignV: TextAlignV
  readonly wrap: boolean
  readonly fill: TextFill
  readonly ink: TextInk
}

export interface DesignImageElement extends DesignElementBase {
  readonly type: 'image'
  readonly assetId: string
  readonly objectFit: ImageObjectFit
}

export interface DesignQrElement extends DesignElementBase {
  readonly type: 'qr'
  readonly content: DesignQrContent
}

export interface DesignShapeElement extends DesignElementBase {
  readonly type: 'shape'
  readonly shape: ShapeKind
  readonly stroke: boolean
  readonly fill: boolean
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
  readonly id: string
  readonly mimeType: DesignAssetMimeType
  readonly dataBase64: string
}

export interface DesignDocument {
  readonly schemaVersion: DesignDocumentSchemaVersion
  readonly id: string
  readonly name: string
  readonly createdAt: string
  readonly updatedAt: string
  readonly visibility: DesignVisibility
  readonly stock: DesignStock
  readonly slots: readonly DesignSlot[]
  readonly elements: readonly DesignElement[]
  readonly assets: readonly DesignAsset[]
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
