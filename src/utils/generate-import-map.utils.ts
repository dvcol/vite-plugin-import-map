import { computeUrl, toImport } from './import.utils';
import { parseVersion } from './version.utils';

import type { ImportMapTemplate, Imports } from '../models/common.models';
import type { GenerateImportMapOptions, ImportMap } from '../models/import-map.models';

/**
 * Merge one or more import map into the left parameter.
 *
 * * <b>Important</b>
 *
 * This is a destructive process. Any import/scope conflict will be override by the last merged map.
 * If you want to resolve merge conflict, you might consider using {@link mergeMapByScope} instead.
 *
 * @param left {ImportMap} original import map object
 * @param rights {ImportMap[]} the list of import map object to be merged into the left parameter
 *
 * @return {ImportMap}
 */
export const mergeMaps = <T extends ImportMapTemplate = ImportMap>(left: T, ...rights: Partial<T>[]): T => {
  const merged = {
    ...left,
    imports: { ...(left?.imports ?? {}) },
    scopes: { ...(left?.scopes ?? {}) },
  };

  rights?.forEach(map => {
    if (map.imports) merged.imports = { ...merged.imports, ...map.imports };
    if (!map.scopes) return;
    Object.entries(map.scopes).forEach(([scope, _import]) => {
      merged.scopes[scope] = { ...(merged.scopes[scope] ?? {}), ..._import };
    });
  });

  return merged;
};

/**
 * Merge one or more import map into a consolidated import map.
 *
 * Where possible, import conflicts are resolved by creating scoped resolution, if none is possible, an error is thrown.
 *
 * @param entries - An array of import maps with their associated scope
 *
 * @throws - Error when a import conflict can't be auto-resolved.
 */
export function mergeMapByScope(entries: [string, ImportMap][], map?: ImportMap): ImportMap {
  const merged: Required<ImportMap> = { imports: {}, scopes: {}, ...map };

  if (!entries.length) return merged;

  entries.forEach(([scope, _map]) => {
    if (_map.scopes) {
      Object.entries(_map.scopes).forEach(([_scope, _entries]) => {
        if (!merged.scopes?.[_scope]) {
          merged.scopes[_scope] = { ..._entries };
          return;
        }

        Object.entries(_entries).forEach(([_dep, _url]) => {
          if (!merged.scopes[_scope][_dep]) {
            merged.scopes[_scope][_dep] = _url;
          } else if (merged.scopes[_scope][_dep] !== _url) {
            console.warn('Import map scope conflict', {
              scope,
              dependency: _dep,
              url: _url,
              existing: {
                import: merged.imports?.[_dep],
                scope: merged.scopes[scope]?.[_dep],
              },
            });
            throw new Error(`Import map scope conflict for dependency '${_dep}' and scope '${scope}'`);
          }
        });
      });
    }
    if (_map.imports) {
      Object.entries(_map.imports).forEach(([_dep, _url]) => {
        const existingImport = merged.imports[_dep];
        const existingScopeImport = merged.scopes[scope]?.[_dep];

        if (!existingImport || merged.imports[_dep] === _url) {
          merged.imports[_dep] = _url;
        } else if (existingScopeImport === _url || !existingScopeImport) {
          merged.scopes[scope] = { ...merged.scopes[scope], [_dep]: _url };
        } else {
          console.warn('Import map import conflict', {
            scope,
            dependency: _dep,
            url: _url,
            existing: { import: existingImport, scope: existingScopeImport },
          });
          throw new Error(`Import map import conflict for dependency '${_dep}' and scope '${scope}'`);
        }
      });
    }
  });
  return merged;
}

/**
 * Parses an import template to resolve the final url
 *
 * @param name {string} - The name of the import's dependency/entry file
 * @param entry {string} - The dependency/entry file to transform
 * @param options {GenerateImportMapOptions} - Options passed to the parsing functions
 * @param options.domain {string | undefined} - The optional domain to prepend to import paths.
 * @param options.versionHook {VersionHook | undefined} - An optional method to parse or modify the version.
 * @param options.pkg {PackageJson | undefined}  - Package information, including dependencies.
 * @param options.debug {boolean | undefined}  - Enables debug logging
 * @param options.cache {boolean | undefined} - Enable caching of workspace versions.
 *
 * @returns {string} The computed entry's url
 */
export function parseImport(
  name: string,
  entry: string | Imports,
  { domain: fallbackDomain, pkg, debug, cache, versionHook }: GenerateImportMapOptions,
): string {
  const { version, domain = fallbackDomain, index = 'index.js', ...options } = toImport(entry);

  return computeUrl({
    name,
    version: versionHook?.(name, { version, pkg, debug, cache, entry }) ?? version,
    domain,
    index,
    ...options,
  });
}

/**
 * Parses import map template to resolve scopes import templates
 *
 * @param map {ImportMap} - The original import map containing the current mappings.
 * @param options {GenerateImportMapOptions} - Options passed to the parsing functions
 * @param options.domain {string | undefined} - The optional domain to prepend to import paths.
 * @param options.versionHook {VersionHook | undefined} - An optional method to parse or modify the version.
 * @param options.pkg {PackageJson | undefined}  - Package information, including dependencies.
 * @param options.debug {boolean | undefined}  - Enables debug logging
 * @param options.cache {boolean | undefined} - Enable caching of workspace versions.
 *
 * @returns {{ imports: ({ [key:string]: string } | {}) }} The generated import map, resolving the scopes to urls
 */
export function parseMapScopesTemplate(map?: ImportMapTemplate, options: GenerateImportMapOptions = {}): ImportMap {
  if (!map?.scopes) return map as ImportMap;
  Object.entries(map.scopes).forEach(([_scope, _imports]) => {
    if (!_imports) return;
    Object.entries(_imports).forEach(([_name, _import]) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- within if and forEach
      map.scopes![_scope][_name] = parseImport(_name, _import, options);
    });
  });

  return map as ImportMap;
}

/**
 *  Parses import map template to resolve import templates
 *
 * @param map {ImportMap} - The original import map containing the current mappings.
 * @param options {GenerateImportMapOptions} - Options passed to the parsing functions
 */
export function parseMapImports(map: ImportMapTemplate = { imports: {} }, options: GenerateImportMapOptions = {}): ImportMap {
  if (!map.imports) return map as ImportMap;
  Object.entries(map.imports).forEach(([name, entry]) => {
    map.imports[name] = parseImport(name, entry, options);
  });
  return map as ImportMap;
}

/**
 * Parses import map template to resolve scopes import templates
 *
 * @param map {ImportMap} - The original import map containing the current mappings.
 * @param options {GenerateImportMapOptions} - Options passed to the parsing functions
 *
 * @returns {{ imports: ({ [key:string]: string } | {}) }} The generated import map, resolving the scopes to urls
 */
export function parseMapTemplate(map: ImportMapTemplate = { imports: {} }, options: GenerateImportMapOptions = {}): ImportMap {
  const _map = structuredClone<ImportMapTemplate>(map);
  parseMapImports(_map, options);
  parseMapScopesTemplate(_map, options);

  return _map as ImportMap;
}

/**
 * Generates an import map from an array of imports, merging it with an original import map.
 *
 * @param imports {Imports} - The imports to be added to the map.
 * @param map {ImportMap} - The original import map containing the current mappings.
 * @param options {GenerateImportMapOptions} - Options passed to the parsing functions
 * @param options.domain {string | undefined} - The optional domain to prepend to import paths.
 * @param options.versionHook {VersionHook | undefined} - An optional method to parse or modify the version.
 * @param options.pkg {PackageJson | undefined}  - Package information, including dependencies.
 * @param options.debug {boolean | undefined}  - Enables debug logging
 * @param options.cache {boolean | undefined} - Enable caching of workspace versions.
 *
 * @returns {{ imports: ({ [key:string]: string } | {}) }} The generated import map, combining the original map with the new imports.
 */
export function generateImportMap(imports: Imports, map: ImportMapTemplate = { imports: {} }, options: GenerateImportMapOptions): ImportMap {
  const pkgMap = { imports: {}, scopes: {}, ...options?.pkg?.runtimeDependencies?.map };

  const pkgImports = options?.pkg?.runtimeDependencies?.imports ?? {};
  const pkgScopes = options?.pkg?.runtimeDependencies?.scopes ?? {};

  const _map = mergeMaps(pkgMap, { imports: pkgImports, scopes: pkgScopes }, { imports }, map);

  return parseMapTemplate(_map, options);
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
export const generateImportMapInferVersion = (imports: Imports, map: ImportMapTemplate, options: GenerateImportMapOptions): ImportMap =>
  generateImportMap(imports, map, { ...options, versionHook: parseVersion });
