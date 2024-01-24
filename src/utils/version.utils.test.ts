import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as ImportUtils from './import.utils';
import { parseVersion } from './version.utils';

describe('version.utils.ts', () => {
  describe('parseVersion', () => {
    const mockWorkspace = {
      moduleOne: {
        name: 'moduleOne',
        path: `/path/to/workspace/moduleOne/package.json`,
        version: '3.3.3',
      },
      moduleTwo: {
        name: 'moduleTwo',
        path: `/path/to/workspace/moduleTwo/package.json`,
        version: '2.2.2',
      },
      moduleThree: {
        name: 'moduleThree',
        path: `/path/to/workspace/moduleThree/package.json`,
        version: '1.1.1',
      },
    };

    beforeEach(() => {
      vi.spyOn(ImportUtils, 'getWorkspace').mockReturnValue(mockWorkspace);
    });

    const pkg = {
      dependencies: {
        [mockWorkspace.moduleOne.name]: '^1.0.0',
        [mockWorkspace.moduleTwo.name]: '^2.0.0',
        [mockWorkspace.moduleThree.name]: '^3.0.0',
      },
      runtimeDependencies: {
        imports: {
          [mockWorkspace.moduleOne.name]: '^1.0.0',
          [mockWorkspace.moduleTwo.name]: '^2.0.0',
          [mockWorkspace.moduleThree.name]: '^3.0.0',
        },
      },
    };

    it('should return version if it is custom', () => {
      expect.assertions(1);

      expect(parseVersion(mockWorkspace.moduleTwo.name, { version: 'custom-version', pkg })).toBe('custom-version');
    });

    it('should return version from dependencies if it exists and version is undefined', () => {
      expect.assertions(1);

      const name = mockWorkspace.moduleTwo.name;

      expect(parseVersion(name, { pkg })).toBe('2.0.0');
    });

    it('should return version from dependencies if it exists and is set to workspace(:+)', () => {
      expect.assertions(2);
      const name = mockWorkspace.moduleTwo.name;

      const _pkg = {
        ...pkg,
        dependencies: { ...pkg.dependencies, [name]: 'workspace:^' },
      };

      // directly resolve workspace
      expect(parseVersion(name, { version: 'workspace:*', pkg: _pkg })).toBe(mockWorkspace.moduleTwo.version);
      // resolve workspace from pkg dependency
      expect(parseVersion(name, { pkg: _pkg })).toBe(mockWorkspace.moduleTwo.version);
    });

    it('should fail to parse workspace version', () => {
      expect.assertions(3);

      const name = 'moduleUnknown';

      // package unknown in package.json and no version provided
      expect(parseVersion(name, { pkg })).toBeUndefined();

      const version = 'workspace:*';
      const _pkg = {
        ...pkg,
        dependencies: { ...pkg.dependencies, [name]: version },
      };

      // no version for package in workspace
      expect(parseVersion(name, { version, pkg })).toBe(version);
      // no version for package in workspace
      expect(parseVersion(name, { pkg: _pkg })).toBe(version);
    });
  });
});
