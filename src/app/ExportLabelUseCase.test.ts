import { describe, expect, it } from 'vitest'
import type {
  FileDownloader,
  ImageProcessor,
  PngBytes,
  Rasterizer,
} from '../shared/ports'
import { resolvePrintTarget } from '../print/PrintTargetResolver'
import { ExportLabelUseCase } from './ExportLabelUseCase'

describe('ExportLabelUseCase', () => {
  it('should rasterize, convert to monochrome at the export DPI, and download with the compound filename', async () => {
    const printTarget = resolvePrintTarget({ stockId: '40x20-rounded' })
    const capturedBytes = new Uint8Array([1, 2, 3]) as PngBytes
    const monoBytes = new Uint8Array([4, 5, 6]) as PngBytes
    const element = {} as HTMLElement

    const rasterizer: Rasterizer = {
      capture: async () => capturedBytes,
    }
    const imageProcessor: ImageProcessor = {
      toMonochrome: async () => monoBytes,
    }
    const downloader = {
      lastBytes: undefined as Uint8Array | undefined,
      lastFileName: undefined as string | undefined,
      download(bytes: Uint8Array, filename: string) {
        this.lastBytes = bytes
        this.lastFileName = filename
      },
    } satisfies FileDownloader & {
      lastBytes: Uint8Array | undefined
      lastFileName: string | undefined
    }

    const useCase = new ExportLabelUseCase(rasterizer, imageProcessor, downloader)
    await useCase.execute(element, printTarget, 'Tirzepatide')

    expect(downloader.lastBytes).toBe(monoBytes)
    expect(downloader.lastFileName).toBe('tirzepatide-export.png')
  })
})
