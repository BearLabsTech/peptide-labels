import { afterEach, describe, expect, it, vi } from 'vitest'
import { applyMonochromeFilter } from './labelExport'

afterEach(() => {
    vi.unstubAllGlobals()
})

describe('applyMonochromeFilter failure boundaries', () => {
    it('should reject when the captured image cannot load', async () => {
        class FailingImage {
            onload: (() => void) | null = null
            onerror: (() => void) | null = null

            set src(_value: string) {
                this.onerror?.()
            }
        }
        vi.stubGlobal('Image', FailingImage)

        await expect(applyMonochromeFilter('invalid', 300))
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

        await expect(applyMonochromeFilter('data:image/png;base64,AA==', 300))
            .rejects.toThrow('Canvas rendering is unavailable')
    })
})
