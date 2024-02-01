import { afterEach, describe, expect, it, vi } from 'vitest';

import * as VersionUtils from '../utils/version.utils';

import { injectImportMap, validateImportMap } from './inject-import-map.transform';

import type { ImportMap, InjectImportMapOptions } from '../models/import-map.models';

describe('inject-import-map.transform.ts', () => {
  // Mocking PackageJson and ImportMapTransformHook
  const mockPackageJson = {
    dependencies: {
      dependency1: '^1.0.0',
      dependency2: '^2.0.0',
    },
  };

  const mockTransform = vi.fn();

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('validateImportMap', () => {
    const validImportMap = {
      imports: {
        dependency1: '/path/to/dependency1@1.0.0/index.js',
        dependency2: '/path/to/dependency2@2.0.0/index.js',
      },
    };

    const spyParseWorkspace = vi.spyOn(VersionUtils, 'parseWorkspaceVersion');

    it('should validates a valid import map and not throw errors', () => {
      expect.assertions(2);
      // Validate a valid import map
      expect(() =>
        validateImportMap(validImportMap, {
          pkg: mockPackageJson,
          strict: true,
          transform: mockTransform,
        }),
      ).not.toThrow();
      expect(mockTransform).toHaveBeenCalledOnce();
    });

    it('should validates a valid import map and not throw errors when resolving from workspace', () => {
      expect.assertions(2);

      spyParseWorkspace.mockReturnValue('1.0.0');

      // Validate a valid import map
      expect(() =>
        validateImportMap(validImportMap, {
          pkg: {
            dependencies: {
              ...mockPackageJson.dependencies,
              dependency1: 'workspace:^',
            },
          },
          strict: true,
          transform: mockTransform,
        }),
      ).not.toThrow();
      expect(mockTransform).toHaveBeenCalledOnce();
    });

    it('should throw ot throw an error when there is no package.json', () => {
      expect.assertions(2);

      // Validate a valid import map
      expect(() =>
        validateImportMap(validImportMap, {
          strict: true,
          transform: mockTransform,
        }),
      ).not.toThrow();
      expect(mockTransform).toHaveBeenCalledOnce();
    });

    const invalidImportMap = {
      imports: {
        dependency1: '/path/to/dependency1@1.1.0/index.js',
        dependency2: '/path/to/dependency1@2.0.0/index.js',
      },
    };

    it('should not throw an error for an invalid import map in non-strict mode', () => {
      expect.assertions(2);

      // Validate a valid import map
      expect(() =>
        validateImportMap(invalidImportMap, {
          pkg: mockPackageJson,
          strict: false,
          transform: mockTransform,
        }),
      ).not.toThrow();
      expect(mockTransform).toHaveBeenCalledOnce();
    });

    it('should throw an error for an invalid import map in strict mode', () => {
      expect.assertions(1);

      // Validate an invalid import map in strict mode
      expect(() =>
        validateImportMap(invalidImportMap, {
          pkg: mockPackageJson,
          strict: true,
          transform: mockTransform,
        }),
      ).toThrow("[import-map-plugin]: Local '1.0.0' and import map version(s) '1.1.0' do not match for package 'dependency1'.");
    });

    it('should throw an error for an invalid import map in strict mode when resolved from workspace', () => {
      expect.assertions(1);

      spyParseWorkspace.mockReturnValue('9.9.9');

      // Validate an invalid import map in strict mode
      expect(() =>
        validateImportMap(invalidImportMap, {
          pkg: {
            dependencies: {
              ...mockPackageJson.dependencies,
              dependency1: 'workspace:^',
            },
          },
          strict: true,
          transform: mockTransform,
        }),
      ).toThrow("[import-map-plugin]: Local '9.9.9' and import map version(s) '1.1.0' do not match for package 'dependency1'.");
    });

    describe('scoped versions', () => {
      const scopedMap: ImportMap = {
        ...validImportMap,
        scopes: {
          '/scope1/': {
            dependency1: '/path/to/dependency1@1.1.0/index.js',
          },
          '/scope1/scope2/': {
            dependency1: '/path/to/dependency1@1.2.0/index.js',
          },
          '/scope1/scope2/scope3/': {
            dependency1: '/path/to/dependency1@1.1.0/index.js',
          },
        },
      };

      it('should not throw an error for an invalid scope when no scope is provided', () => {
        expect.assertions(2);

        // Validate a valid import map
        expect(() =>
          validateImportMap(scopedMap, {
            pkg: mockPackageJson,
            strict: true,
            transform: mockTransform,
          }),
        ).not.toThrow();
        expect(mockTransform).toHaveBeenCalledOnce();
      });

      it('should not throw an error for an invalid map when scope is valid', () => {
        expect.assertions(2);

        // Validate a valid import map
        expect(() =>
          validateImportMap(
            {
              ...invalidImportMap,
              scopes: {
                '/scope1/': {
                  dependency1: '/path/to/dependency1@1.0.0/index.js',
                },
              },
            },
            {
              pkg: mockPackageJson,
              strict: true,
              scope: '/scope1/',
              transform: mockTransform,
            },
          ),
        ).not.toThrow();
        expect(mockTransform).toHaveBeenCalledOnce();
      });

      it('should throw an error for an invalid import map when a scope overrides with an invalid version', () => {
        expect.assertions(1);

        // Validate an invalid import map in strict mode
        expect(() =>
          validateImportMap(scopedMap, {
            pkg: mockPackageJson,
            scope: '/scope2/',
            strict: true,
          }),
        ).toThrow("[import-map-plugin]: Local '1.0.0' and import map version(s) '1.2.0, 1.1.0' do not match for package 'dependency1'.");
      });

      it('should throw an error for an invalid import map when a scope override version with scope defined in pkg', () => {
        expect.assertions(1);

        // Validate an invalid import map in strict mode
        expect(() =>
          validateImportMap(scopedMap, {
            pkg: {
              ...mockPackageJson,
              runtimeDependencies: { scope: '/scope3/' },
            },
            strict: true,
          }),
        ).toThrow("[import-map-plugin]: Local '1.0.0' and import map version(s) '1.1.0' do not match for package 'dependency1'.");
      });
    });
  });

  describe('injectImportMap', () => {
    // Mocking other dependencies and utilities
    const mockHtml = '<html><head></head><body></body></html>';
    const mockImports = { dependency1: '^1.0.0' };
    const mockMap = { imports: { dependency2: '^2.0.0' } };
    const mockTransformMap = vi.fn(map => map);

    // Mocking InjectImportMapOptions
    const mockOptions: InjectImportMapOptions = {
      id: 'mock-id',
      imports: mockImports,
      map: mockMap,
      transformMap: mockTransformMap,
      domain: 'https://example.com',
      pkg: {
        runtimeDependencies: {
          map: {
            imports: {
              module1: '/path/to/module1.js',
              module2: '/path/to/module2.js',
            },
          },
          imports: {
            module3: '1.2.3',
            module4: '/path/to/module2.js',
            module5: 'infer',
          },
        },
        dependencies: { dependency3: '^3.0.0', module5: '4.5.6' },
      },
      debug: true,
      strict: true,
      prettier: true,
      write: 'dist/import-map.json',
      cache: true,
    };

    const injectMap = injectImportMap(mockOptions);

    it('should inject an import map', () => {
      expect.assertions(9);

      const mutatedHtml = injectMap(mockHtml);

      const generatedMap = {
        imports: {
          dependency1: 'https://example.com/dependency1@^1.0.0/index.js',
          dependency2: '^2.0.0',
          module1: '/path/to/module1.js',
          module2: '/path/to/module2.js',
          module3: 'https://example.com/module3@1.2.3/index.js',
          module4: 'https://example.com/module4@/path/to/module2.js/index.js',
          module5: 'https://example.com/module5@4.5.6/index.js',
        },
        scopes: {},
      };

      // Add your assertions here based on your expected behavior
      expect(mutatedHtml).toContain('<script id="mock-id" type="importmap">');
      expect(mockTransformMap).toHaveBeenCalledWith(generatedMap, {
        debug: mockOptions.debug,
        pkg: mockOptions.pkg,
        strict: mockOptions.strict,
      });

      Object.values(generatedMap.imports).forEach(url => {
        expect(mutatedHtml).toContain(url);
      });
    });

    it('should merge then inject an import map', () => {
      expect.assertions(12);

      const htmlWithImportMap = `
        <html>
          <head>
            <script id="existing-id" type="importmap">
              {
                "imports": {
                  "existing1": "/path/to/existing1.js",
                  "existing2": "/path/to/existing2.js"
                }
              }
            </script>
          </head>
          <body>
            <!-- Body content -->
          </body>
        </html>`;

      const mutatedHtml = injectMap(htmlWithImportMap);

      const generatedMap = {
        imports: {
          existing1: '/path/to/existing1.js',
          existing2: '/path/to/existing2.js',
          dependency1: 'https://example.com/dependency1@^1.0.0/index.js',
          dependency2: '^2.0.0',
          module1: '/path/to/module1.js',
          module2: '/path/to/module2.js',
          module3: 'https://example.com/module3@1.2.3/index.js',
          module4: 'https://example.com/module4@/path/to/module2.js/index.js',
          module5: 'https://example.com/module5@4.5.6/index.js',
        },
        scopes: {},
      };

      // Add your assertions here based on your expected behavior

      expect(mutatedHtml).not.toContain('<script id="mock-id" type="importmap">');
      expect(mutatedHtml).toContain('<script id="existing-id" type="importmap">');
      expect(mockTransformMap).toHaveBeenCalledWith(generatedMap, {
        debug: mockOptions.debug,
        pkg: mockOptions.pkg,
        strict: mockOptions.strict,
      });

      Object.values(generatedMap.imports).forEach(url => {
        expect(mutatedHtml).toContain(url);
      });
    });
  });
});
