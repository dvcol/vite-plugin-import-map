import { describe, expect, it, vi } from 'vitest';

import { generateImportMap, generateImportMapInferVersion, mergeMapByScope, mergeMaps } from './generate-import-map.utils';

import type { ImportMapTemplate, Imports, PackageJson } from '../models/common.models';
import type { ImportMap, VersionHook } from '../models/import-map.models';

describe('generate-import-map.utils.ts', () => {
  describe('mergeMaps', () => {
    it('should merge import maps', () => {
      expect.assertions(1);

      const mergedMap = mergeMaps<ImportMap>(
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

  describe('mergeMapByScope', () => {
    const map = {
      imports: {
        dep1: 'http://domain.path/index1.js',
        dep2: 'http://domain.path/index2.js',
        dep3: 'http://domain.path/index3.js',
      },
    };

    const entry1: [string, ImportMap] = [
      '/package1/version/',
      {
        imports: {
          dep1: 'http://domain.path/index1.js',
          dep2: 'http://domain.path/package1/index2.js',
          dep3: 'http://domain.path/index3.js',
        },
        scopes: {
          '/package1/version/': {
            dep4: 'http://domain.path/scoped/index4.js',
          },
        },
      },
    ];

    const entry2: [string, ImportMap] = [
      '/package2/version/',
      {
        imports: {
          dep1: 'http://domain.path/index1.js',
          dep3: 'http://domain.path/package2/index3.js',
          dep4: 'http://domain.path/index4.js',
        },
        scopes: {
          '/package1/version/': {
            dep1: 'http://domain.path/scoped/index1.js',
          },
          '/package2/version/': {
            dep3: 'http://domain.path/package2/index3.js',
          },
        },
      },
    ];

    it('should merge without issue', () => {
      expect.assertions(1);

      expect(mergeMapByScope([entry1, entry2], map)).toStrictEqual({
        imports: {
          dep1: 'http://domain.path/index1.js',
          dep2: 'http://domain.path/index2.js',
          dep3: 'http://domain.path/index3.js',
          dep4: 'http://domain.path/index4.js',
        },
        scopes: {
          '/package1/version/': {
            dep1: 'http://domain.path/scoped/index1.js',
            dep2: 'http://domain.path/package1/index2.js',
            dep4: 'http://domain.path/scoped/index4.js',
          },
          '/package2/version/': {
            dep3: 'http://domain.path/package2/index3.js',
          },
        },
      });
    });

    it('should throw error when merging imports', () => {
      expect.assertions(1);

      expect(() =>
        mergeMapByScope([entry1, entry2], {
          ...map,
          scopes: {
            '/package1/version/': {
              dep2: 'http://domain.this-will-cause-conflict/index.js',
            },
          },
        }),
      ).toThrow("Import map import conflict for dependency 'dep2' and scope '/package1/version/'");
    });

    it('should throw error when merging scopes', () => {
      expect.assertions(1);

      expect(() =>
        mergeMapByScope(
          [
            [
              entry1[0],
              {
                ...entry1[1],
                imports: {
                  ...entry1[1].imports,
                  dep1: 'http://domain.this-will-cause-conflict/index.js',
                },
              },
            ],
            entry2,
          ],
          map,
        ),
      ).toThrow("Import map scope conflict for dependency 'dep1' and scope '/package2/version/'");
    });
  });

  describe('generateImportMap', () => {
    const imports: Imports = {
      dep1: '1.0.0',
      dep2: '2.0.0',
      dep4: 'infer',
      dep5: 'http://my-custom-domain/my-custom/path/entry.js',
      dep6: {
        version: '2.3.4',
        domain: 'https://another-custom-domain',
        index: 'my-custom-index.js',
      },
    };
    const pkg: PackageJson = {
      runtimeDependencies: {
        map: {
          scopes: {
            pkg1: {
              dep1: '3.0.4',
            },
            pkg2: {
              dep7: 'http://my-direct-scoped-pacakge-url/entry.js',
              dep8: 'custom-scoped-package-version',
              dep9: {
                version: 'package-scoped-2.3.4',
                domain: 'https://another-scoped-package',
                index: 'my-custom-scoped-package-index.js',
              },
              dep10: 'infer',
              dep14: 'this-should-be-overridden',
            },
          },
        },
        imports: { dep3: '3.0.0' },
        scopes: {
          pkg2: {
            dep15: 'this-should-not-be-overridden',
          },
          pkg3: {
            dep16: {
              version: 'top-level-scope',
              domain: 'https://another-scoped-package',
              index: 'top-level-index.js',
            },
          },
        },
      },
      dependencies: {
        dep4: '1.3.9',
        dep10: '1.10.1',
        dep14: '1.14.1',
      },
    };

    const existingMap: ImportMapTemplate = {
      imports: { existing: './path/existing' },
      scopes: {
        pkg2: {
          dep11: 'http://my-direct-scoped-url/entry.js',
          dep12: 'custom-scoped-version',
          dep13: {
            version: 'scoped-2.3.4',
            domain: 'https://another-scoped-custom-domain',
            index: 'my-custom-scoped-index.js',
          },
          dep14: 'infer',
        },
      },
    };

    it('should generate an import map while inferring versions', () => {
      expect.assertions(1);

      const generatedMap = generateImportMapInferVersion(imports, existingMap, {
        domain: 'https://example.com',
        pkg,
      });

      expect(generatedMap).toStrictEqual({
        imports: {
          dep1: 'https://example.com/dep1@1.0.0/index.js',
          dep2: 'https://example.com/dep2@2.0.0/index.js',
          dep3: 'https://example.com/dep3@3.0.0/index.js',
          dep4: 'https://example.com/dep4@1.3.9/index.js',
          dep5: 'http://my-custom-domain/my-custom/path/entry.js',
          dep6: 'https://another-custom-domain/dep6@2.3.4/my-custom-index.js',
          existing: './path/existing',
        },
        scopes: {
          pkg1: {
            dep1: 'https://example.com/dep1@3.0.4/index.js',
          },
          pkg2: {
            dep10: 'https://example.com/dep10@1.10.1/index.js',
            dep11: 'http://my-direct-scoped-url/entry.js',
            dep12: 'https://example.com/dep12@custom-scoped-version/index.js',
            dep13: 'https://another-scoped-custom-domain/dep13@scoped-2.3.4/my-custom-scoped-index.js',
            dep14: 'https://example.com/dep14@1.14.1/index.js',
            dep15: 'https://example.com/dep15@this-should-not-be-overridden/index.js',
            dep7: 'http://my-direct-scoped-pacakge-url/entry.js',
            dep8: 'https://example.com/dep8@custom-scoped-package-version/index.js',
            dep9: 'https://another-scoped-package/dep9@package-scoped-2.3.4/my-custom-scoped-package-index.js',
          },
          pkg3: {
            dep16: 'https://another-scoped-package/dep16@top-level-scope/top-level-index.js',
          },
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
          existing: './path/existing',
          dep1: 'https://example.com/dep1@1.0.0/index.js',
          dep2: 'https://example.com/dep2@2.0.0/index.js',
          dep3: 'https://example.com/dep3@3.0.0/index.js',
          dep4: 'https://example.com/dep4@infer/index.js',
          dep5: 'http://my-custom-domain/my-custom/path/entry.js',
          dep6: 'https://another-custom-domain/dep6@2.3.4/my-custom-index.js',
        },
        scopes: {
          pkg1: {
            dep1: 'https://example.com/dep1@3.0.4/index.js',
          },
          pkg2: {
            dep10: 'https://example.com/dep10@infer/index.js',
            dep11: 'http://my-direct-scoped-url/entry.js',
            dep12: 'https://example.com/dep12@custom-scoped-version/index.js',
            dep13: 'https://another-scoped-custom-domain/dep13@scoped-2.3.4/my-custom-scoped-index.js',
            dep14: 'https://example.com/dep14@infer/index.js',
            dep15: 'https://example.com/dep15@this-should-not-be-overridden/index.js',
            dep7: 'http://my-direct-scoped-pacakge-url/entry.js',
            dep8: 'https://example.com/dep8@custom-scoped-package-version/index.js',
            dep9: 'https://another-scoped-package/dep9@package-scoped-2.3.4/my-custom-scoped-package-index.js',
          },
          pkg3: {
            dep16: 'https://another-scoped-package/dep16@top-level-scope/top-level-index.js',
          },
        },
      });

      expect(versionHook).toHaveBeenCalledTimes(18);
    });
  });
});
