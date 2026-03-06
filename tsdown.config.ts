import {defineConfig} from 'tsdown'

export default defineConfig({
  entry: ['./src/index.ts'],
  dts: true,
  fixedExtension: true,
  format: ['esm', 'cjs'],
  platform: 'neutral',
  sourcemap: true,
  target: 'es2017',
  unbundle: true
})
