import type {
  FileDownloader,
  ImageProcessor,
  Rasterizer,
} from '../shared/ports'
import { buildExportSpec } from '../print/exportSpec'
import type { PrintTarget } from '../print/types'
import type { Result } from '../shared/result'
import { err, ok } from '../shared/result'
import { exportFileName } from './exportFileName'

export const LABEL_EXPORT_ERROR_MESSAGE = 'Couldn’t download the label. Try again.'

/**
 * Facade over rasterize → monochrome → download. Depends only on port
 * interfaces so the happy path is unit-testable with in-memory fakes.
 * Converts port rejections into a user-facing Result once at this boundary.
 */
export class ExportLabelUseCase {
  private readonly rasterizer: Rasterizer
  private readonly imageProcessor: ImageProcessor
  private readonly fileDownloader: FileDownloader

  constructor(
    rasterizer: Rasterizer,
    imageProcessor: ImageProcessor,
    fileDownloader: FileDownloader,
  ) {
    this.rasterizer = rasterizer
    this.imageProcessor = imageProcessor
    this.fileDownloader = fileDownloader
  }

  async execute(
    element: HTMLElement,
    printTarget: PrintTarget,
    compoundName?: string,
  ): Promise<Result<void, string>> {
    try {
      const spec = buildExportSpec(printTarget)
      const captured = await this.rasterizer.capture(element, spec)
      const monochrome = await this.imageProcessor.toMonochrome(captured, spec.dpi)
      this.fileDownloader.download(monochrome, exportFileName(compoundName))
      return ok()
    } catch (error) {
      console.error('Label PNG export failed', error)
      return err(LABEL_EXPORT_ERROR_MESSAGE)
    }
  }
}
