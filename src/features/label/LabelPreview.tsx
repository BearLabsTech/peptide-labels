import { forwardRef } from 'react'
import type { LabelRenderModel } from './LabelComposer'
import './LabelPreview.css'

export interface LabelPreviewProps {
  model: LabelRenderModel
}

export const LabelPreview = forwardRef<HTMLDivElement, LabelPreviewProps>(
  ({ model }, ref) => {
    return (
      <div ref={ref} className="label-preview-container">
        {!!model.title && (
          <div
            className="label-preview-title"
            /* * MUST REMAIN INLINE: 
             * This is dynamically calculated by LabelLayoutEngine to ensure 
             * long compound names perfectly fit the physical dimensions of the label.
             */
            style={{ fontSize: model.titleFontSizePx }}
          >
            {model.title}
          </div>
        )}

        {model.reconstitutionLines.length > 0 && (
          <div className="label-preview-box">
            <div
              className="label-preview-section-label"
              /* * MUST REMAIN INLINE: 
               * Scales proportionally to the engine's base body font size 
               * to maintain a consistent visual hierarchy regardless of how much text there is.
               */
              style={{ fontSize: model.bodyFontSizePx * 0.65 }}
            >
              RECONSTITUTION
            </div>
            {model.reconstitutionLines.map((line, index) => {
              const isLast = index === model.reconstitutionLines.length - 1
              return (
                <div
                  key={`${line}-${index}`}
                  className={isLast ? "label-preview-section-emphasis" : "label-preview-section-text"}
                  // Maintains hierarchy: The last line gets a slightly larger scale for emphasis
                  style={{ fontSize: model.bodyFontSizePx * (isLast ? 0.95 : 0.88) }}
                >
                  {line}
                </div>
              )
            })}
          </div>
        )}

        {model.protocolLines.length > 0 && (
          <div className="label-preview-box">
            <div
              className="label-preview-section-label"
              style={{ fontSize: model.bodyFontSizePx * 0.65 }}
            >
              PROTOCOL
            </div>
            {model.protocolLines.map((line, index) => {
              const isLast = index === model.protocolLines.length - 1
              return (
                <div
                  key={`${line}-${index}`}
                  className={isLast ? "label-preview-section-emphasis" : "label-preview-section-text"}
                  style={{ fontSize: model.bodyFontSizePx * (isLast ? 0.95 : 0.88) }}
                >
                  {line}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }
)