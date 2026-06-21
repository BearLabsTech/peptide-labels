export function pxToCqw(px: number, baseContainerWidthPx: number): string {
    const percentage = (px / baseContainerWidthPx) * 100;
    return `${percentage}cqw`;
}
