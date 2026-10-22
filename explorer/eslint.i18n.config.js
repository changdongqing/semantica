import globals from 'globals'
import tseslint from 'typescript-eslint'
import i18next from 'eslint-plugin-i18next'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

/**
 * Dedicated guard against new hardcoded JSX copy.
 *
 * It is intentionally narrower than the main ESLint config: only the i18next
 * rule runs, and only on JSX text nodes. Attributes and string literals are
 * covered by the extraction inventory / key-parity check instead.
 */
export default defineConfig([
  globalIgnores(['dist', 'src/i18n/**']),
  {
    files: ['src/**/*.{ts,tsx}'],
    linterOptions: { reportUnusedDisableDirectives: false },
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: globals.browser,
      parser: tseslint.parser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      'react-hooks': { rules: reactHooks.rules },
      'react-refresh': { rules: reactRefresh.rules },
      i18next,
    },
    rules: {
      'i18next/no-literal-string': [
        'error',
        {
          mode: 'jsx-text-only',
          'should-validate-template': false,
          words: {
            exclude: [
              'NSRP1', 'AgentMemory', 'null', 'SKE', 'SPARQL', '0\\.84', '1970', '2030',
              '·', '•', '→', '×', '%', '≈', '#', '\\(', '\\)', '\\?', '—', '/',
            ],
          },
        },
      ],
    },
  },
])
