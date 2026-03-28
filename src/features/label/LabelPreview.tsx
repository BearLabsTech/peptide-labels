import { forwardRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import type { LabelRenderModel } from './LabelComposer'
import { pxToCqw } from './Scaling'
import './LabelPreview.css'

export const LabelPreview = forwardRef<HTMLDivElement, { model: LabelRenderModel }>(
  ({ model }, ref) => {
    const hasBody = !!model.demotedTitle || model.reconstitutionLines.length > 0 || model.protocolLines.length > 0;

    return (
      <div ref={ref} className="label-preview-container">
        {model.customImage && (
          <div className="label-left-column">
            <img src={model.customImage} className="label-mascot-image" alt="Mascot" />
          </div>
        )}

        <div className="label-center-column">

          <div className="label-title-area">
            {model.isDangerMode ? (
              <div className="danger-title-wrapper" style={{ fontSize: pxToCqw(model.titleFontSizePx) }}>
                <div className="danger-icon">☠️</div>
                <div className="danger-text">
                  {model.title.split('\n').map((line, i) => <div key={i}>{line}</div>)}
                </div>
                <div className="danger-icon">☠️</div>
              </div>
            ) : (
              <div className="label-preview-title" style={{ fontSize: pxToCqw(model.titleFontSizePx) }}>
                {model.title.split('\n').map((line, i) => <div key={i}>{line}</div>)}
              </div>
            )}
          </div>

          {hasBody && (
            <div className="label-body-area">

              {model.demotedTitle && (
                <div className="label-demoted-title" style={{ fontSize: pxToCqw(model.bodyFontSizePx * 1.0) }}>
                  {model.demotedTitle}
                </div>
              )}

              {model.reconstitutionLines.length > 0 && (
                <div className="label-preview-box">
                  <div className="label-preview-section-label">RECONSTITUTION</div>
                  {model.reconstitutionLines.map((l, i) => (
                    <div key={i} className="label-preview-section-text" style={{ fontSize: pxToCqw(model.bodyFontSizePx * 0.82) }}>{l}</div>
                  ))}
                </div>
              )}

              {model.protocolLines.length > 0 && (
                <div className="label-preview-box">
                  <div className="label-preview-section-label">PROTOCOL</div>
                  {model.protocolLines.map((l, i) => (
                    <div key={i} className="label-preview-section-text" style={{ fontSize: pxToCqw(model.bodyFontSizePx * 0.82) }}>{l}</div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {model.qrCodes.length > 0 && (
          <div className="label-right-column">
            {model.qrCodes.map(qr => (
              <div key={qr.type} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: 0 }}>
                <QRCodeSVG value={qr.url} size={100} width="100%" height="70%" />
                <div className="qr-text">{qr.type}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }
)