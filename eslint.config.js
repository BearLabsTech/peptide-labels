import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
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
              group: ['**/*.tsx'],
              message: 'Domain modules must not import JSX modules.',
            },
          ],
        },
      ],
    },
  },
])
