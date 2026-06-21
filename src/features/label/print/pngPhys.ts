const PNG_SIGNATURE_LENGTH = 8

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c >>> 0
  }
  return table
})()

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function writeUint32BE(view: DataView, offset: number, value: number): void {
  view.setUint32(offset, value >>> 0, false)
}

function readChunkType(bytes: Uint8Array, offset: number): string {
  return String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3])
}

/** Pixels per meter for PNG pHYs when unit specifier is 1 (meter). */
export function dpiToPixelsPerMeter(dpi: number): number {
  return Math.round(dpi / 0.0254)
}

function buildPhysChunk(dpi: number): Uint8Array {
  const ppm = dpiToPixelsPerMeter(dpi)
  const data = new Uint8Array(9)
  const view = new DataView(data.buffer)
  writeUint32BE(view, 0, ppm)
  writeUint32BE(view, 4, ppm)
  data[8] = 1

  const chunk = new Uint8Array(4 + 4 + data.length + 4)
  const chunkView = new DataView(chunk.buffer)
  writeUint32BE(chunkView, 0, data.length)
  chunk.set([0x70, 0x48, 0x59, 0x73], 4) // pHYs
  chunk.set(data, 8)
  const crcInput = chunk.subarray(4, 8 + data.length)
  writeUint32BE(chunkView, 8 + data.length, crc32(crcInput))
  return chunk
}

/** Inject or replace pHYs chunk immediately after IHDR. Pure bytes in/out. */
export function injectPngPhys(pngBytes: Uint8Array, dpi: number): Uint8Array {
  if (pngBytes.length < PNG_SIGNATURE_LENGTH + 12) return pngBytes
  if (readChunkType(pngBytes, PNG_SIGNATURE_LENGTH + 4) !== 'IHDR') return pngBytes

  const ihdrLength = new DataView(pngBytes.buffer, pngBytes.byteOffset + PNG_SIGNATURE_LENGTH).getUint32(0, false)
  const afterIhdr = PNG_SIGNATURE_LENGTH + 4 + 4 + ihdrLength + 4
  let insertAt = afterIhdr
  let removeLength = 0

  if (readChunkType(pngBytes, afterIhdr + 4) === 'pHYs') {
    const physLength = new DataView(pngBytes.buffer, pngBytes.byteOffset + afterIhdr).getUint32(0, false)
    removeLength = 4 + 4 + physLength + 4
  }

  const physChunk = buildPhysChunk(dpi)
  const out = new Uint8Array(pngBytes.length - removeLength + physChunk.length)
  out.set(pngBytes.subarray(0, insertAt))
  out.set(physChunk, insertAt)
  out.set(pngBytes.subarray(insertAt + removeLength), insertAt + physChunk.length)
  return out
}

export function parsePngPhysPixelsPerMeter(pngBytes: Uint8Array): number | null {
  let offset = PNG_SIGNATURE_LENGTH
  while (offset + 8 <= pngBytes.length) {
    const view = new DataView(pngBytes.buffer, pngBytes.byteOffset + offset)
    const length = view.getUint32(0, false)
    const type = readChunkType(pngBytes, offset + 4)
    if (type === 'pHYs' && length >= 9) {
      return view.getUint32(8, false)
    }
    offset += 4 + 4 + length + 4
  }
  return null
}
