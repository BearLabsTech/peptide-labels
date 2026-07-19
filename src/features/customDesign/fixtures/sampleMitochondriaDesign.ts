import type { DesignDocument } from '../designDocument'

/**
 * Tiny 1×1 PNG (black pixel) as raw base64 — enough for schema/asset round-trips.
 * Not for visual QA; Slice 1+ fixtures may use richer art.
 */
const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

/**
 * Golden fixture: 40×20 rounded stock, compound name + amount slots,
 * vertical side text, inverted band, and an embedded image asset.
 */
export const SAMPLE_MITOCHONDRIA_DESIGN: DesignDocument = {
  schemaVersion: 1,
  id: 'design-fixture-mitochondria-40x20',
  name: 'Mitochondria sample',
  createdAt: '2026-07-19T12:00:00.000Z',
  updatedAt: '2026-07-19T12:00:00.000Z',
  visibility: 'private',
  stock: {
    kind: 'catalog',
    stockId: '40x20-rounded',
  },
  slots: [
    {
      key: 'compoundName',
      label: 'Compound name',
      type: 'text',
      required: true,
    },
    {
      key: 'compoundAmount',
      label: 'Compound amount',
      type: 'text',
      required: true,
    },
  ],
  assets: [
    {
      id: 'asset-mito',
      mimeType: 'image/png',
      dataBase64: TINY_PNG_BASE64,
    },
  ],
  elements: [
    {
      id: 'el-side-label',
      type: 'text',
      frame: { xMm: 1, yMm: 2, widthMm: 16, heightMm: 4 },
      rotationDeg: 270,
      zIndex: 2,
      content: { kind: 'static', text: 'RESEARCH' },
      fontId: 'sans',
      fontSizePt: 6,
      bold: true,
      alignH: 'center',
      alignV: 'middle',
      wrap: false,
      fill: 'none',
      ink: 'black',
    },
    {
      id: 'el-name',
      type: 'text',
      frame: { xMm: 12, yMm: 2, widthMm: 26, heightMm: 5 },
      rotationDeg: 0,
      zIndex: 3,
      content: { kind: 'slot', slotKey: 'compoundName' },
      fontId: 'display',
      fontSizePt: 9,
      bold: true,
      alignH: 'left',
      alignV: 'middle',
      wrap: true,
      fill: 'none',
      ink: 'black',
    },
    {
      id: 'el-amount-inverted',
      type: 'text',
      frame: { xMm: 12, yMm: 8, widthMm: 16, heightMm: 5 },
      rotationDeg: 0,
      zIndex: 3,
      content: { kind: 'slot', slotKey: 'compoundAmount' },
      fontId: 'sans',
      fontSizePt: 8,
      bold: true,
      alignH: 'center',
      alignV: 'middle',
      wrap: false,
      fill: 'solid',
      ink: 'reverse',
    },
    {
      id: 'el-mito-image',
      type: 'image',
      frame: { xMm: 30, yMm: 7, widthMm: 8, heightMm: 10 },
      rotationDeg: 0,
      zIndex: 1,
      assetId: 'asset-mito',
      objectFit: 'contain',
    },
    {
      id: 'el-border',
      type: 'shape',
      frame: { xMm: 0.5, yMm: 0.5, widthMm: 39, heightMm: 19 },
      rotationDeg: 0,
      zIndex: 0,
      shape: 'rect',
      stroke: true,
      fill: false,
    },
  ],
}
