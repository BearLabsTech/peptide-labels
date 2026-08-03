import { ExportLabelUseCase } from '../../app/ExportLabelUseCase'
import { BrowserFileDownloader } from '../../platform/BrowserFileDownloader'
import { CanvasImageProcessor } from '../../platform/CanvasImageProcessor'
import { HtmlToImageRasterizer } from '../../platform/HtmlToImageRasterizer'
import type { PrintTarget } from '../../print/types'

const defaultExportUseCase = new ExportLabelUseCase(
  new HtmlToImageRasterizer(),
  new CanvasImageProcessor(),
  new BrowserFileDownloader(),
)

/** Composition-root entry for label PNG export (preview + apply-design). */
export async function exportLabelPng(
  element: HTMLDivElement,
  printTarget: PrintTarget,
  compoundName?: string,
): Promise<void> {
  await defaultExportUseCase.execute(element, printTarget, compoundName)
}
