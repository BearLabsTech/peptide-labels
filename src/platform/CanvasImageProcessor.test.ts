import { afterEach, describe, expect, it, vi } from 'vitest'
import { CanvasImageProcessor } from './CanvasImageProcessor'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('CanvasImageProcessor failure boundaries', () => {
  it('should reject when the captured image cannot load', async () => {
    class FailingImage {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null

      set src(_value: string) {
        this.onerror?.()
      }
    }
    vi.stubGlobal('Image', FailingImage)

    await expect(new CanvasImageProcessor().toMonochrome(new Uint8Array([1]), 300))
      .rejects.toThrow('Export image could not be loaded')
  })

  it('should reject when canvas rendering is unavailable', async () => {
    class LoadedImage {
      width = 1
      height = 1
      onload: (() => void) | null = null
      onerror: (() => void) | null = null

      set src(_value: string) {
        this.onload?.()
      }
    }
    vi.stubGlobal('Image', LoadedImage)
    vi.stubGlobal('document', {
      createElement: () => ({
        getContext: () => null,
        height: 0,
        width: 0,
      }),
    })

    await expect(new CanvasImageProcessor().toMonochrome(new Uint8Array([1, 2, 3]), 300))
      .rejects.toThrow('Canvas rendering is unavailable')
  })
})
