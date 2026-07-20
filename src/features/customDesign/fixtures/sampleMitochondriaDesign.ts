import type { DesignDocument } from '../designDocument'

/** Simple black/white oval icon (48×48 PNG) for the sample image box. */
const MITO_ICON_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAIAAADYYG7QAAAAoUlEQVR4nO3WQRKAMAhD0d7/0rp32gQoVBzzt6B9LhwdV7PG24BnArEEYgnEEoglECsOGrBDIIxIwVm3Y5QAi+/tU1wsspGrsZjQuEJDTctZnQab5oNqDTB9AXRGszIh0PQJUhLoL6ADmUDtXvuOoHafjmoTOhTM2v1+VJj4cXQji2U9yLi3w/Id4dq24+K3DV9ZlEAsgVgCsQRiCcRqB7oBekZQyXesopkAAAAASUVORK5CYII='

/**
 * Golden fixture: 40×20 rounded stock, compound name + amount slots,
 * vertical side text, inverted band, and an embedded image asset.
 *
 * Frames are laid out for a readable community-style vial sticker:
 * vertical RESEARCH on the left, name + inverted amount, icon on the right.
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
      dataBase64: MITO_ICON_PNG_BASE64,
    },
  ],
  elements: [
    {
      id: 'el-border',
      type: 'shape',
      frame: { xMm: 0.6, yMm: 0.6, widthMm: 38.8, heightMm: 18.8 },
      rotationDeg: 0,
      zIndex: 0,
      shape: 'rect',
      stroke: true,
      fill: false,
    },
    {
      // Wide short text box; rotated 270° so it reads up the left edge.
      id: 'el-side-label',
      type: 'text',
      frame: { xMm: -4.5, yMm: 8.4, widthMm: 14, heightMm: 3.2 },
      rotationDeg: 270,
      zIndex: 2,
      content: { kind: 'static', text: 'RESEARCH' },
      fontId: 'sans',
      fontSizePt: 5.5,
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
      frame: { xMm: 6, yMm: 2.2, widthMm: 22, heightMm: 6 },
      rotationDeg: 0,
      zIndex: 3,
      content: { kind: 'slot', slotKey: 'compoundName' },
      fontId: 'display',
      fontSizePt: 8,
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
      frame: { xMm: 6, yMm: 9.5, widthMm: 18, heightMm: 6.5 },
      rotationDeg: 0,
      zIndex: 3,
      content: { kind: 'slot', slotKey: 'compoundAmount' },
      fontId: 'sans',
      fontSizePt: 6.5,
      bold: true,
      alignH: 'center',
      alignV: 'middle',
      wrap: true,
      fill: 'solid',
      ink: 'reverse',
    },
    {
      id: 'el-mito-image',
      type: 'image',
      frame: { xMm: 26, yMm: 8.5, widthMm: 11, heightMm: 9 },
      rotationDeg: 0,
      zIndex: 1,
      assetId: 'asset-mito',
      objectFit: 'contain',
    },
  ],
}
