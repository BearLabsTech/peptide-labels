import {
  DESIGN_DOCUMENT_SCHEMA_VERSION,
  type DesignAsset,
  type DesignAssetMimeType,
  type DesignDocument,
  type DesignElement,
  type DesignSlot,
  type DesignSlotValueType,
  type DesignStock,
  type DesignVisibility,
} from './designDocument'
import { validateElement } from './elementValidators/elementValidatorRegistry'
import {
  type DesignDocumentValidationIssue,
  isFiniteNumber,
  isNonEmptyString,
  isRecord,
  push,
} from './validationPrimitives'
import type { Result } from '../../shared/result'

export type { DesignDocumentValidationIssue } from './validationPrimitives'

export type DesignDocumentValidationResult = Result<
  DesignDocument,
  DesignDocumentValidationIssue[]
>

const VISIBILITIES: readonly DesignVisibility[] = ['private', 'unlisted', 'public']
const SLOT_TYPES: readonly DesignSlotValueType[] = ['text', 'number', 'url']
const MIME_TYPES: readonly DesignAssetMimeType[] = ['image/png', 'image/jpeg', 'image/webp']

function validateStock(
  stock: unknown,
  path: string,
  issues: DesignDocumentValidationIssue[],
): DesignStock | null {
  if (!isRecord(stock)) {
    push(issues, path, 'must be an object')
    return null
  }
  if (stock.kind === 'catalog') {
    if (!isNonEmptyString(stock.stockId)) {
      push(issues, `${path}.stockId`, 'must be a non-empty string')
      return null
    }
    return { kind: 'catalog', stockId: stock.stockId }
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
    if (!ok) return null
    return {
      kind: 'custom',
      widthMm: stock.widthMm as number,
      heightMm: stock.heightMm as number,
      shape: stock.shape as 'rounded' | 'rectangular',
      cornerRadiusMm: stock.cornerRadiusMm as number,
      paddingMm: stock.paddingMm as number,
    }
  }
  push(issues, `${path}.kind`, 'must be catalog or custom')
  return null
}

function validateSlot(
  slot: unknown,
  path: string,
  issues: DesignDocumentValidationIssue[],
): DesignSlot | null {
  if (!isRecord(slot)) {
    push(issues, path, 'must be an object')
    return null
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
  if (!ok) return null
  return {
    key: slot.key as string,
    label: slot.label as string,
    type: slot.type as DesignSlotValueType,
    required: slot.required as boolean,
  }
}

function validateAsset(
  asset: unknown,
  path: string,
  issues: DesignDocumentValidationIssue[],
): DesignAsset | null {
  if (!isRecord(asset)) {
    push(issues, path, 'must be an object')
    return null
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
  if (!ok) return null
  return {
    id: asset.id as string,
    mimeType: asset.mimeType as DesignAssetMimeType,
    dataBase64: asset.dataBase64 as string,
  }
}

/**
 * Validates unknown JSON-shaped input into a DesignDocument.
 * Rejects external image URLs and dangling slot/asset references.
 * Builds a fresh typed document from proven fields — never returns the caller's input.
 */
export function validateDesignDocument(input: unknown): DesignDocumentValidationResult {
  const issues: DesignDocumentValidationIssue[] = []

  if (!isRecord(input)) {
    return { ok: false, error: [{ path: '', message: 'document must be an object' }] }
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

  const stock = validateStock(input.stock, 'stock', issues)

  if (!Array.isArray(input.slots)) {
    push(issues, 'slots', 'must be an array')
  }
  if (!Array.isArray(input.elements)) {
    push(issues, 'elements', 'must be an array')
  }
  if (!Array.isArray(input.assets)) {
    push(issues, 'assets', 'must be an array')
  }

  // Each collection pass is independently guarded (rather than relying on an
  // early return above) so a bad top-level field or stock does not hide
  // slot/asset/element issues discovered later in the same input.
  const slots: DesignSlot[] = []
  const slotKeys = new Set<string>()
  if (Array.isArray(input.slots)) {
    input.slots.forEach((slot, index) => {
      const validated = validateSlot(slot, `slots[${index}]`, issues)
      if (!validated) return
      if (slotKeys.has(validated.key)) {
        push(issues, `slots[${index}].key`, `duplicate slot key "${validated.key}"`)
        return
      }
      slotKeys.add(validated.key)
      slots.push(validated)
    })
  }

  const assets: DesignAsset[] = []
  const assetIds = new Set<string>()
  if (Array.isArray(input.assets)) {
    input.assets.forEach((asset, index) => {
      const validated = validateAsset(asset, `assets[${index}]`, issues)
      if (!validated) return
      if (assetIds.has(validated.id)) {
        push(issues, `assets[${index}].id`, `duplicate asset id "${validated.id}"`)
        return
      }
      assetIds.add(validated.id)
      assets.push(validated)
    })
  }

  const elements: DesignElement[] = []
  const elementIds = new Set<string>()
  if (Array.isArray(input.elements)) {
    input.elements.forEach((element, index) => {
      const result = validateElement(
        element,
        { path: `elements[${index}]`, slotKeys, assetIds },
        issues,
      )
      if (!result.ok) return
      if (elementIds.has(result.value.id)) {
        push(issues, `elements[${index}].id`, `duplicate element id "${result.value.id}"`)
        return
      }
      elementIds.add(result.value.id)
      elements.push(result.value)
    })
  }

  if (issues.length > 0 || stock === null) {
    return { ok: false, error: issues }
  }

  const document: DesignDocument = {
    schemaVersion: DESIGN_DOCUMENT_SCHEMA_VERSION,
    id: input.id as string,
    name: input.name as string,
    createdAt: input.createdAt as string,
    updatedAt: input.updatedAt as string,
    visibility: input.visibility as DesignVisibility,
    stock,
    slots,
    elements,
    assets,
  }

  return { ok: true, value: document }
}
