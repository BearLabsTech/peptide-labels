import type {
  FileDownloader,
  ImageProcessor,
  Rasterizer,
} from '../shared/ports'
import { buildExportSpec } from '../print/exportSpec'
import type { PrintTarget } from '../print/types'
import { exportFileName } from './exportFileName'

/**
 * Facade over rasterize → monochrome → download. Depends only on port
 * interfaces so the happy path is unit-testable with in-memory fakes.
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
  ): Promise<void> {
    const spec = buildExportSpec(printTarget)
    const captured = await this.rasterizer.capture(element, spec)
    const monochrome = await this.imageProcessor.toMonochrome(captured, spec.dpi)
    this.fileDownloader.download(monochrome, exportFileName(compoundName))
  }
}
