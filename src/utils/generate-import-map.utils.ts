import { computeUrl, toImport } from './import.utils';
import { parseVersion } from './version.utils';

import type { GenerateImportMapOptions, ImportMap, Imports } from '../models/import-map.models';

/**
 * Merge one or more import map into the left parameter.
 *
 * @param left {ImportMap} original import map object
 * @param rights {ImportMap[]} the list of import map object to be merged into the left parameter
 *
 * @return {ImportMap}
 */
export const mergeMaps = (left: ImportMap, ...rights: Partial<ImportMap>[]): ImportMap => {
  const merged: Required<ImportMap> = {
    ...left,
    imports: { ...(left?.imports ?? {}) },
    scopes: { ...(left?.scopes ?? {}) },
  };

  rights?.forEach(map => {
    if (map.imports) merged.imports = { ...merged.imports, ...map.imports };
    if (map.scopes) {
      Object.entries(map.scopes).forEach(([scope, _import]) => {
        merged.scopes[scope] = { ...(merged.scopes[scope] ?? {}), ..._import };
      });
    }
  });

  return merged;
};

/**
 * Generates an import map from an array of imports, merging it with an original import map.
 *
 * @param imports {Imports} - The imports to be added to the map.
 * @param map {ImportMap} - The original import map containing the current mappings.
 * @param domain {string | undefined} - The optional domain to prepend to import paths.
 * @param versionHook {VersionHook | undefined} - An optional method to parse or modify the version.
 * @param pkg {PackageJson | undefined}  - Package information, including dependencies.
 * @param debug {boolean | undefined}  - Enables debug logging
 * @param cache {boolean | undefined} - Enable caching of workspace versions.
 *
 * @returns {{ imports: ({ [key:string]: string } | {}) }} The generated import map, combining the original map with the new imports.
 */
export function generateImportMap(
  imports: Imports,
  map: ImportMap = { imports: {} },
  { domain: fallbackDomain, pkg, debug, cache, versionHook }: GenerateImportMapOptions,
): ImportMap {
  const pkgImports = pkg?.runtimeDependencies?.imports ?? {};

  const _imports = { ...pkgImports, ...imports };

  Object.entries(_imports).forEach(([name, entry]) => {
    const { version, domain = fallbackDomain, index = 'index.js', ...options } = toImport(entry);

    map.imports[name] = computeUrl({
      name,
      version: versionHook?.(name, { version, pkg, debug, cache, entry }) ?? version,
      domain,
      index,
      ...options,
    });
  });

  return map;
}

/**
 * Generates an import map from an array of imports, merging it with an original import map.
 * Uses {@link VersionHook} as default parsing function
 *
 * @param imports {Imports} - The imports to be added to the map.
 * @param map {ImportMap} - The original import map containing the current mappings.
 * @param options {GenerateImportMapOptions} - Additional options.
 *
 * @returns {{ imports: ({ [key:string]: string } | {}) }} The generated import map, combining the original map with the new imports.
 */
export const generateImportMapInferVersion = (imports: Imports, map: ImportMap, options: GenerateImportMapOptions): ImportMap =>
  generateImportMap(imports, map, { ...options, versionHook: parseVersion });
