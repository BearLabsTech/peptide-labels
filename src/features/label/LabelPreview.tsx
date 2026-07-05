import { forwardRef, type CSSProperties } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import type { LabelRenderModel } from './LabelComposer'
import { labelContentStyle, labelStickerStyle } from './print/labelSurfaceStyle'
import { previewBaseWidthPx } from './print/dimensions'
import type { PrintTarget } from './print/types'
import { pxToCqw } from './Scaling'
import './LabelPreview.css'

export const LabelPreview = forwardRef<HTMLDivElement, { model: LabelRenderModel; printTarget: PrintTarget; style?: CSSProperties }>(
  ({ model, printTarget, style }, ref) => {
    const hasBody = !!model.demotedTitle || model.reconstitutionLines.length > 0 || model.protocolLines.length > 0 || model.sourceLines.length > 0;
    const baseWidthPx = previewBaseWidthPx(printTarget)

    return (
      <div
        ref={ref}
        className="label-sticker"
        style={{ ...labelStickerStyle(printTarget), ...style }}
      >
        <div
          className="label-preview-container"
          style={labelContentStyle(printTarget)}
        >
        {model.customImage && (
          <div className="label-left-column" style={{ width: `${model.logoColumnWidthPercent}%` }}>
            <img src={model.customImage} className="label-mascot-image" alt="Mascot" />
          </div>
        )}

        <div className="label-center-column">
          <div className="label-center-stack">

          <div className="label-title-area">
            {model.isDangerMode ? (
              <div className="danger-title-wrapper" style={{ fontSize: pxToCqw(model.titleFontSizePx, baseWidthPx) }}>
                <div className="danger-icon">☠️</div>
                <div className="danger-text">
                  {model.title.split('\n').map((line, i) => <div key={i}>{line}</div>)}
                </div>
                <div className="danger-icon">☠️</div>
              </div>
            ) : (
              <div className="label-preview-title" style={{ fontSize: pxToCqw(model.titleFontSizePx, baseWidthPx) }}>
                {model.titleLines.map((line, i) => <div key={i}>{line}</div>)}
              </div>
            )}
          </div>

          {hasBody && (
            <div className="label-body-area">

              {model.demotedTitle && (
                <div className="label-demoted-title" style={{ fontSize: pxToCqw(model.bodyFontSizePx * 1.0, baseWidthPx) }}>
                  {model.demotedTitle}
                </div>
              )}

              {model.reconstitutionLines.length > 0 && (
                <div
                  className="label-preview-box"
                  style={{ fontSize: pxToCqw(model.bodyFontSizePx, baseWidthPx) }}
                >
                  <div
                    className="label-preview-section-label"
                    style={{ fontSize: pxToCqw(model.bodyFontSizePx * 0.55, baseWidthPx) }}
                  >
                    RECONSTITUTION
                  </div>
                  {model.reconstitutionLines.map((l, i) => (
                    <div key={i} className="label-preview-section-text" style={{ fontSize: pxToCqw(model.bodyFontSizePx * 0.82, baseWidthPx) }}>{l}</div>
                  ))}
                </div>
              )}

              {model.protocolLines.length > 0 && (
                <div
                  className="label-preview-box"
                  style={{ fontSize: pxToCqw(model.bodyFontSizePx, baseWidthPx) }}
                >
                  <div
                    className="label-preview-section-label"
                    style={{ fontSize: pxToCqw(model.bodyFontSizePx * 0.55, baseWidthPx) }}
                  >
                    PROTOCOL
                  </div>
                  {model.protocolLines.map((l, i) => (
                    <div key={i} className="label-preview-section-text" style={{ fontSize: pxToCqw(model.bodyFontSizePx * 0.82, baseWidthPx) }}>{l}</div>
                  ))}
                </div>
              )}

              {model.sourceLines.length > 0 && (
                <div
                  className="label-preview-box"
                  style={{ fontSize: pxToCqw(model.bodyFontSizePx, baseWidthPx) }}
                >
                  <div
                    className="label-preview-section-label"
                    style={{ fontSize: pxToCqw(model.bodyFontSizePx * 0.55, baseWidthPx) }}
                  >
                    SOURCE
                  </div>
                  {model.sourceLines.map((l, i) => (
                    <div key={i} className="label-preview-section-text" style={{ fontSize: pxToCqw(model.bodyFontSizePx * 0.82, baseWidthPx) }}>{l}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          </div>
        </div>

        {model.qrCodes.length > 0 && (
          <div className="label-right-column" style={{ width: `${model.qrColumnWidthPercent}%` }}>
            {model.qrCodes.map(qr => (
              <div key={qr.type} className="label-qr-slot">
                <div className="label-qr-slot-graphic">
                  <QRCodeSVG value={qr.url} size={baseWidthPx} className="label-qr-svg" />
                </div>
                <div className="qr-text">{qr.type}</div>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>
    )
  }
)
