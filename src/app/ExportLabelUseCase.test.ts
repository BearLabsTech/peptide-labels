import { describe, expect, it, vi } from 'vitest'
import type {
  FileDownloader,
  ImageProcessor,
  PngBytes,
  Rasterizer,
} from '../features/label/domain/ports'
import { buildExportSpec } from '../print/exportSpec'
import { resolvePrintTarget } from '../print/PrintTargetResolver'
import { ExportLabelUseCase } from './ExportLabelUseCase'

describe('ExportLabelUseCase', () => {
  it('should rasterize, convert to monochrome at the export DPI, and download with the compound filename', async () => {
    const printTarget = resolvePrintTarget({ stockId: '40x20-rounded' })
    const expectedSpec = buildExportSpec(printTarget)
    const capturedBytes = new Uint8Array([1, 2, 3]) as PngBytes
    const monoBytes = new Uint8Array([4, 5, 6]) as PngBytes
    const element = {} as HTMLElement

    const rasterizer: Rasterizer = {
      capture: vi.fn().mockResolvedValue(capturedBytes),
    }
    const imageProcessor: ImageProcessor = {
      toMonochrome: vi.fn().mockResolvedValue(monoBytes),
    }
    const fileDownloader: FileDownloader = {
      download: vi.fn(),
    }

    const useCase = new ExportLabelUseCase(rasterizer, imageProcessor, fileDownloader)
    await useCase.execute(element, printTarget, 'Tirzepatide')

    expect(rasterizer.capture).toHaveBeenCalledWith(element, expectedSpec)
    expect(imageProcessor.toMonochrome).toHaveBeenCalledWith(capturedBytes, expectedSpec.dpi)
    expect(fileDownloader.download).toHaveBeenCalledWith(monoBytes, 'tirzepatide-export.png')
  })
})
