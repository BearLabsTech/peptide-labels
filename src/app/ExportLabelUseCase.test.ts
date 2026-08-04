import { describe, expect, it } from 'vitest'
import type {
  FileDownloader,
  ImageProcessor,
  PngBytes,
  Rasterizer,
} from '../shared/ports'
import { resolvePrintTarget } from '../print/PrintTargetResolver'
import { ExportLabelUseCase, LABEL_EXPORT_ERROR_MESSAGE } from './ExportLabelUseCase'
import { ok } from '../shared/result'

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
    const result = await useCase.execute(element, printTarget, 'Tirzepatide')

    expect(result).toEqual(ok())
    expect(downloader.lastBytes).toBe(monoBytes)
    expect(downloader.lastFileName).toBe('tirzepatide-export.png')
  })

  it('should return a discoverable Result when a port rejects', async () => {
    const printTarget = resolvePrintTarget({ stockId: '40x20-rounded' })
    const rasterizer: Rasterizer = {
      capture: async () => {
        throw new Error('boom')
      },
    }
    const imageProcessor: ImageProcessor = {
      toMonochrome: async () => new Uint8Array() as PngBytes,
    }
    const downloader: FileDownloader = {
      download() {},
    }

    const useCase = new ExportLabelUseCase(rasterizer, imageProcessor, downloader)
    const result = await useCase.execute({} as HTMLElement, printTarget, 'Tirzepatide')

    expect(result).toEqual({ ok: false, error: LABEL_EXPORT_ERROR_MESSAGE })
  })
})
