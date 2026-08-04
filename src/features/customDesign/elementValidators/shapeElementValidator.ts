import type { DesignShapeElement, ShapeKind } from '../designDocument'
import { type DesignDocumentValidationIssue, isRecord, push } from '../validationPrimitives'
import {
  type ElementValidationContext,
  type ElementValidator,
  validateElementBase,
} from './elementValidator'

const SHAPES: readonly ShapeKind[] = ['rect', 'line']

export const shapeElementValidator: ElementValidator<DesignShapeElement> = {
  validate(input: unknown, context: ElementValidationContext) {
    const issues: DesignDocumentValidationIssue[] = []
    if (!isRecord(input)) {
      push(issues, context.path, 'must be an object')
      return { ok: false, error: issues }
    }

    const base = validateElementBase(input, context.path, issues)
    if (!base) {
      return { ok: false, error: issues }
    }

    let ok = true
    if (!SHAPES.includes(input.shape as ShapeKind)) {
      push(issues, `${context.path}.shape`, 'must be rect or line')
      ok = false
    }
    if (typeof input.stroke !== 'boolean') {
      push(issues, `${context.path}.stroke`, 'must be a boolean')
      ok = false
    }
    if (typeof input.fill !== 'boolean') {
      push(issues, `${context.path}.fill`, 'must be a boolean')
      ok = false
    }

    if (!ok) {
      return { ok: false, error: issues }
    }

    return {
      ok: true,
      value: {
        ...base,
        type: 'shape',
        shape: input.shape as ShapeKind,
        stroke: input.stroke as boolean,
        fill: input.fill as boolean,
      },
    }
  },
}
