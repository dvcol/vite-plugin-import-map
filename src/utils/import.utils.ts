import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import chalk from 'chalk';

import { sync as globbySync } from 'globby';

import { Infer } from '../models/import-map.models';

import type { PackageJson } from '../models/common.models';

import type { Import, Imports, NamedImport } from '../models/import-map.models';
import type { GlobbyOptions } from 'globby';

/**
 * Convert a string or Import object into an Import
 * @param stringOrImport {Import | string}
 * @return {Import}
 */
export const toImport = (stringOrImport: Imports[number]): Import => {
  const _import: Import = typeof stringOrImport === 'string' ? { version: stringOrImport } : { ...stringOrImport };
  if (_import.version === Infer) delete _import.version;
  return _import;
};

/**
 * Merge all the elements from the right import into the left import.
 *
 * @param left {Import} original imports object
 * @param rights {Imports[]} the list of imports object to be merged into the left parameter
 *
 * @return {Imports}
 */
export const mergeImports = (left: Imports, ...rights: Imports[]): Imports => {
  const merged = { ...left };
  rights?.forEach(right =>
    Object.entries(right).forEach(([name, value]) => {
      const existing = merged[name];
      merged[name] = existing ? { ...toImport(existing), ...toImport(value) } : value;
    }),
  );

  return merged;
};

/**
 * Compute src url from an Import object
 *
 * @param name {string} - The name of the script/link
 * @param base {string} - The base url of the script/link
 * @param src {string} - Fully form url to override computation
 * @param version {string} - The version to build the url
 * @param domain {string} - The base domain to build the url
 * @param separator {string} - The version separator to compute script url
 * @param index {string} - The path to the entry file to build the url
 * @param defaultSeparator {string} - The fallback version separator to compute script url
 *
 * @return {string}
 */
export const computeUrl = (
  { name, base, src, version, domain, separator, index }: NamedImport,
  defaultSeparator: string | '@' | '/' = '@',
): string => {
  if (src) return src;

  if (!version) throw new Error(`[import-map-plugin]: No version could be resolved for '${name}'`);
  if (!domain) throw new Error(`[import-map-plugin]: No domain could be resolved for '${name}'`);

  return new URL([domain, `${base ?? name}${separator ?? defaultSeparator}${version}`, index].filter(Boolean).join('/')).toString();
};

type Workspace = Record<string, { name: string; version: string; path: string }>;

/** Workspace cache */
let workspace: Workspace;

/**
 * Retrieves a workspace based on specified options and caches the results.
 *
 * @param {Options & { debug?: boolean; cache?: boolean }} options - Options for configuring the workspace search.
 * @param {string | URL} [options.cwd=process.cwd()] - The working directory
 * @param {boolean} [options.gitignore=true] - Use gitignore rules for pattern matching.
 * @param {boolean} [options.onlyFiles=true] - Include only files in the results.
 * @param {string|string[]} [options.ignore=["node_modules"]] - Patterns to ignore during the search.
 * @param {boolean} [options.debug=false] - Enable debug mode for additional logging.
 * @param {boolean} [options.cache=true] - Enable caching of workspace versions.
 *
 * @returns {Record<string, { name: string; version: string; path: string }>} - A record representing the workspace with package information.
 *
 * @example
 * const workspace = getWorkspace({
 *   gitignore: true,
 *   onlyFiles: true,
 *   ignore: ["node_modules"],
 *   debug: false,
 *   cache: true,
 *   // Additional globby options
 * });
 * // Result: { 'package1': { name: 'package1', version: '1.0.0', path: '/path/to/package1/package.json' }, ... }
 */
export const getWorkspace = ({
  cwd = process.cwd(),
  gitignore = true,
  onlyFiles = true,
  ignore = ['node_modules', '**/node_modules/**'],

  debug = false,
  cache = true,

  ...options
}: GlobbyOptions & { debug?: boolean; cache?: boolean } = {}): Workspace => {
  if (!workspace || !cache) {
    const files: string[] = globbySync('**/package.json', {
      ...options,
      gitignore,
      onlyFiles,
      ignore,
      cwd,
    });

    if (debug) {
      console.info('[import-map-plugin]:', chalk.blue(`${workspace ? 'Re-building' : 'Building'} workspace cache`));
    }
    workspace = files.reduce<Record<string, { name: string; version: string; path: string }>>((versions, path) => {
      const resolvedPath = resolve(cwd.toString(), path);
      const { name, version } = JSON.parse(readFileSync(resolvedPath, { encoding: 'utf-8' }));
      versions[name] = { name, version, path: resolvedPath };
      versions[name] = { name, version, path: resolvedPath };
      return versions;
    }, {});
  }

  return workspace;
};

const segmentRegex = /[^/]+/g;

/**
 * Gets the root path based on the provided package.json's repository directory.
 *
 * @param {PackageJson} [pkg] - The package.json object representing the package's metadata.
 * @returns {string | undefined} - The root path or undefined if not available.
 *
 * @example
 * const pkgJson = { repository: { directory: 'path/to/root' } };
 * const rootPath = getRootPath(pkgJson);
 * // Result: 'path/to/root'
 */
export const geRootPath = (pkg?: PackageJson): string | undefined => pkg?.repository?.directory?.replace(segmentRegex, '..');
