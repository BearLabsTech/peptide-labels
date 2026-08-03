import type { DesignImageElement, ImageObjectFit } from '../designDocument'
import {
  type DesignDocumentValidationIssue,
  isNonEmptyString,
  isRecord,
  push,
} from '../validationPrimitives'
import {
  type ElementValidationContext,
  type ElementValidator,
  validateElementBase,
} from './elementValidator'

const OBJECT_FITS: readonly ImageObjectFit[] = ['contain', 'cover']

export const imageElementValidator: ElementValidator<DesignImageElement> = {
  validate(input: unknown, context: ElementValidationContext) {
    const issues: DesignDocumentValidationIssue[] = []
    if (!isRecord(input)) {
      push(issues, context.path, 'must be an object')
      return { ok: false, issues }
    }

    const base = validateElementBase(input, context.path, issues)
    if (!base) {
      return { ok: false, issues }
    }

    let ok = true
    if (!isNonEmptyString(input.assetId)) {
      push(issues, `${context.path}.assetId`, 'must be a non-empty string')
      ok = false
    } else if (!context.assetIds.has(input.assetId)) {
      push(issues, `${context.path}.assetId`, `unknown asset id "${input.assetId}"`)
      ok = false
    }
    if (!OBJECT_FITS.includes(input.objectFit as ImageObjectFit)) {
      push(issues, `${context.path}.objectFit`, 'must be contain or cover')
      ok = false
    }

    if (!ok) {
      return { ok: false, issues }
    }

    return {
      ok: true,
      value: {
        ...base,
        type: 'image',
        assetId: input.assetId as string,
        objectFit: input.objectFit as ImageObjectFit,
      },
    }
  },
}
