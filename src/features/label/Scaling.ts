const BASE_WIDTH_PX = 320;

export function pxToCqw(px: number): string {
    const percentage = (px / BASE_WIDTH_PX) * 100;
    return `${percentage}cqw`;
}