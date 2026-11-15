// @ts-check
import prettier from 'eslint-config-prettier'
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  {
    ignores: [
      '.output/**',
      '.nuxt/**',
      'coverage/**',
      '.vitest/**',
      '.firebase/**',
      'node_modules/**',
    ],
  },
  {
    // core/ is shared with future mobile apps: no framework, platform or backend imports.
    files: ['core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'vue',
                'vue/*',
                'vue-router',
                'nuxt',
                'nuxt/*',
                '@nuxt/*',
                '#*',
                '~/*',
                '~~/*',
                '@/*',
                'firebase',
                'firebase/*',
                'firebase-admin',
                'firebase-admin/*',
                '@firebase/*',
                'node:*',
              ],
              message: 'core/ must stay framework-agnostic (only zod and relative imports).',
            },
          ],
        },
      ],
    },
  },
  // Must stay last: turns off any rule that would fight Prettier.
  prettier,
)
