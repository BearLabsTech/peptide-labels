import { describe, it, expect } from 'vitest'
import { LabelComposer } from './LabelComposer'
import { resolvePrintTarget } from '../../print/PrintTargetResolver'
import { mmToPx } from '../../print/dimensions'
import { computeColumnLayout, computeIdentityHeaderTitleBreakout, columnsForDenseFullHeightLogo } from './labelColumnLayout'
import { LabelLayoutEngine } from './LabelLayoutEngine'

const TITLE_CHAR_WIDTH_EM = 0.95

function innerRowTitleWidthPx(target: ReturnType<typeof resolvePrintTarget>): number {
    const columns = computeColumnLayout({
      labelWidthMm: target.labelWidthMm,
      paddingMm: target.paddingMm,
      hasLogo: true,
      hasQr: true,
    })
    return mmToPx(columns.innerRowMm, target.effectiveDpi)
}

function longestTitleLinePx(lines: readonly string[], fontSizePx: number): number {
    const tokens = lines.flatMap((line) => line.split(' '))
    return Math.max(...tokens.map((word) => word.length * fontSizePx * TITLE_CHAR_WIDTH_EM))
}

describe('LabelComposer', () => {

    it('should compose standard layout', () => {
        const composer = new LabelComposer()
        const result = composer.compose({
            compoundName: 'Tirzepatide',
            compoundAmount: '20',
            vialUnit: 'mg'
        })

        expect(result.title).toBe('Tirzepatide\n20mg')
        expect(result.titleLines.length).toBeGreaterThan(0)
        expect(result.wrappedLines.length).toBeGreaterThan(0)
    })

    it('should format units correctly in title and protocol', () => {
        const composer = new LabelComposer()

        const resultIu = composer.compose({
            compoundName: 'HGH',
            compoundAmount: '36',
            vialUnit: 'IU',
            protocolAmount: '2',
            measureUnit: 'IU'
        })
        expect(resultIu.title).toBe('HGH\n36IU')
        expect(resultIu.protocolLines).toContain('2IU')

        const resultMg = composer.compose({
            compoundName: 'Tirz',
            compoundAmount: '10',
            vialUnit: 'mg',
            protocolAmount: '500',
            measureUnit: 'mcg'
        })
        expect(resultMg.title).toBe('Tirz\n10mg')
        expect(resultMg.protocolLines).toContain('500mcg')
    })

    // --- NEW: Aggressive String Cleaning Test ---
    it('should strip existing units from input to prevent double units', () => {
        const composer = new LabelComposer()

        const result = composer.compose({
            compoundName: 'HGH',
            compoundAmount: '36mg', // User accidentally left 'mg' in the box!
            vialUnit: 'IU',         // But selected IU in the dropdown
            protocolAmount: '2mcg', // Left 'mcg' in the box!
            measureUnit: 'IU'
        })

        // Engine must aggressively strip the old text units out
        expect(result.title).toBe('HGH\n36IU')
        expect(result.protocolLines).toContain('2IU')
    })

    it('should shrink body text and lighten title in danger mode', () => {
        const composer = new LabelComposer()

        const standardResult = composer.compose({
            compoundName: 'Reta',
            compoundAmount: '20',
            vialUnit: 'mg'
        })

        const dangerResult = composer.compose({
            compoundName: 'Reta',
            compoundAmount: '20',
            vialUnit: 'mg',
            isUntested: true
        })

        expect(dangerResult.bodyFontSizePx).toBeLessThan(standardResult.bodyFontSizePx)
        expect(dangerResult.demotedTitle).toBe('Reta\n20mg')
        // No body sections → sparse composition (not an empty center column).
        expect(dangerResult.isSparse).toBe(true)
        expect(standardResult.isSparse).toBe(true)
    })

    it('should keep danger mode dense when reconstitution or protocol print', () => {
        const composer = new LabelComposer()
        const result = composer.compose({
            compoundName: 'Reta',
            compoundAmount: '20',
            vialUnit: 'mg',
            isUntested: true,
            reconstitutionAmount: '2',
            concentration: '10mg per ml',
        })
        expect(result.isSparse).toBe(false)
        expect(result.isDangerMode).toBe(true)
        expect(result.demotedTitle).toBe('Reta\n20mg')
    })

    it('should leave residual slack so a dense long title does not fill the full inner height', () => {
        const target = resolvePrintTarget({ stockId: '40x20-rounded' })
        const composer = new LabelComposer(target)
        const engine = new LabelLayoutEngine(target.effectiveDpi)
        const result = composer.compose({
            compoundName: 'Human Chorionic Gonadotropin',
            compoundAmount: '20',
            vialUnit: 'mg',
            reconstitutionAmount: '2',
            reconstitutionType: 'BAC Water',
            concentration: '10mg per ml',
            protocolAmount: '5',
            measureUnit: 'mg',
            protocolUnits: '50',
            protocolFrequency: 'Weekly',
            showTestIndicators: true,
            testPurity: 'pass',
            testEndotoxin: 'pass',
            testHeavyMetals: 'pass',
            calculatorSolveMode: 'standard',
        })
        const innerPx = mmToPx(target.labelHeightMm - target.paddingMm * 2, target.effectiveDpi)
        const titlePx = engine.estimateTitleHeightPx(result.titleLines.length, result.titleFontSizePx)
        const bodyPx = engine.estimateBoxedBodyHeightPx(
            {
                boxes: [
                    { lines: [...result.reconstitutionLines] },
                    { lines: [...result.protocolLines] },
                ],
                widthMm: result.columnLayout.centerWidthMm * 0.92,
                labelWidthPx: mmToPx(target.labelWidthMm, target.effectiveDpi),
                heightMm: 10,
            },
            result.bodyFontSizePx,
        )
        const gapPx = mmToPx(target.paddingMm, target.effectiveDpi)
        // Ink-overflow reserve in estimateTitleHeightPx must leave the visual stack
        // under the inner budget so rounded-sticker overflow:hidden does not clip caps.
        expect(titlePx + gapPx + bodyPx).toBeLessThanOrEqual(innerPx)
        // Slack poured into section boxes is capped; title↔box gap and title size
        // take priority over empty box guts.
        expect(result.bodyBoxVerticalPadPx).toBeLessThan(12)
    })

    it('should allocate full height to title when no body exists', () => {
        const composer = new LabelComposer()
        const result = composer.compose({ compoundName: 'Reta' })
        expect(result.titleFontSizePx).toBeGreaterThan(20)
    })

    it('should use more usable width when rounded stock padding is tighter', () => {
        const tight = new LabelComposer(resolvePrintTarget({ stockId: '40x20-rounded' }))
        const loose = new LabelComposer(resolvePrintTarget({ widthMm: 40, heightMm: 20 }))
        const input = {
            compoundName: 'Very Long Compound Name Here',
            compoundAmount: '20',
            vialUnit: 'mg' as const,
        }
        const tightTitle = tight.compose(input).titleFontSizePx
        const looseTitle = loose.compose(input).titleFontSizePx
        expect(tightTitle).toBeGreaterThanOrEqual(looseTitle)
    })

    it('should wrap long example title for standard label with qr', () => {
        const composer = new LabelComposer(resolvePrintTarget({ stockId: '40x20-rounded' }))
        const result = composer.compose({
            compoundName: 'Tirzepatide',
            compoundAmount: '20',
            vialUnit: 'mg',
            vendorName: 'Bear Labs',
            batchNumber: 'BL-2026',
            reconstitutionAmount: '2',
            reconstitutionType: 'BAC Water',
            protocolAmount: '5',
            measureUnit: 'mg',
            protocolFrequency: 'Weekly',
            reconstitutionDate: '20260621',
            vendorCoa: 'https://example.com',
        })
        expect(result.titleLines.join(' ')).toContain('Tirzepatide')
        expect(result.bodyFontSizePx).toBeLessThanOrEqual(26)
    })

    it('should print reconstitution from derived values when form state has not synced water yet', () => {
        const composer = new LabelComposer(resolvePrintTarget({ stockId: '40x20-rounded' }))
        const result = composer.compose({
            compoundName: 'Test Compound',
            compoundAmount: '20',
            vialUnit: 'mg',
            reconstitutionAmount: '',
            concentration: '',
            protocolAmount: '3',
            measureUnit: 'mg',
            protocolUnits: '10 units',
            calculatorSolveMode: 'target_units',
        })
        expect(result.reconstitutionLines).toEqual(['0.667 ml', '30mg per ml'])
    })

    it('should not print reconstitution in set draw volume mode without a compound amount', () => {
        const composer = new LabelComposer(resolvePrintTarget({ stockId: '40x20-rounded' }))
        const result = composer.compose({
            compoundName: 'Test Compound',
            protocolAmount: '3',
            measureUnit: 'mg',
            protocolUnits: '10 units',
            calculatorSolveMode: 'target_units',
        })
        expect(result.reconstitutionLines).toEqual([])
    })

    it('should print reconstitution section in set draw volume mode when vial protocol and draw volume are set', () => {
        const composer = new LabelComposer(resolvePrintTarget({ stockId: '40x20-rounded' }))
        const result = composer.compose({
            compoundName: 'Test Compound',
            compoundAmount: '20',
            vialUnit: 'mg',
            protocolAmount: '3',
            measureUnit: 'mg',
            protocolUnits: '10 units',
            calculatorSolveMode: 'target_units',
        })
        expect(result.reconstitutionLines.length).toBeGreaterThan(0)
        expect(result.reconstitutionLines[0]).toBe('0.667 ml')
        expect(result.reconstitutionLines[1]).toBe('30mg per ml')
    })

    it('should print draw volume with units suffix when only a number is entered', () => {
        const composer = new LabelComposer(resolvePrintTarget({ stockId: '40x20-rounded' }))
        const result = composer.compose({
            compoundName: 'Test Compound',
            compoundAmount: '20',
            vialUnit: 'mg',
            reconstitutionAmount: '0.667',
            concentration: '30mg per ml',
            protocolAmount: '3',
            measureUnit: 'mg',
            protocolUnits: '10',
        })
        expect(result.protocolLines.join(' ')).toBe('10 units (3mg)')
    })

    it('should print derived water volume in set draw volume mode even when stale water remains in input', () => {
        const composer = new LabelComposer(resolvePrintTarget({ stockId: '40x20-rounded' }))
        const result = composer.compose({
            compoundName: 'Test Compound',
            compoundAmount: '21.5',
            vialUnit: 'mg',
            reconstitutionAmount: '2',
            protocolAmount: '3',
            measureUnit: 'mg',
            protocolUnits: '30 units',
            calculatorSolveMode: 'target_units',
        })
        expect(result.reconstitutionLines[0]).toBe('2.15 ml')
    })

    it('should print target concentration on label in set concentration mode even when rounded water would drift', () => {
        const composer = new LabelComposer(resolvePrintTarget({ stockId: '40x20-rounded' }))
        const result = composer.compose({
            compoundName: 'Test Compound',
            compoundAmount: '22',
            vialUnit: 'mg',
            protocolAmount: '4',
            measureUnit: 'mg',
            calculatorSolveMode: 'round_concentration',
            targetConcentration: '15',
            concentration: '5mg per ml',
            reconstitutionAmount: '4.4',
            protocolUnits: '80 units',
        })
        expect(result.reconstitutionLines[0]).toBe('1.467 ml')
        expect(result.reconstitutionLines[1]).toBe('15mg per ml')
        expect(result.protocolLines.join(' ')).toBe('26.667 units (4mg)')
    })

    it('should print user draw units on label in set draw volume mode even when rounded water would forward-recalculate different units', () => {
        const composer = new LabelComposer(resolvePrintTarget({ stockId: '40x20-rounded' }))
        const result = composer.compose({
            compoundName: 'Test Compound',
            compoundAmount: '22',
            vialUnit: 'mg',
            protocolAmount: '4',
            measureUnit: 'mg',
            protocolUnits: '27 units',
            calculatorSolveMode: 'target_units',
            reconstitutionAmount: '4.4',
            concentration: '5mg per ml',
        })
        expect(result.reconstitutionLines[0]).toBe('1.485 ml')
        expect(result.protocolLines.join(' ')).toBe('27 units (4mg)')
    })

    it('should print Manual Entry concentration from vial ÷ water even when stale assist concentration remains', () => {
        const composer = new LabelComposer(resolvePrintTarget({ stockId: '40x20-rounded' }))
        const result = composer.compose({
            compoundName: 'Test Compound',
            compoundAmount: '20',
            vialUnit: 'mg',
            reconstitutionAmount: '2',
            concentration: '20mg per ml',
            protocolAmount: '2.5',
            measureUnit: 'mg',
            protocolUnits: '25 units',
            calculatorSolveMode: 'standard',
        })
        expect(result.reconstitutionLines[0]).toBe('2 ml')
        expect(result.reconstitutionLines[1]).toBe('10mg per ml')
        expect(result.protocolLines.join(' ')).toBe('25 units (2.5mg)')
    })

    it('should print water volume with ml unit when only water amount is shown', () => {
        const composer = new LabelComposer(resolvePrintTarget({ stockId: '40x20-rounded' }))
        const result = composer.compose({
            compoundName: 'Test Compound',
            compoundAmount: '20',
            vialUnit: 'mg',
            reconstitutionAmount: '2',
            concentration: '10mg per ml',
            protocolAmount: '3',
            measureUnit: 'mg',
            protocolUnits: '30 units',
            calculatorSolveMode: 'round_concentration',
            targetConcentration: '10',
        })
        expect(result.reconstitutionLines[0]).toBe('2 ml')
    })

    it('should shrink body font when all sections are filled', () => {
        const composer = new LabelComposer(resolvePrintTarget({ stockId: '40x20-rect', printerId: 'niimbot-b21' }))
        const result = composer.compose({
            compoundName: 'Test Compound',
            compoundAmount: '20',
            vialUnit: 'mg',
            vendorName: 'Test Labs',
            batchNumber: 'TEST01',
            reconstitutionAmount: '2',
            reconstitutionType: 'BAC Water',
            concentration: '10mg per ml',
            reconstitutionDate: '20260621',
            protocolAmount: '1',
            measureUnit: 'mg',
            protocolUnits: '10 units',
            protocolFrequency: 'Weekly',
            vendorCoa: 'https://example.com',
        })
        expect(result.reconstitutionLines[0]).toBe('2 ml BAC Water')
        expect(result.bodyFontSizePx).toBeLessThan(26)
    })

    it('should fit title lines within inner row when mascot and qr flank center column', () => {
        const target = resolvePrintTarget({ stockId: '40x20-rect', printerId: 'niimbot-b21' })
        const composer = new LabelComposer(target)
        const result = composer.compose({
            compoundName: 'Test Compound',
            compoundAmount: '20',
            vialUnit: 'mg',
            customImage: 'data:image/png;base64,test',
            vendorCoa: 'https://example.com/coa',
            reconstitutionAmount: '2',
            concentration: '10mg per ml',
        })

        const budgetPx = innerRowTitleWidthPx(target)
        const structuralCeilingPx = mmToPx(target.labelHeightMm, target.effectiveDpi)
        expect(result.isSparse).toBe(false)
        expect(longestTitleLinePx(result.titleLines, result.titleFontSizePx)).toBeLessThanOrEqual(budgetPx)
        expect(result.titleFontSizePx).toBeGreaterThan(0)
        expect(result.titleFontSizePx).toBeLessThanOrEqual(structuralCeilingPx)
    })

    it('should wrap longest word when title only with mascot and qr', () => {
        const target = resolvePrintTarget({ stockId: '40x20-rect', printerId: 'niimbot-b21' })
        const composer = new LabelComposer(target)
        const result = composer.compose({
            compoundName: 'Test Compound',
            customImage: 'data:image/png;base64,test',
            vendorCoa: 'https://example.com/coa',
        })

        const structuralCeilingPx = mmToPx(target.labelHeightMm, target.effectiveDpi)
        expect(result.isSparse).toBe(true)
        expect(result.titleLines.some((line) => line.includes('Compound'))).toBe(true)
        expect(result.titleLines.length).toBeGreaterThan(1)
        expect(result.titleFontSizePx).toBeGreaterThan(0)
        expect(result.titleFontSizePx).toBeLessThanOrEqual(structuralCeilingPx)
    })

    it('should fit full center stack when mascot qr and all sections filled', () => {
        const target = resolvePrintTarget({ stockId: '40x20-rect', printerId: 'niimbot-b21' })
        const composer = new LabelComposer(target)
        const engine = new LabelLayoutEngine(target.effectiveDpi)
        const result = composer.compose({
            compoundName: 'Test Compound',
            compoundAmount: '20',
            vialUnit: 'mg',
            vendorName: 'Bear Labs',
            reconstitutionAmount: '2',
            reconstitutionType: 'BAC Water',
            concentration: '10mg per ml',
            protocolAmount: '2',
            measureUnit: 'mg',
            protocolUnits: '20 units',
            vendorCoa: 'https://example.com/coa',
            customImage: 'data:image/png;base64,test',
        })

        const innerMm = target.labelHeightMm - target.paddingMm * 2
        const innerPx = mmToPx(innerMm, target.effectiveDpi)
        const columns = computeColumnLayout({
          labelWidthMm: target.labelWidthMm,
          paddingMm: target.paddingMm,
          hasLogo: true,
          hasQr: true,
        })
        const bodyInput = {
            boxes: [
                { lines: result.reconstitutionLines },
                { lines: result.protocolLines },
                { lines: result.sourceLines },
            ],
            widthMm: columns.centerWidthMm * 0.92,
            heightMm: innerMm,
            labelWidthPx: mmToPx(target.labelWidthMm, target.effectiveDpi),
        }

        const stackPx = engine.estimateCenterStackHeightPx(
            result.titleLines.length,
            result.titleFontSizePx,
            target.paddingMm,
            bodyInput,
            result.bodyFontSizePx,
        )
        expect(stackPx).toBeLessThanOrEqual(innerPx)
        expect(result.bodyFontSizePx).toBeLessThan(26)
    })

    it('should use larger font on taller label stock when content is sparse', () => {
        const compact = new LabelComposer(resolvePrintTarget({ stockId: '40x20-rounded' }))
        const tall = new LabelComposer(resolvePrintTarget({ stockId: '40x30-rounded' }))
        const input = {
            compoundName: 'Test Compound',
            compoundAmount: '20',
            vialUnit: 'mg' as const,
            reconstitutionAmount: '2',
            reconstitutionType: 'BAC Water',
            concentration: '10mg per ml',
        }
        const compactResult = compact.compose(input)
        const tallResult = tall.compose(input)
        expect(tallResult.titleFontSizePx).toBeGreaterThan(compactResult.titleFontSizePx)
        expect(tallResult.bodyFontSizePx).toBeGreaterThan(compactResult.bodyFontSizePx)
    })

    it('should shrink title font when wider logo column steals center width', () => {
        const target = resolvePrintTarget({ stockId: '40x30-rounded' })
        const narrowLogo = new LabelComposer(target)
        const wideLogo = new LabelComposer(target)
        const base = {
            compoundName: 'Test Compound',
            compoundAmount: '20',
            vialUnit: 'mg' as const,
            customImage: 'data:image/png;base64,test',
            reconstitutionAmount: '2',
            concentration: '10mg per ml',
        }
        const narrowResult = narrowLogo.compose({ ...base, logoColumnWidthPercent: 20 })
        const wideResult = wideLogo.compose({ ...base, logoColumnWidthPercent: 40 })
        expect(wideResult.isSparse).toBe(false)
        expect(wideResult.titleFontSizePx).toBeLessThanOrEqual(narrowResult.titleFontSizePx)
        expect(wideResult.logoColumnWidthPercent).toBe(40)
    })

    it('should shrink title font when wider coa column steals center width', () => {
        const target = resolvePrintTarget({ stockId: '40x30-rounded' })
        const narrowQr = new LabelComposer(target)
        const wideQr = new LabelComposer(target)
        const base = {
            compoundName: 'Test Compound',
            compoundAmount: '20',
            vialUnit: 'mg' as const,
            reconstitutionAmount: '2',
            concentration: '10mg per ml',
            vendorCoa: 'https://example.com/coa',
        }
        const narrowResult = narrowQr.compose({ ...base, qrColumnWidthPercent: 30 })
        const wideResult = wideQr.compose({ ...base, qrColumnWidthPercent: 48 })
        expect(wideResult.isSparse).toBe(false)
        expect(wideResult.titleFontSizePx).toBeLessThanOrEqual(narrowResult.titleFontSizePx)
        expect(wideResult.qrColumnWidthPercent).toBe(48)
    })

    it('should keep title font larger than body when sections and side columns print', () => {
        const composer = new LabelComposer(resolvePrintTarget({ stockId: '40x20-rounded', printerId: 'niimbot-b1-pro' }))
        const result = composer.compose({
            compoundName: 'Tirzepatide',
            compoundAmount: '20',
            vialUnit: 'mg',
            reconstitutionAmount: '2',
            reconstitutionType: 'BAC Water',
            concentration: '10mg per ml',
            reconstitutionDate: '20260705',
            protocolAmount: '5',
            measureUnit: 'mg',
            protocolFrequency: 'Weekly',
            showSource: false,
            showTestIndicators: true,
            testPurity: 'pass',
            testEndotoxin: 'pass',
            showCoaQr: true,
            vendorCoa: 'https://example.com/coa',
            customImage: 'data:image/png;base64,test',
        })

        expect(result.titleFontSizePx).toBeGreaterThan(result.bodyFontSizePx)
        expect(result.titleFontSizePx / result.bodyFontSizePx).toBeGreaterThanOrEqual(1.35)
        expect(result.titleLines.length).toBeGreaterThanOrEqual(2)
    })

    it('should size two section boxes larger than three stacked section boxes', () => {
        const composer = new LabelComposer(resolvePrintTarget({ stockId: '40x20-rounded' }))
        const shared = {
            compoundName: 'Tirzepatide',
            compoundAmount: '20',
            vialUnit: 'mg' as const,
            reconstitutionAmount: '2',
            reconstitutionType: 'BAC Water',
            concentration: '10mg per ml',
            protocolAmount: '5',
            measureUnit: 'mg' as const,
            protocolUnits: '20 units',
            showSource: false,
        }
        const two = composer.compose(shared)
        const three = composer.compose({
            ...shared,
            showSource: true,
            vendorName: 'Bear Labs',
            batchNumber: 'BL-2026',
        })
        expect(two.reconstitutionLines.length).toBeGreaterThan(0)
        expect(two.protocolLines.length).toBeGreaterThan(0)
        expect(two.sourceLines.length).toBe(0)
        expect(three.sourceLines.length).toBeGreaterThan(0)
        expect(two.bodyFontSizePx).toBeGreaterThan(three.bodyFontSizePx)
    })

    it('should default to identity header layout', () => {
        const target = resolvePrintTarget({ stockId: '40x20-rounded', printerId: 'niimbot-b1-pro' })
        const input = {
            compoundName: 'Tirzepatide',
            compoundAmount: '20',
            vialUnit: 'mg' as const,
            reconstitutionAmount: '2',
            reconstitutionType: 'BAC Water',
            concentration: '10mg per ml',
            reconstitutionDate: '20260705',
            protocolAmount: '5',
            measureUnit: 'mg' as const,
            protocolFrequency: 'Weekly',
            showSource: false,
            showTestIndicators: true,
            testPurity: 'pass' as const,
            testEndotoxin: 'pass' as const,
            showCoaQr: true,
            vendorCoa: 'https://example.com/coa',
            customImage: 'data:image/png;base64,test',
        }
        const result = new LabelComposer(target).compose(input)

        expect(result.labelLayoutMode).toBe('identityHeader')
        expect(result.titleFontSizePx / result.bodyFontSizePx).toBeGreaterThanOrEqual(1.35)
    })

    it('should wrap long compound names using full inner row width', () => {
        const target = resolvePrintTarget({ stockId: '40x20-rounded', printerId: 'niimbot-b1-pro' })
        const base = {
            compoundName: 'Test Compound!!!!!!!!!!',
            compoundAmount: '20',
            vialUnit: 'mg' as const,
            reconstitutionAmount: '2ml',
            concentration: '10mg per ml',
            protocolAmount: '4',
            measureUnit: 'mg' as const,
            showTestIndicators: true,
            testPurity: 'pass' as const,
            testEndotoxin: 'pass' as const,
            customImage: 'data:image/png;base64,test',
        }
        const result = new LabelComposer(target).compose(base)

        expect(result.labelLayoutMode).toBe('identityHeader')
        expect(result.titleLines.join(' ')).toContain('Compound')
    })

    it('should expose resolved column layout and title breakout matching compute helpers', () => {
        const target = resolvePrintTarget({ stockId: '40x30-rounded' })
        const composer = new LabelComposer(target)
        const result = composer.compose({
            compoundName: 'Test',
            compoundAmount: '20',
            vialUnit: 'mg',
            customImage: 'data:image/png;base64,test',
            vendorCoa: 'https://example.com/coa',
            reconstitutionAmount: '2',
            concentration: '10mg per ml',
            logoColumnWidthPercent: 25,
            qrColumnWidthPercent: 40,
        })
        const expected = computeColumnLayout({
            labelWidthMm: target.labelWidthMm,
            paddingMm: target.paddingMm,
            hasLogo: true,
            hasQr: true,
            logoColumnWidthPercent: 25,
            qrColumnWidthPercent: 40,
        })
        expect(result.isSparse).toBe(false)
        expect(result.columnLayout).toEqual(expected)
        expect(result.logoColumnWidthPercent).toBe(expected.logoWidthPercent)
        expect(result.qrColumnWidthPercent).toBe(expected.qrWidthPercent)
        expect(result.identityHeaderTitleBreakout).toEqual(
            computeIdentityHeaderTitleBreakout(columnsForDenseFullHeightLogo(expected), false, true),
        )
    })

    it('should print test indicators without coa qr when coa printing is disabled', () => {
        const composer = new LabelComposer()
        const result = composer.compose({
            compoundName: 'Tirzepatide',
            compoundAmount: '20',
            vialUnit: 'mg',
            showTestIndicators: true,
            testMass: 'pass',
            testPurity: 'fail',
            vendorCoa: 'https://example.com/coa',
            showCoaQr: false,
        })

        expect(result.qrCodes).toEqual([])
        expect(result.testIndicators).toHaveLength(2)
        expect(result.testIndicators[0]).toMatchObject({ type: 'Mass', status: 'pass' })
        expect(result.testIndicators[1]).toMatchObject({ type: 'Purity', status: 'fail' })
        expect(result.isSparse).toBe(true)
        expect(result.qrColumnWidthPercent).toBe(0)
        expect(result.testIndicatorLayout).toBeDefined()
        expect(result.testIndicatorLayout!.markSizePx).toBeGreaterThan(result.testIndicatorLayout!.labelFontSizePx)
    })

    it('should use sparse composition without a right column when there is no body', () => {
        const composer = new LabelComposer()
        const result = composer.compose({
            compoundName: 'Tirzepatide',
            compoundAmount: '20',
            vialUnit: 'mg',
            showTestIndicators: true,
            testPurity: 'pass',
            testEndotoxin: 'pass',
        })

        expect(result.isSparse).toBe(true)
        expect(result.qrCodes).toEqual([])
        expect(result.testIndicators).toHaveLength(2)
        expect(result.qrColumnWidthPercent).toBe(0)
        expect(result.testIndicatorLayout).toBeDefined()
        expect(result.testIndicatorLayout!.markSizePx).toBeGreaterThan(result.testIndicatorLayout!.labelFontSizePx)
    })

    it('should omit test indicator layout when no tests print on the label', () => {
        const composer = new LabelComposer()
        const result = composer.compose({
            compoundName: 'Test',
            showTestIndicators: true,
        })

        expect(result.testIndicators).toEqual([])
        expect(result.testIndicatorLayout).toBeUndefined()
    })

    it('should size sparse testing without a dense right column', () => {
        const composer = new LabelComposer()
        const withoutIndicators = composer.compose({ compoundName: 'Test' })
        const withIndicators = composer.compose({
            compoundName: 'Test',
            showTestIndicators: true,
            testLcms: 'pass',
        })
        const toggleOnButNothingSelected = composer.compose({
            compoundName: 'Test',
            showTestIndicators: true,
        })

        expect(withoutIndicators.testIndicators).toEqual([])
        expect(withoutIndicators.qrColumnWidthPercent).toBe(0)
        expect(withoutIndicators.isSparse).toBe(true)
        expect(withIndicators.testIndicators).toHaveLength(1)
        expect(withIndicators.testIndicatorLayout).toBeDefined()
        expect(withIndicators.isSparse).toBe(true)
        expect(withIndicators.qrColumnWidthPercent).toBe(0)
        expect(toggleOnButNothingSelected.testIndicators).toEqual([])
        expect(toggleOnButNothingSelected.qrColumnWidthPercent).toBe(0)
    })

    it('should emit labeled source wraps so multi-word group names stay together under Group:', () => {
        const composer = new LabelComposer()
        const result = composer.compose({
            compoundName: 'HGH',
            compoundAmount: '20',
            vialUnit: 'mg',
            customImage: 'data:image/png;base64,test',
            groupBuyName: "Bear's Den",
            showGroup: true,
            showVendor: false,
            showBatch: false,
            showReconstitution: false,
            showProtocol: false,
            showTestIndicators: true,
            testPurity: 'pass',
        })

        expect(result.sourceLines[0]).toBe('Group:')
        expect(result.sourceLines).toContain("Bear's Den")
        expect(result.sourceLines.some((line) => line.startsWith('Group:') && line !== 'Group:')).toBe(false)
    })

    it('should give dense logo a full-height column with no left title overhang', () => {
        const composer = new LabelComposer()
        const result = composer.compose({
            compoundName: 'HGH',
            compoundAmount: '20',
            vialUnit: 'mg',
            customImage: 'data:image/png;base64,test',
            groupBuyName: "Bear's Den",
            showGroup: true,
            showVendor: false,
            showBatch: false,
            showReconstitution: false,
            showProtocol: false,
            showTestIndicators: true,
            testPurity: 'pass',
        })

        expect(result.isSparse).toBe(false)
        expect(result.customImage).toBeTruthy()
        expect(result.identityHeaderTitleBreakout.breakoutMarginLeftPct).toBeCloseTo(0, 10)
        expect(result.sparseLogoHeightPx).toBe(0)
    })
})

