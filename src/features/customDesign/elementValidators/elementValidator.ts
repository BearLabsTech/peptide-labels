import type {
  DesignElementBase,
  DesignFrame,
  DesignQrContent,
  DesignTextContent,
} from '../designDocument'
import {
  type DesignDocumentValidationIssue,
  isFiniteNumber,
  isNonEmptyString,
  isRecord,
  push,
} from '../validationPrimitives'
import type { Result } from '../../../shared/result'

/** The JSON path prefix and cross-reference sets one element validator needs. */
export interface ElementValidationContext {
  readonly path: string
  readonly slotKeys: ReadonlySet<string>
  readonly assetIds: ReadonlySet<string>
}

/**
 * One kind's rule for turning unknown JSON into a proven element.
 * Dispatch (see `elementValidatorRegistry.ts`) only assumes a `kind` string
 * key and an `unknown` input — a future composite/group validator could
 * recurse into this same registry for its children without changing this
 * interface or the dispatcher.
 */
export interface ElementValidator<T> {
  validate(
    input: unknown,
    context: ElementValidationContext,
  ): Result<T, DesignDocumentValidationIssue[]>
}

export function validateFrame(
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

/**
 * Validates the fields every element kind shares (id, frame, rotation, stack
 * order). Kind-agnostic, so it lives outside the registry rather than being
 * copied into `textElementValidator`, `imageElementValidator`, etc.
 */
export function validateElementBase(
  element: Record<string, unknown>,
  path: string,
  issues: DesignDocumentValidationIssue[],
): DesignElementBase | null {
  if (!isNonEmptyString(element.id)) {
    push(issues, `${path}.id`, 'must be a non-empty string')
    return null
  }
  if (!validateFrame(element.frame, `${path}.frame`, issues)) {
    return null
  }
  if (!isFiniteNumber(element.rotationDeg)) {
    push(issues, `${path}.rotationDeg`, 'must be a finite number')
    return null
  }
  if (!isFiniteNumber(element.zIndex)) {
    push(issues, `${path}.zIndex`, 'must be a finite number')
    return null
  }
  return {
    id: element.id,
    frame: element.frame as DesignFrame,
    rotationDeg: element.rotationDeg,
    zIndex: element.zIndex,
  }
}

/** Shared by `textElementValidator` and `qrElementValidator` — both content shapes are identical. */
export function validateTextOrQrContent(
  content: unknown,
  path: string,
  issues: DesignDocumentValidationIssue[],
  slotKeys: ReadonlySet<string>,
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
