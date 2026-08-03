/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/peptide-labels/',
  test: {
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      // Test infrastructure (builders, fakes) is exercised by the tests that use
      // it, not tested in its own right — excluded so an unused builder method
      // doesn't silently drag down the production coverage signal.
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.d.ts',
        '**/*.config.*',
        'src/**/*.test.ts',
        'src/test/**',
        'src/**/testing/**',
        'src/main.tsx',
        // Humble React wrappers (Phase 5): hold only React state / DOM wiring; the
        // logic they call is unit-tested elsewhere (ports, use cases, pure helpers).
        // Pure helpers live in sibling modules (e.g. applyDesignOperations.ts) that stay included.
        'src/features/customDesign/useApplyDesignViewModel.ts',
        'src/features/customDesign/useDesignLibrary.ts',
        'src/features/landing/useAgreementGate.ts',
        'src/features/label/useDialogAccessibility.ts',
        'src/features/label/useLabelStageViewModel.ts',
        'src/features/label/useLabelExport.ts',
        'src/features/label/usePrintSetup.ts',
        'src/features/label/useCalculatorViewModel.ts',
        'src/features/label/components/useSidebarSectionsViewModel.ts',
        'src/features/label/components/usePrintSetupSectionViewModel.ts',
        'src/features/label/WorkspaceErrorBoundary.tsx',
        // React components are humble by policy (testing-vitest.mdc) — not unit-tested.
        'src/**/*.tsx',
      ],
      // Ratchet only: raise these as coverage improves (see docs/CODE-QUALITY.md section E).
      // Never lower a threshold without a note explaining why.
      // Phase 6 exit: measured ~88.55 / 85.73 / 89.02 / 90.12 (stmts/branch/funcs/lines)
      // after designLibrary memory-port tests + typed document construction. Ratchet just under.
      thresholds: {
        lines: 90,
        statements: 88,
        branches: 85,
        functions: 89,
      },
    },
  },
})