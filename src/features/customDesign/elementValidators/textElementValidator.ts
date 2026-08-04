import {
  CURATED_DESIGN_FONT_IDS,
  type DesignTextContent,
  type DesignTextElement,
  type TextAlignH,
  type TextAlignV,
  type TextFill,
  type TextInk,
} from '../designDocument'
import {
  type DesignDocumentValidationIssue,
  isFiniteNumber,
  isNonEmptyString,
  isRecord,
  push,
} from '../validationPrimitives'
import {
  type ElementValidationContext,
  type ElementValidator,
  validateElementBase,
  validateTextOrQrContent,
} from './elementValidator'

const ALIGN_H: readonly TextAlignH[] = ['left', 'center', 'right']
const ALIGN_V: readonly TextAlignV[] = ['top', 'middle', 'bottom']
const FILLS: readonly TextFill[] = ['none', 'solid']
const INKS: readonly TextInk[] = ['black', 'reverse']

export const textElementValidator: ElementValidator<DesignTextElement> = {
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

    let ok = validateTextOrQrContent(
      input.content,
      `${context.path}.content`,
      issues,
      context.slotKeys,
    )
    const content = input.content as DesignTextContent

    if (!isNonEmptyString(input.fontId)) {
      push(issues, `${context.path}.fontId`, 'must be a non-empty string')
      ok = false
    } else if (!(CURATED_DESIGN_FONT_IDS as readonly string[]).includes(input.fontId)) {
      push(issues, `${context.path}.fontId`, `unknown curated font id "${input.fontId}"`)
      ok = false
    }
    if (!isFiniteNumber(input.fontSizePt) || input.fontSizePt <= 0) {
      push(issues, `${context.path}.fontSizePt`, 'must be a finite number greater than 0')
      ok = false
    }
    if (typeof input.bold !== 'boolean') {
      push(issues, `${context.path}.bold`, 'must be a boolean')
      ok = false
    }
    if (!ALIGN_H.includes(input.alignH as TextAlignH)) {
      push(issues, `${context.path}.alignH`, 'must be left, center, or right')
      ok = false
    }
    if (!ALIGN_V.includes(input.alignV as TextAlignV)) {
      push(issues, `${context.path}.alignV`, 'must be top, middle, or bottom')
      ok = false
    }
    if (typeof input.wrap !== 'boolean') {
      push(issues, `${context.path}.wrap`, 'must be a boolean')
      ok = false
    }
    if (!FILLS.includes(input.fill as TextFill)) {
      push(issues, `${context.path}.fill`, 'must be none or solid')
      ok = false
    }
    if (!INKS.includes(input.ink as TextInk)) {
      push(issues, `${context.path}.ink`, 'must be black or reverse')
      ok = false
    }

    if (!ok) {
      return { ok: false, error: issues }
    }

    return {
      ok: true,
      value: {
        ...base,
        type: 'text',
        content,
        fontId: input.fontId as string,
        fontSizePt: input.fontSizePt as number,
        bold: input.bold as boolean,
        alignH: input.alignH as TextAlignH,
        alignV: input.alignV as TextAlignV,
        wrap: input.wrap as boolean,
        fill: input.fill as TextFill,
        ink: input.ink as TextInk,
      },
    }
  },
}
