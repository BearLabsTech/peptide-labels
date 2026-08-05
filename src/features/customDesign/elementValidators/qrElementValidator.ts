import { err, ok } from '../../../shared/result'
import type { DesignQrContent, DesignQrElement } from '../designDocument'
import { type DesignDocumentValidationIssue, isRecord, push } from '../validationPrimitives'
import {
  type ElementValidationContext,
  type ElementValidator,
  validateElementBase,
  validateTextOrQrContent,
} from './elementValidator'

export const qrElementValidator: ElementValidator<DesignQrElement> = {
  validate(input: unknown, context: ElementValidationContext) {
    const issues: DesignDocumentValidationIssue[] = []
    if (!isRecord(input)) {
      push(issues, context.path, 'must be an object')
      return err(issues)
    }

    const base = validateElementBase(input, context.path, issues)
    if (!base) {
      return err(issues)
    }

    if (!validateTextOrQrContent(input.content, `${context.path}.content`, issues, context.slotKeys)) {
      return err(issues)
    }

    return ok({ ...base, type: 'qr', content: input.content as DesignQrContent })
  },
}
