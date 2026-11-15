// @ts-check
import prettier from 'eslint-config-prettier'
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  {
    ignores: ['.output/**', '.nuxt/**', 'coverage/**', '.firebase/**', 'node_modules/**'],
  },
  // Must stay last: turns off any rule that would fight Prettier.
  prettier,
)
