import { sync as globbySync } from 'globby';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Infer } from '../models/import-map.models';

import { computeUrl, geRootPath, getWorkspace, mergeImports, toImport } from './import.utils';

vi.mock('globby', async () => {
  const actualGlobby = await vi.importActual('globby');
  return {
    ...actualGlobby,
    sync: vi
      .fn()
      .mockReturnValue([
        '/path/to/workspace/myModuleName1/package.json',
        '/path/to/workspace/AnotherName2/package.json',
        '/path/to/workspace/AThirdName3/package.json',
      ]),
  };
});

vi.mock('node:path', async () => {
  const actualPath = await vi.importActual('node:path');
  return {
    ...actualPath,
    resolve: vi.fn().mockImplementation((cwd, path) => {
      console.error('mocked resolve', { cwd, path });
      return `${cwd.startsWith('/mocked') ? cwd : '/mocked/default/cwd'}${path}`;
    }),
  };
});

vi.mock('node:fs', async () => {
  const actualFs = await vi.importActual('node:fs');
  return {
    ...actualFs,
    readFileSync: vi.fn().mockImplementation(path => {
      const split = path.split('/');
      const [, name, version] = split.at(split.length - 2)?.match(/(\w+)(\d+)/) ?? [];
      return JSON.stringify({
        name,
        version: `${version}.0.0`,
      });
    }),
  };
});

describe('import.utils.ts', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('toImport', () => {
    it('should converts string or Import object into an Import', () => {
      expect.assertions(2);

      expect(toImport('1.2.3')).toStrictEqual({ version: '1.2.3' });
      expect(toImport({ version: '4.5.6' })).toStrictEqual({ version: '4.5.6' });
    });

    it(`should converts string or Import object into an Import and strip "infer" version`, () => {
      expect.assertions(2);

      expect(toImport(Infer)).toMatchObject({});
      expect(toImport({ version: Infer, base: 'base', index: 'custom-index.js' })).toStrictEqual({
        base: 'base',
        index: 'custom-index.js',
      });
    });
  });

  describe('mergeImports', () => {
    it('should merges all simple elements from the right import into the left import', () => {
      expect.assertions(1);

      const result = mergeImports(
        { a: { version: '1.0.0' } },
        { b: { version: '2.0.0' } },
        { c: { version: '3.0.0' } },
      );

      expect(result).toStrictEqual({ a: { version: '1.0.0' }, b: { version: '2.0.0' }, c: { version: '3.0.0' } });
    });

    it('should merges all nested elements from the right import into the left import', () => {
      expect.assertions(1);

      const result = mergeImports(
        { a: { version: '1.0.0', base: 'base' } },
        {
          a: { version: '1.0.0', base: 'baseOverride', index: 'index.js' },
          b: { version: '2.0.0' },
        },
        { c: { version: '3.0.0' }, b: { domain: 'my-domain' } },
      );

      expect(result).toStrictEqual({
        a: { version: '1.0.0', base: 'baseOverride', index: 'index.js' },
        b: { version: '2.0.0', domain: 'my-domain' },
        c: { version: '3.0.0' },
      });
    });
  });

  describe('mergeImports', () => {
    it('should computes src url from an Import object', () => {
      expect.assertions(1);

      expect(
        computeUrl({
          name: 'name',
          version: '1.2.3',
          domain: 'https://example.com',
          index: 'index.js',
        }),
      ).toBe('https://example.com/name@1.2.3/index.js');
    });

    it('should computes src url from an Import object with base object', () => {
      expect.assertions(1);

      expect(
        computeUrl({
          name: 'name',
          base: 'base',
          version: '1.2.3',
          domain: 'https://example.com',
          index: 'index.js',
        }),
      ).toBe('https://example.com/base@1.2.3/index.js');
    });

    it('should just return the src', () => {
      expect.assertions(1);

      expect(
        computeUrl({
          name: 'name',
          base: 'base',
          version: '1.2.3',
          domain: 'https://example.com',
          index: 'index.js',
          src: 'https://just-src.com',
        }),
      ).toBe('https://just-src.com');
    });

    it('should throw error if version is missing', () => {
      expect.assertions(1);

      expect(() =>
        computeUrl({
          name: 'name',
          base: 'base',
          domain: 'https://example.com',
          index: 'index.js',
        }),
      ).toThrow(`[import-map-plugin]: No version could be resolved for 'name'`);
    });

    it('should throw error if domain is missing', () => {
      expect.assertions(1);

      expect(() =>
        computeUrl({
          name: 'name',
          base: 'base',
          version: '1.2.3',
          index: 'index.js',
        }),
      ).toThrow(`[import-map-plugin]: No domain could be resolved for 'name'`);
    });

    it('should throw error if URL is malformed', () => {
      expect.assertions(1);

      expect(() =>
        computeUrl({
          name: 'name',
          base: 'base',
          version: '1.2.3',
          domain: 'example.com',
          index: 'index.js',
        }),
      ).toThrow(`Invalid URL`);
    });

    it('should not throw error if version is missing but src is provided', () => {
      expect.assertions(1);

      expect(
        computeUrl({
          name: 'name',
          base: 'base',
          domain: 'https://example.com',
          index: 'index.js',
          src: 'https://just-src.com',
        }),
      ).toBe('https://just-src.com');
    });
  });

  describe('getWorkspace', () => {
    it('should return the workspace with default cwd', () => {
      expect.assertions(1);

      const cwd = '/mocked/default/cwd';

      expect(getWorkspace({ cache: false })).toStrictEqual({
        AThirdName: {
          name: 'AThirdName',
          path: `${cwd}/path/to/workspace/AThirdName3/package.json`,
          version: '3.0.0',
        },
        AnotherName: {
          name: 'AnotherName',
          path: `${cwd}/path/to/workspace/AnotherName2/package.json`,
          version: '2.0.0',
        },
        myModuleName: {
          name: 'myModuleName',
          path: `${cwd}/path/to/workspace/myModuleName1/package.json`,
          version: '1.0.0',
        },
      });
    });

    it('should return the workspace with custom cwd', () => {
      expect.assertions(1);

      const cwd = '/mocked/custom/cwd';

      expect(getWorkspace({ cwd, cache: false })).toStrictEqual({
        AThirdName: {
          name: 'AThirdName',
          path: `${cwd}/path/to/workspace/AThirdName3/package.json`,
          version: '3.0.0',
        },
        AnotherName: {
          name: 'AnotherName',
          path: `${cwd}/path/to/workspace/AnotherName2/package.json`,
          version: '2.0.0',
        },
        myModuleName: {
          name: 'myModuleName',
          path: `${cwd}/path/to/workspace/myModuleName1/package.json`,
          version: '1.0.0',
        },
      });
    });

    it('should not rebuild cache', () => {
      expect.assertions(1);

      getWorkspace({ cache: false });
      getWorkspace({ cache: true });
      getWorkspace({ cache: true });

      expect(globbySync).toHaveBeenCalledTimes(1);
    });

    it('should not rebuild cache on each run', () => {
      expect.assertions(1);

      getWorkspace({ cache: false });
      getWorkspace({ cache: false });
      getWorkspace({ cache: false });

      expect(globbySync).toHaveBeenCalledTimes(3);
    });
  });

  describe('geRootPath', () => {
    it('should return the root path', () => {
      expect.assertions(1);

      expect(geRootPath({ repository: { directory: 'path/to/root' } })).toBe('../../..');
    });

    it('should fail to return the root path', () => {
      expect.assertions(1);

      expect(geRootPath({ repository: {} })).toBeUndefined();
    });
  });
});
