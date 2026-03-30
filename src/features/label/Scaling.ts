import { LABEL_CONFIG } from './LabelConfig'

export function pxToCqw(px: number): string {
    const percentage = (px / LABEL_CONFIG.ui.baseContainerWidthPx) * 100;
    return `${percentage}cqw`;
}