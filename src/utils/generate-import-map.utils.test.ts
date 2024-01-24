import { describe, expect, it, vi } from 'vitest';

import { VersionHook } from '../models/import-map.models';

import { generateImportMap, generateImportMapInferVersion, mergeMaps } from './generate-import-map.utils';

describe('generate-import-map.utils.ts', () => {
  describe('mergeMaps', () => {
    it('should merge import maps', () => {
      expect.assertions(1);

      const mergedMap = mergeMaps(
        {
          imports: { a: 'path/a', b: 'path/b' },
          scopes: { scope1: { b: 'path/2b' } },
        },
        {
          imports: { c: 'path/c', b: 'path/2b' },
          scopes: { scope1: { d: 'path/2d' }, scope2: { e: 'path/2e' } },
        },
        {
          imports: { d: 'path/d' },
          scopes: { scope3: { d: 'path/3d' } },
        },
      );

      expect(mergedMap).toStrictEqual({
        imports: { a: 'path/a', c: 'path/c', b: 'path/2b', d: 'path/d' },
        scopes: {
          scope1: { b: 'path/2b', d: 'path/2d' },
          scope2: { e: 'path/2e' },
          scope3: { d: 'path/3d' },
        },
      });
    });
  });

  describe('generateImportMap', () => {
    const imports = { dep1: '1.0.0', dep2: '2.0.0', dep4: 'infer' };
    const existingMap = { imports: { existing: 'path/existing' } };
    const pkg = {
      runtimeDependencies: {
        map: {
          scopes: {
            pkg1: {
              dep1: '3.0.4',
            },
          },
        },
        imports: { dep3: '3.0.0' },
      },
      dependencies: {
        dep4: '1.3.9',
      },
    };

    it('should generate an import map while infering versions', () => {
      expect.assertions(1);

      const generatedMap = generateImportMapInferVersion(imports, existingMap, {
        domain: 'https://example.com',
        pkg,
      });

      expect(generatedMap).toStrictEqual({
        imports: {
          existing: 'path/existing',
          dep1: 'https://example.com/dep1@1.0.0/index.js',
          dep2: 'https://example.com/dep2@2.0.0/index.js',
          dep3: 'https://example.com/dep3@3.0.0/index.js',
          dep4: 'https://example.com/dep4@1.3.9/index.js',
        },
      });
    });

    const versionHook: VersionHook = vi.fn().mockImplementation((_, { entry }) => {
      return typeof entry === 'string' ? entry : entry?.version;
    });

    it('should generate an import map without inferring versions', () => {
      expect.assertions(2);

      const generatedMap = generateImportMap(imports, existingMap, {
        domain: 'https://example.com',
        pkg,
        versionHook,
      });

      expect(generatedMap).toStrictEqual({
        imports: {
          existing: 'path/existing',
          dep1: 'https://example.com/dep1@1.0.0/index.js',
          dep2: 'https://example.com/dep2@2.0.0/index.js',
          dep3: 'https://example.com/dep3@3.0.0/index.js',
          dep4: 'https://example.com/dep4@infer/index.js',
        },
      });

      expect(versionHook).toHaveBeenCalledTimes(4);
    });
  });
});
