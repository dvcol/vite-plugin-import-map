import chalk from 'chalk';

import { geRootPath, getWorkspace } from './import.utils';
import { extractAbsoluteVersion, workspaceRegex } from './regex.utils';

import type { PackageJson } from '../models/common.models';

import type { VersionHook, VersionOptions } from '../models/import-map.models';

/**
 * Parse the version of a dependency from the workspace configurations.
 *
 * @param {string} name - The name of the dependency.
 * @param {Object} options - Options for parsing the workspace version.
 * @param {PackageJson | undefined} [options.pkg] - The package.json object representing the package's metadata.
 * @param {boolean | undefined} [options.debug] - Enable debug mode for additional logging.
 * @param {boolean | undefined} [options.cache] - Enable caching of workspace versions.
 * @returns {string | undefined} - The parsed workspace version or undefined if not available.
 *
 * @example
 * const pkgJson = { dependencies: { 'example-package': 'workspace:^' } };
 * const workspaceVersion = parseWorkspaceVersion('example-package', { pkg: pkgJson, debug: true });
 * // Some package.json in the workspace with name example-package and version 1.1.0
 * // Result: '1.1.0'
 */
const parseWorkspaceVersion = (name: string, { pkg, debug, cache }: { pkg?: PackageJson; debug?: boolean; cache?: boolean }): string | undefined => {
  // resolve workspace version if repository.directory is set in package.json
  const workspace = getWorkspace({ cwd: geRootPath(pkg), debug, cache });
  const workspaceVersion = workspace[name]?.version;
  if (workspaceVersion) return extractAbsoluteVersion(workspaceVersion) ?? workspaceVersion;

  console.warn('[import-map-plugin]:', chalk.yellow('No workspace version found'), { name });
  if (debug) console.warn('[import-map-plugin]:', chalk.yellow('Generated workspace'), workspace);
};

/**
 * Parse the version of a dependency, considering both explicit versions and workspace configurations.
 *
 * @param {string} name - The name of the dependency.
 * @param {Object} options - Options for parsing the version.
 * @param {string | undefined} [options.version] - The version to parse.
 * @param {PackageJson | undefined} [options.pkg] - The package.json object representing the package's metadata.
 * @param {boolean | undefined} [options.debug] - Enable debug mode for additional logging.
 * @param {boolean | undefined} [options.cache] - Enable caching of workspace versions.
 *
 * @returns {string | undefined} - The parsed version or undefined if not available.
 *
 * @example
 * const pkgJson = { dependencies: { 'example-package': '^1.0.0' } };
 * const parsedVersion = parseVersion('example-package', { pkg: pkgJson, debug: true });
 * // Result: '1.0.0'
 */
export const parseVersion: VersionHook = (name: string, { version, pkg, debug, cache }: VersionOptions): string | undefined => {
  if (version && workspaceRegex.test(version)) return parseWorkspaceVersion(name, { pkg, debug, cache }) ?? version;
  if (version) return version;
  const _version = pkg?.dependencies?.[name];
  if (_version && workspaceRegex.test(_version)) return parseWorkspaceVersion(name, { pkg, debug, cache }) ?? _version;
  return extractAbsoluteVersion(_version) ?? _version;
};
