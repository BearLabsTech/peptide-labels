import {
  DESIGN_DOCUMENT_SCHEMA_VERSION,
  type DesignAsset,
  type DesignAssetMimeType,
  type DesignDocument,
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

export type { DesignDocumentValidationIssue } from './validationPrimitives'

export type DesignDocumentValidationResult =
  | { ok: true; document: DesignDocument }
  | { ok: false; issues: DesignDocumentValidationIssue[] }

const VISIBILITIES: readonly DesignVisibility[] = ['private', 'unlisted', 'public']
const SLOT_TYPES: readonly DesignSlotValueType[] = ['text', 'number', 'url']
const MIME_TYPES: readonly DesignAssetMimeType[] = ['image/png', 'image/jpeg', 'image/webp']

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
    const result = validateElement(
      element,
      { path: `elements[${index}]`, slotKeys, assetIds },
      issues,
    )
    if (!result.ok) return
    if (elementIds.has(result.value.id)) {
      push(issues, `elements[${index}].id`, `duplicate element id "${result.value.id}"`)
    } else {
      elementIds.add(result.value.id)
    }
  })

  if (issues.length > 0) {
    return { ok: false, issues }
  }

  return { ok: true, document: structuredClone(input) as unknown as DesignDocument }
}
