import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/entry/import-map.entry.ts'],
  sourcemap: false,
  clean: true,
  dts: true,
  format: ['cjs', 'esm'],
});
