import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'coverage']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  // Accessibility — components are humble and not unit-tested, so lint is the
  // main a11y gate. Scoped to JSX only (approved 2026-08-04, clean-slate action 6).
  {
    files: ['src/**/*.tsx'],
    ...jsxA11y.flatConfigs.recommended,
  },
  // Layer: React views go through hooks/use cases — not platform adapters directly.
  {
    files: ['src/**/*.tsx', 'src/features/**/ui/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/platform/**', '**/platform'],
              message:
                'Views must not import platform adapters; go through hooks or use cases.',
            },
          ],
        },
      ],
    },
  },
  // Layer: label and customDesign must not import each other (shared code lives in app/print/shared).
  // Ignore domain/ so the domain block below can own no-restricted-imports there.
  {
    files: ['src/features/label/**/*.{ts,tsx}'],
    ignores: ['src/features/label/domain/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/features/customDesign/**', '**/customDesign/**'],
              message:
                'label must not import customDesign; extract shared code to app/, print/, or shared/.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/features/customDesign/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/features/label/**', '**/label/**'],
              message:
                'customDesign must not import label; extract shared code to app/, print/, or shared/.',
            },
          ],
        },
      ],
    },
  },
  // Layer: label math, composition, and template modules stay pure — no React
  // values, no platform adapters, no JSX. These live in the feature root rather
  // than a domain/ directory; per the plan's D3 the globs are enumerated here
  // instead of relocating the modules. Uses the typescript-eslint variant so it
  // stacks with the base no-restricted-imports rule above (the customDesign ban)
  // rather than replacing it, and so `import type` from react stays legal.
  {
    files: ['src/features/label/*.ts', 'src/features/label/templates/*.ts'],
    ignores: [
      'src/features/label/use*.ts',
      'src/features/label/templates/use*.ts',
      '**/*.test.ts',
    ],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react',
              message: 'Label math and composition modules must not import React values.',
              allowTypeImports: true,
            },
            {
              name: 'react-dom',
              message: 'Label math and composition modules must not import React DOM.',
              allowTypeImports: true,
            },
          ],
          patterns: [
            {
              group: ['**/platform/**', '**/platform'],
              message: 'Label math and composition modules must not import platform adapters.',
            },
            {
              group: ['**/components/**'],
              message: 'Label math and composition modules must not import UI components.',
            },
          ],
        },
      ],
    },
  },
  // Layer: use cases orchestrate I/O through ports, so they must not reach for a
  // concrete adapter. Exempt: `use*.ts` is a genuine React state wrapper around a
  // use case (shared by label and customDesign, so it cannot live in either), and
  // `exportLabelPng.ts` is the composition root whose job is to construct the
  // adapters and inject them into ExportLabelUseCase. The invariant this protects
  // is the one `shared/ports.ts` states: app-layer use cases depend on port
  // interfaces only.
  {
    files: ['src/app/**/*.ts'],
    ignores: ['src/app/use*.ts', 'src/app/exportLabelPng.ts', '**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react',
              message: 'Use cases must not import React; keep state in src/app/use*.ts.',
              allowTypeImports: true,
            },
            {
              name: 'react-dom',
              message: 'Use cases must not import React DOM.',
              allowTypeImports: true,
            },
          ],
          patterns: [
            {
              group: ['**/platform/**', '**/platform'],
              message:
                'Use cases must depend on shared/ports, not platform adapters; wire concretions in the composition root.',
            },
          ],
        },
      ],
    },
  },
  // Layer: shared print helpers and shared utilities sit below the features, so
  // they must not import one. React types are allowed (shared/cssVars.ts and the
  // typography CSS-var helpers legitimately need CSSProperties); React values are not.
  {
    files: ['src/print/**/*.ts', 'src/shared/**/*.ts'],
    ignores: ['**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react',
              message: 'Shared print/utility modules must not import React values.',
              allowTypeImports: true,
            },
            {
              name: 'react-dom',
              message: 'Shared print/utility modules must not import React DOM.',
              allowTypeImports: true,
            },
          ],
          patterns: [
            {
              group: ['**/features/**'],
              message:
                'Shared print/utility modules must not import a feature; dependencies point the other way.',
            },
          ],
        },
      ],
    },
  },
  // Layer: adapters implement ports and are called by the app — they must not
  // know about features.
  {
    files: ['src/platform/**/*.ts'],
    ignores: ['**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/features/**'],
              message:
                'Adapters must not import a feature; they implement shared/ports and are called from above.',
            },
          ],
        },
      ],
    },
  },
  // Layer: domain modules stay pure — no React, no platform adapters, no JSX.
  // Listed last so it wins over feature-level no-restricted-imports for domain paths.
  {
    files: ['src/**/domain/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react',
              message: 'Domain modules must not import React.',
            },
            {
              name: 'react-dom',
              message: 'Domain modules must not import React DOM.',
            },
          ],
          patterns: [
            {
              group: ['**/platform/**', '**/platform'],
              message: 'Domain modules must not import platform adapters.',
            },
            {
              group: ['**/components/**'],
              message: 'Domain modules must not import UI components.',
            },
          ],
        },
      ],
    },
  },
  // ADR 0005: Result values must be built with ok()/err(), not object literals.
  // Tests may assert against literal expected shapes; result.ts defines the type
  // and constructors. Proven with a probe on 2026-08-04 (clean-slate action 5).
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/shared/result.ts', '**/*.test.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ObjectExpression > Property[key.name="ok"]',
          message:
            'Construct Result values with ok()/err() from src/shared/result.ts, not object literals.',
        },
      ],
    },
  },
])
