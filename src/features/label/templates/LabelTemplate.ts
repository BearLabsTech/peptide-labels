import type { LabelModelInput, LabelLayoutMode } from '../labelModel'
import type { ResolvedLabelMath } from '../domain/labelMathCore'
import type { LabelRenderModel } from '../labelRenderModel'
import type { LabelLayoutEngine } from '../LabelLayoutEngine'
import type { PrintTarget } from '../print/types'
import { IdentityHeaderTemplate } from './IdentityHeaderTemplate'

/**
 * Template Method skeleton for a label layout. Every template runs the same
 * four steps in order; subclasses supply only the step bodies. Adding a new
 * layout mode is one new class plus a `createLabelTemplate` case — the
 * composer never learns the mode's internals.
 */
export interface LabelTemplate {
  /**
   * Run the fixed skeleton: resolveContent → layoutColumns →
   * layoutTitleAndBody → buildRenderModel.
   */
  render(input: LabelModelInput, resolved: ResolvedLabelMath): LabelRenderModel
}

export interface LabelTemplateDeps {
  readonly printTarget: PrintTarget
  readonly layoutEngine: LabelLayoutEngine
  readonly maxFontSizePx: number
}

/** Factory keyed by layout mode. Today only identity-header ships. */
export function createLabelTemplate(
  mode: LabelLayoutMode,
  deps: LabelTemplateDeps,
): LabelTemplate {
  switch (mode) {
    case 'identityHeader':
      return new IdentityHeaderTemplate(deps)
  }
}
