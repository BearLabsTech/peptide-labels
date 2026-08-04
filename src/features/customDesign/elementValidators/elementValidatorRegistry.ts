import type { DesignElement } from '../designDocument'
import { type DesignDocumentValidationIssue, isRecord, push } from '../validationPrimitives'
import type { ElementValidationContext, ElementValidator } from './elementValidator'
import { imageElementValidator } from './imageElementValidator'
import { qrElementValidator } from './qrElementValidator'
import { shapeElementValidator } from './shapeElementValidator'
import { textElementValidator } from './textElementValidator'

export type ElementKind = DesignElement['type']

/**
 * One validator per element kind (Specification/Registry, docs/CODE-QUALITY.md
 * section A). Adding a new kind is a new validator file plus one entry here —
 * no shared discriminating function to edit.
 */
export const ELEMENT_VALIDATORS: Record<ElementKind, ElementValidator<unknown>> = {
  text: textElementValidator,
  image: imageElementValidator,
  qr: qrElementValidator,
  shape: shapeElementValidator,
}

function isElementKind(value: unknown): value is ElementKind {
  return typeof value === 'string' && value in ELEMENT_VALIDATORS
}

/**
 * Dispatches unknown JSON to the validator registered for its `type`, or
 * records an issue if the shape or kind is wrong. A future composite/group
 * element kind's validator could call this function again for its own
 * children — dispatch here does not assume the element list is flat.
 *
 * Failure side is empty on purpose: issues are pushed into the caller-supplied
 * array (validator architecture debt — see docs/TECH-DEBT.md).
 */
export function validateElement(
  input: unknown,
  context: ElementValidationContext,
  issues: DesignDocumentValidationIssue[],
): { ok: true; value: DesignElement } | { ok: false } {
  if (!isRecord(input)) {
    push(issues, context.path, 'must be an object')
    return { ok: false }
  }
  if (!isElementKind(input.type)) {
    push(issues, `${context.path}.type`, 'must be text, image, qr, or shape')
    return { ok: false }
  }

  const validator = ELEMENT_VALIDATORS[input.type]
  const result = validator.validate(input, context)
  if (!result.ok) {
    issues.push(...result.error)
    return { ok: false }
  }
  return { ok: true, value: result.value as DesignElement }
}
