import {
  CURATED_DESIGN_FONT_IDS,
  DESIGN_DOCUMENT_SCHEMA_VERSION,
  type DesignAsset,
  type DesignAssetMimeType,
  type DesignDocument,
  type DesignElement,
  type DesignFrame,
  type DesignQrContent,
  type DesignSlot,
  type DesignSlotValueType,
  type DesignStock,
  type DesignTextContent,
  type DesignVisibility,
  type ImageObjectFit,
  type ShapeKind,
  type TextAlignH,
  type TextAlignV,
  type TextFill,
  type TextInk,
} from './designDocument'

export type DesignDocumentValidationIssue = {
  path: string
  message: string
}

export type DesignDocumentValidationResult =
  | { ok: true; document: DesignDocument }
  | { ok: false; issues: DesignDocumentValidationIssue[] }

const VISIBILITIES: readonly DesignVisibility[] = ['private', 'unlisted', 'public']
const SLOT_TYPES: readonly DesignSlotValueType[] = ['text', 'number', 'url']
const ALIGN_H: readonly TextAlignH[] = ['left', 'center', 'right']
const ALIGN_V: readonly TextAlignV[] = ['top', 'middle', 'bottom']
const FILLS: readonly TextFill[] = ['none', 'solid']
const INKS: readonly TextInk[] = ['black', 'reverse']
const OBJECT_FITS: readonly ImageObjectFit[] = ['contain', 'cover']
const SHAPES: readonly ShapeKind[] = ['rect', 'line']
const MIME_TYPES: readonly DesignAssetMimeType[] = ['image/png', 'image/jpeg', 'image/webp']
const ELEMENT_TYPES = ['text', 'image', 'qr', 'shape'] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function push(
  issues: DesignDocumentValidationIssue[],
  path: string,
  message: string,
): void {
  issues.push({ path, message })
}

function validateFrame(
  frame: unknown,
  path: string,
  issues: DesignDocumentValidationIssue[],
): frame is DesignFrame {
  if (!isRecord(frame)) {
    push(issues, path, 'must be an object')
    return false
  }
  let ok = true
  for (const key of ['xMm', 'yMm', 'widthMm', 'heightMm'] as const) {
    if (!isFiniteNumber(frame[key])) {
      push(issues, `${path}.${key}`, 'must be a finite number')
      ok = false
    }
  }
  if (ok && (frame.widthMm as number) <= 0) {
    push(issues, `${path}.widthMm`, 'must be greater than 0')
    ok = false
  }
  if (ok && (frame.heightMm as number) <= 0) {
    push(issues, `${path}.heightMm`, 'must be greater than 0')
    ok = false
  }
  return ok
}

function validateStock(
  stock: unknown,
  path: string,
  issues: DesignDocumentValidationIssue[],
): stock is DesignStock {
  if (!isRecord(stock)) {
    push(issues, path, 'must be an object')
    return false
  }
  if (stock.kind === 'catalog') {
    if (!isNonEmptyString(stock.stockId)) {
      push(issues, `${path}.stockId`, 'must be a non-empty string')
      return false
    }
    return true
  }
  if (stock.kind === 'custom') {
    let ok = true
    for (const key of ['widthMm', 'heightMm', 'cornerRadiusMm', 'paddingMm'] as const) {
      if (!isFiniteNumber(stock[key])) {
        push(issues, `${path}.${key}`, 'must be a finite number')
        ok = false
      }
    }
    if (stock.shape !== 'rounded' && stock.shape !== 'rectangular') {
      push(issues, `${path}.shape`, 'must be rounded or rectangular')
      ok = false
    }
    if (ok && (stock.widthMm as number) <= 0) {
      push(issues, `${path}.widthMm`, 'must be greater than 0')
      ok = false
    }
    if (ok && (stock.heightMm as number) <= 0) {
      push(issues, `${path}.heightMm`, 'must be greater than 0')
      ok = false
    }
    if (ok && (stock.cornerRadiusMm as number) < 0) {
      push(issues, `${path}.cornerRadiusMm`, 'must be >= 0')
      ok = false
    }
    if (ok && (stock.paddingMm as number) < 0) {
      push(issues, `${path}.paddingMm`, 'must be >= 0')
      ok = false
    }
    return ok
  }
  push(issues, `${path}.kind`, 'must be catalog or custom')
  return false
}

function validateSlot(
  slot: unknown,
  path: string,
  issues: DesignDocumentValidationIssue[],
): slot is DesignSlot {
  if (!isRecord(slot)) {
    push(issues, path, 'must be an object')
    return false
  }
  let ok = true
  if (!isNonEmptyString(slot.key)) {
    push(issues, `${path}.key`, 'must be a non-empty string')
    ok = false
  }
  if (!isNonEmptyString(slot.label)) {
    push(issues, `${path}.label`, 'must be a non-empty string')
    ok = false
  }
  if (!SLOT_TYPES.includes(slot.type as DesignSlotValueType)) {
    push(issues, `${path}.type`, 'must be text, number, or url')
    ok = false
  }
  if (typeof slot.required !== 'boolean') {
    push(issues, `${path}.required`, 'must be a boolean')
    ok = false
  }
  return ok
}

function validateTextOrQrContent(
  content: unknown,
  path: string,
  issues: DesignDocumentValidationIssue[],
  slotKeys: Set<string>,
): content is DesignTextContent | DesignQrContent {
  if (!isRecord(content)) {
    push(issues, path, 'must be an object')
    return false
  }
  if (content.kind === 'static') {
    if (typeof content.text !== 'string') {
      push(issues, `${path}.text`, 'must be a string')
      return false
    }
    return true
  }
  if (content.kind === 'slot') {
    if (!isNonEmptyString(content.slotKey)) {
      push(issues, `${path}.slotKey`, 'must be a non-empty string')
      return false
    }
    if (!slotKeys.has(content.slotKey)) {
      push(issues, `${path}.slotKey`, `unknown slot key "${content.slotKey}"`)
      return false
    }
    return true
  }
  push(issues, `${path}.kind`, 'must be static or slot')
  return false
}

function validateElement(
  element: unknown,
  path: string,
  issues: DesignDocumentValidationIssue[],
  slotKeys: Set<string>,
  assetIds: Set<string>,
): element is DesignElement {
  if (!isRecord(element)) {
    push(issues, path, 'must be an object')
    return false
  }
  if (!isNonEmptyString(element.id)) {
    push(issues, `${path}.id`, 'must be a non-empty string')
    return false
  }
  if (!validateFrame(element.frame, `${path}.frame`, issues)) {
    return false
  }
  if (!isFiniteNumber(element.rotationDeg)) {
    push(issues, `${path}.rotationDeg`, 'must be a finite number')
    return false
  }
  if (!isFiniteNumber(element.zIndex)) {
    push(issues, `${path}.zIndex`, 'must be a finite number')
    return false
  }
  if (!ELEMENT_TYPES.includes(element.type as (typeof ELEMENT_TYPES)[number])) {
    push(issues, `${path}.type`, 'must be text, image, qr, or shape')
    return false
  }

  if (element.type === 'text') {
    let ok = validateTextOrQrContent(element.content, `${path}.content`, issues, slotKeys)
    if (!isNonEmptyString(element.fontId)) {
      push(issues, `${path}.fontId`, 'must be a non-empty string')
      ok = false
    } else if (!(CURATED_DESIGN_FONT_IDS as readonly string[]).includes(element.fontId)) {
      push(issues, `${path}.fontId`, `unknown curated font id "${element.fontId}"`)
      ok = false
    }
    if (!isFiniteNumber(element.fontSizePt) || (element.fontSizePt as number) <= 0) {
      push(issues, `${path}.fontSizePt`, 'must be a finite number greater than 0')
      ok = false
    }
    if (typeof element.bold !== 'boolean') {
      push(issues, `${path}.bold`, 'must be a boolean')
      ok = false
    }
    if (!ALIGN_H.includes(element.alignH as TextAlignH)) {
      push(issues, `${path}.alignH`, 'must be left, center, or right')
      ok = false
    }
    if (!ALIGN_V.includes(element.alignV as TextAlignV)) {
      push(issues, `${path}.alignV`, 'must be top, middle, or bottom')
      ok = false
    }
    if (typeof element.wrap !== 'boolean') {
      push(issues, `${path}.wrap`, 'must be a boolean')
      ok = false
    }
    if (!FILLS.includes(element.fill as TextFill)) {
      push(issues, `${path}.fill`, 'must be none or solid')
      ok = false
    }
    if (!INKS.includes(element.ink as TextInk)) {
      push(issues, `${path}.ink`, 'must be black or reverse')
      ok = false
    }
    return ok
  }

  if (element.type === 'image') {
    let ok = true
    if (!isNonEmptyString(element.assetId)) {
      push(issues, `${path}.assetId`, 'must be a non-empty string')
      ok = false
    } else if (!assetIds.has(element.assetId)) {
      push(issues, `${path}.assetId`, `unknown asset id "${element.assetId}"`)
      ok = false
    }
    if (!OBJECT_FITS.includes(element.objectFit as ImageObjectFit)) {
      push(issues, `${path}.objectFit`, 'must be contain or cover')
      ok = false
    }
    return ok
  }

  if (element.type === 'qr') {
    return validateTextOrQrContent(element.content, `${path}.content`, issues, slotKeys)
  }

  // shape
  let ok = true
  if (!SHAPES.includes(element.shape as ShapeKind)) {
    push(issues, `${path}.shape`, 'must be rect or line')
    ok = false
  }
  if (typeof element.stroke !== 'boolean') {
    push(issues, `${path}.stroke`, 'must be a boolean')
    ok = false
  }
  if (typeof element.fill !== 'boolean') {
    push(issues, `${path}.fill`, 'must be a boolean')
    ok = false
  }
  return ok
}

function validateAsset(
  asset: unknown,
  path: string,
  issues: DesignDocumentValidationIssue[],
): asset is DesignAsset {
  if (!isRecord(asset)) {
    push(issues, path, 'must be an object')
    return false
  }
  let ok = true
  if (!isNonEmptyString(asset.id)) {
    push(issues, `${path}.id`, 'must be a non-empty string')
    ok = false
  }
  if (!MIME_TYPES.includes(asset.mimeType as DesignAssetMimeType)) {
    push(issues, `${path}.mimeType`, 'must be image/png, image/jpeg, or image/webp')
    ok = false
  }
  if (typeof asset.dataBase64 !== 'string' || asset.dataBase64.length === 0) {
    push(issues, `${path}.dataBase64`, 'must be a non-empty base64 string')
    ok = false
  } else if (asset.dataBase64.includes('://') || asset.dataBase64.startsWith('data:')) {
    push(issues, `${path}.dataBase64`, 'must be raw base64, not a URL or data URI')
    ok = false
  }
  return ok
}

/**
 * Validates unknown JSON-shaped input into a DesignDocument.
 * Rejects external image URLs and dangling slot/asset references.
 */
export function validateDesignDocument(input: unknown): DesignDocumentValidationResult {
  const issues: DesignDocumentValidationIssue[] = []

  if (!isRecord(input)) {
    return { ok: false, issues: [{ path: '', message: 'document must be an object' }] }
  }

  if (input.schemaVersion !== DESIGN_DOCUMENT_SCHEMA_VERSION) {
    push(
      issues,
      'schemaVersion',
      `must be ${DESIGN_DOCUMENT_SCHEMA_VERSION}`,
    )
  }
  if (!isNonEmptyString(input.id)) {
    push(issues, 'id', 'must be a non-empty string')
  }
  if (!isNonEmptyString(input.name)) {
    push(issues, 'name', 'must be a non-empty string')
  }
  if (!isNonEmptyString(input.createdAt)) {
    push(issues, 'createdAt', 'must be a non-empty ISO timestamp string')
  }
  if (!isNonEmptyString(input.updatedAt)) {
    push(issues, 'updatedAt', 'must be a non-empty ISO timestamp string')
  }
  if (!VISIBILITIES.includes(input.visibility as DesignVisibility)) {
    push(issues, 'visibility', 'must be private, unlisted, or public')
  }

  validateStock(input.stock, 'stock', issues)

  if (!Array.isArray(input.slots)) {
    push(issues, 'slots', 'must be an array')
  }
  if (!Array.isArray(input.elements)) {
    push(issues, 'elements', 'must be an array')
  }
  if (!Array.isArray(input.assets)) {
    push(issues, 'assets', 'must be an array')
  }

  if (issues.length > 0) {
    return { ok: false, issues }
  }

  const slots = input.slots as unknown[]
  const assets = input.assets as unknown[]
  const elements = input.elements as unknown[]

  const slotKeys = new Set<string>()
  slots.forEach((slot, index) => {
    if (!validateSlot(slot, `slots[${index}]`, issues)) return
    if (slotKeys.has(slot.key)) {
      push(issues, `slots[${index}].key`, `duplicate slot key "${slot.key}"`)
      return
    }
    slotKeys.add(slot.key)
  })

  const assetIds = new Set<string>()
  assets.forEach((asset, index) => {
    if (!validateAsset(asset, `assets[${index}]`, issues)) return
    if (assetIds.has(asset.id)) {
      push(issues, `assets[${index}].id`, `duplicate asset id "${asset.id}"`)
      return
    }
    assetIds.add(asset.id)
  })

  const elementIds = new Set<string>()
  elements.forEach((element, index) => {
    if (!validateElement(element, `elements[${index}]`, issues, slotKeys, assetIds)) return
    if (elementIds.has(element.id)) {
      push(issues, `elements[${index}].id`, `duplicate element id "${element.id}"`)
    } else {
      elementIds.add(element.id)
    }
  })

  if (issues.length > 0) {
    return { ok: false, issues }
  }

  return { ok: true, document: structuredClone(input) as unknown as DesignDocument }
}
