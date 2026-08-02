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
      ],
      // Ratchet only: raise these as coverage improves (see docs/CODE-QUALITY.md section E).
      // Never lower a threshold without a note explaining why.
      thresholds: {
        lines: 75,
        statements: 74,
        branches: 68,
        functions: 74,
      },
    },
  },
})