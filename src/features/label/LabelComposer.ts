import type { LabelModelInput } from './labelModel'
import { resolveLabelLayoutMode } from './labelModel'
import { LabelLayoutEngine } from './LabelLayoutEngine'
import { resolveCalculatorState } from './LabelMathResolver'
import { maxFontSizePxForLabelHeight } from './labelLayoutConstants'
import type { PrintTarget } from './print/types'
import { resolvePrintTarget } from './print/PrintTargetResolver'
import { createLabelTemplate } from './templates/LabelTemplate'
import type { LabelRenderModel } from './labelRenderModel'

export type { LabelRenderModel } from './labelRenderModel'

/**
 * Coordinates label composition: resolve calculator state, pick the layout
 * template for the input's mode, and run its Template Method skeleton.
 * Layout math lives on the template — this class does not decide fonts or columns.
 */
export class LabelComposer {
  private readonly layoutEngine: LabelLayoutEngine
  private readonly printTarget: PrintTarget
  private readonly maxFontSizePx: number

  constructor(printTarget: PrintTarget = resolvePrintTarget({})) {
    this.printTarget = printTarget
    this.maxFontSizePx = maxFontSizePxForLabelHeight(printTarget.labelHeightMm)
    this.layoutEngine = new LabelLayoutEngine(printTarget.effectiveDpi, this.maxFontSizePx)
  }

  public compose(rawInput: LabelModelInput): LabelRenderModel {
    const { authored: input, derived: resolved } = resolveCalculatorState(rawInput)
    const template = createLabelTemplate(resolveLabelLayoutMode(input), {
      printTarget: this.printTarget,
      layoutEngine: this.layoutEngine,
      maxFontSizePx: this.maxFontSizePx,
    })
    return template.render(input, resolved)
  }
}
