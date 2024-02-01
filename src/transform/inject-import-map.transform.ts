import chalk from 'chalk';

import { generateImportMapInferVersion, mergeMaps } from '../utils/generate-import-map.utils';
import { extractMap, findFirstModuleScriptInHead, insertTextAtIndex, prettifyHtml } from '../utils/html.utils';
import { extractAbsoluteVersion, workspaceRegex } from '../utils/regex.utils';
import { parseWorkspaceVersion } from '../utils/version.utils';
import { writeFileJson } from '../utils/write-json.utils';

import type { PackageJson } from '../models/common.models';
import type { HtmlTransformHook, ImportMap, ImportMapTransformHook, InjectImportMapOptions, VersionOptions } from '../models/import-map.models';

/**
 * Attempt to parse workspace version if found, or coerce version to exact 3 digit semver version.
 * @param name - The name of the package
 * @param version - The version to test
 * @param pkg - The package json
 * @param debug - To enable debug logs
 * @param cache - To enable workspace caching (defaults to true)
 */
const resolveVersion = (name: string, { version, pkg, debug, cache }: VersionOptions) => {
  if (version && workspaceRegex.test(version)) return parseWorkspaceVersion(name, { pkg, debug, cache });
  return extractAbsoluteVersion(version);
};

type ValidateImportMap = {
  pkg?: PackageJson;
  scope?: string;
  debug?: boolean;
  strict?: boolean;
  transform?: ImportMapTransformHook;
};

type ScopeMatchingOptions = {
  name: string;
  version: string;
  scopes: ImportMap['scopes'];
  pkg?: PackageJson;
  scope?: string;
};

/**
 * Parse import map scopes and extract matching versions where possible
 * @param name - the name of the dependency to extract
 * @param version - the version fo match against
 * @param scopes - the map scopes to test
 * @param scope - the scope to match against
 * @param pkg - package.json information
 */
const findScopesWithNonMatchingVersion = ({ name, version, scopes, scope, pkg }: ScopeMatchingOptions) => {
  const match = new Map<string, string>();
  const invalid = new Set<string>();
  if (!scopes) return { match, invalid };
  const moduleScope = scope ?? pkg?.runtimeDependencies?.scope;
  if (!moduleScope) return { match, invalid };
  Object.entries(scopes).forEach(([_scope, _urls]) => {
    if (!_urls[name] || !new RegExp(moduleScope).test(_scope)) return;
    const mapVersion = _urls[name].match(new RegExp(`${name}@(\\d+\\.\\d+\\.\\d+)`))?.at(1);
    if (!mapVersion) return;
    if (mapVersion !== version) invalid.add(_scope);
    match.set(_scope, mapVersion);
  });
  return { match, invalid };
};

/**
 * Validate generated import map against local dependencies. If a dependency is present in the package.json but differ from the import map version, an error is raised.
 * @param map {ImportMap} - The generated import map to validate
 * @param pkg {PackageJson} - Package information, including dependencies.
 * @param scope {string} - The package's import scope
 * @param debug {boolean} - To enable debug logs
 * @param strict {boolean} - To enable strict validation of dependencies
 * @param transform {ImportMapTransformHook} - A hook executed before writing the final map
 */
export const validateImportMap = (map: ImportMap, { pkg, scope, strict, debug, transform }: ValidateImportMap) => {
  Object.entries(map.imports).forEach(([name, url]) => {
    let pkgVersion = pkg?.dependencies?.[name];
    // No local version, skip validation
    if (!pkgVersion) return;
    pkgVersion = resolveVersion(name, { version: pkgVersion, pkg, debug });
    // Could not resolve semver version, skip validation
    if (!pkgVersion) return;

    const { match: scopedVersions, invalid: invalidScopes } = findScopesWithNonMatchingVersion({
      name,
      version: pkgVersion,
      scopes: map.scopes,
      scope,
      pkg,
    });

    // At least one valid scope found and no invalid ones, import map valid
    if (scopedVersions.size && !invalidScopes.size) return;

    const importMapVersion = url.match(new RegExp(`${name}@(\\d+\\.\\d+\\.\\d+)`))?.at(1);

    // No invalid scope and import map matches
    if (!invalidScopes.size && (!importMapVersion || importMapVersion === pkgVersion)) return;

    if (scopedVersions.size > 1 && invalidScopes.size) {
      console.warn(
        '[import-map-plugin]:',
        chalk.yellow(`Dependency '${name}' matches multiple scopes. It might not match local version '${pkgVersion}'`),
        {
          name,
          pkgVersion,
          importMapVersion,
          scopedVersions,
        },
      );
    }

    if (strict) {
      const versions = [...new Set([...scopedVersions.values(), importMapVersion].filter(v => v && v !== pkgVersion))].join(', ');
      throw new Error(`[import-map-plugin]: Local '${pkgVersion}' and import map version(s) '${versions}' do not match for package '${name}'.`);
    }

    console.warn('[import-map-plugin]:', chalk.yellow('Local and import map versions do not match.'), {
      name,
      pkgVersion,
      importMapVersion,
      scopedVersions,
    });
  });

  return transform?.(map, { pkg, strict, debug }) ?? map;
};

/**
 * Injects import map into a html string.
 *
 * @see [import map]{@link https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap}
 *
 * @param id {string | undefined} - An id to attached to the import map. This is only  added if a new script is injected. Defaults to 'import-map-plugin'
 * @param imports {Imports | undefined} - The imports to be added to the map.
 * @param map {ImportMap | undefined} - An original import map containing some seed mappings.
 * @param transformMap {(map: ImportMap) => (ImportMap) | undefined} - A hook executed before writing the final map
 * @param scope {string | undefined} - The package's import scope
 * @param domain {string | undefined} - The optional domain to prepend to import paths.
 * @param pkg {PackageJson | undefined} - Package information, including dependencies.
 * @param debug {boolean | undefined} - To enable debug logs
 * @param strict {boolean | undefined} - To enable strict validation of dependencies
 * @param prettier {boolean | undefined} - To prettify mutated html
 * @param write {boolean | string | undefined} - To write the import-map as json file
 * @param cache {boolean | undefined} - Enable caching of workspace versions.
 *
 * @return {(html: string) => string} - A configured HTML plugin instance.
 */
export function injectImportMap({
  id = 'import-map-plugin',
  imports = {},
  map = { imports: {} },
  domain,
  scope,
  pkg,
  transformMap = _map => _map,
  debug = false,
  strict = true,
  prettier = true,
  write = false,
  cache = true,
}: InjectImportMapOptions): HtmlTransformHook {
  return html => {
    const { rawMap, parsedMap } = extractMap(html);
    if (debug && rawMap) console.info('[import-map-plugin]:', chalk.blue('Existing import map found'), parsedMap);

    const pkgMap = pkg?.runtimeDependencies?.map;
    if (debug && pkgMap) console.info('[import-map-plugin]:', chalk.blue('Package import map found'), pkgMap);

    const mergedMap = mergeMaps(parsedMap, pkgMap ?? {}, map);

    const generatedMap = generateImportMapInferVersion(imports, mergedMap, { domain, pkg, debug, cache });
    if (debug) console.info('[import-map-plugin]:', chalk.blue('Generated import map'), generatedMap);

    const postTransformMap = validateImportMap(generatedMap, { pkg, scope, debug, strict, transform: transformMap });

    if (write) {
      const path = typeof write === 'string' ? write : 'dist/import-map.json';
      writeFileJson(path, postTransformMap, { debug }).catch(err => {
        console.error('Failed to write import map to file.', { path, map: postTransformMap });
        console.error(err);
      });
    }

    const stringMap = `\n${JSON.stringify(postTransformMap, null, '\t')}\n`;

    let mutatedHtml;
    if (rawMap) {
      if (debug) console.info('[import-map-plugin]:', chalk.blue('Replacing existing map in index.html'));
      mutatedHtml = html.replace(rawMap, stringMap);
    } else {
      const index = findFirstModuleScriptInHead(html);
      if (debug) console.info('[import-map-plugin]:', chalk.blue('Injecting map at index'), index);
      mutatedHtml = insertTextAtIndex(html, `\n<script id="${id}" type="importmap">${stringMap}</script>\n`, index);
    }

    if (prettier) prettifyHtml(mutatedHtml, { debug, original: html });

    return mutatedHtml;
  };
}
