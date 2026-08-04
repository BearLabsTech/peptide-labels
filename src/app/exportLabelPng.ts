import { ExportLabelUseCase } from './ExportLabelUseCase'
import { BrowserFileDownloader } from '../platform/BrowserFileDownloader'
import { CanvasImageProcessor } from '../platform/CanvasImageProcessor'
import { HtmlToImageRasterizer } from '../platform/HtmlToImageRasterizer'
import type { PrintTarget } from '../print/types'
import type { Result } from '../shared/result'

const defaultExportUseCase = new ExportLabelUseCase(
  new HtmlToImageRasterizer(),
  new CanvasImageProcessor(),
  new BrowserFileDownloader(),
)

/**
 * Composition-root entry for label PNG export (structured designer + apply-design).
 * Both features call this — neither duplicates the html-to-image → monochrome → download sequence.
 */
export async function exportLabelPng(
  element: HTMLDivElement,
  printTarget: PrintTarget,
  compoundName?: string,
): Promise<Result<void, string>> {
  return defaultExportUseCase.execute(element, printTarget, compoundName)
}
