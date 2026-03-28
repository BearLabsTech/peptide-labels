import { forwardRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import type { LabelRenderModel } from './LabelComposer'
import { pxToCqw } from './Scaling'
import './LabelPreview.css'

export const LabelPreview = forwardRef<HTMLDivElement, { model: LabelRenderModel }>(
  ({ model }, ref) => {
    return (
      <div ref={ref} className="label-preview-container">
        {model.customImage && (
          <div className="label-left-column">
            <img src={model.customImage} className="label-mascot-image" alt="Mascot" />
          </div>
        )}

        <div className="label-center-column">
          <div className="label-preview-title" style={{ fontSize: pxToCqw(model.titleFontSizePx) }}>
            {model.title.split('\n').map((line, i) => <div key={i}>{line}</div>)}
          </div>

          <div className="label-body-area">
            {model.reconstitutionLines.length > 0 && (
              <div className="label-preview-box">
                <div className="label-preview-section-label">RECONSTITUTION</div>
                {model.reconstitutionLines.map((l, i) => (
                  <div key={i} className="label-preview-section-text" style={{ fontSize: pxToCqw(model.bodyFontSizePx * 0.88) }}>{l}</div>
                ))}
              </div>
            )}

            {model.protocolLines.length > 0 && (
              <div className="label-preview-box">
                <div className="label-preview-section-label">PROTOCOL</div>
                {model.protocolLines.map((l, i) => (
                  <div key={i} className="label-preview-section-text" style={{ fontSize: pxToCqw(model.bodyFontSizePx * 0.88) }}>{l}</div>
                ))}
              </div>
            )}
          </div>
        </div>

        {model.qrCodes.length > 0 && (
          <div className="label-right-column">
            {model.qrCodes.map(qr => (
              <div key={qr.type} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
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