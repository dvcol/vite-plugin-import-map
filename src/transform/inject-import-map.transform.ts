import chalk from 'chalk';

import { generateImportMapInferVersion, mergeMaps } from '../utils/generate-import-map.utils';
import { extractMap, findFirstModuleScriptInHead, insertTextAtIndex, prettifyHtml } from '../utils/html.utils';
import { extractAbsoluteVersion } from '../utils/regex.utils';
import { writeFileJson } from '../utils/write-json.utils';

import type {
  HtmlTransformHook,
  ImportMap,
  ImportMapTransformHook,
  InjectImportMapOptions,
  PackageJson,
} from '../models/import-map.models';

/**
 * Validate generated import map against local dependencies. If a dependency is present in the package.json but differ from the import map version, an error is raised.
 * @param map {ImportMap} - The generated import map to validate
 * @param pkg {PackageJson} - Package information, including dependencies.
 * @param debug {boolean} - To enable debug logs
 * @param strict {boolean} - To enable strict validation of dependencies
 * @param transform {ImportMapTransformHook} - A hook executed before writing the final map
 */
export const validateImportMap = (
  map: ImportMap,
  {
    pkg,
    strict,
    debug,
    transform,
  }: { pkg?: PackageJson; debug?: boolean; strict?: boolean; transform?: ImportMapTransformHook },
) => {
  Object.entries(map.imports).forEach(([name, url]) => {
    let pkgVersion = pkg?.dependencies?.[name];
    if (!pkgVersion) return;
    pkgVersion = extractAbsoluteVersion(pkgVersion);
    if (!pkgVersion) return;
    const importMapVersion = url.match(new RegExp(`${name}@(\\d+\\.\\d+\\.\\d+)`))?.at(1);
    if (importMapVersion && importMapVersion !== pkgVersion) {
      if (strict) {
        throw new Error(
          `[import-map-plugin]: Local '${pkgVersion}' and import map '${importMapVersion}' versions do not match for package '${name}'.`,
        );
      } else {
        console.warn('[import-map-plugin]:', chalk.yellow('Local and import map versions do not match.'), {
          name,
          pkgVersion,
          importMapVersion,
        });
      }
    }
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

    const postTransformMap = validateImportMap(generatedMap, { pkg, debug, strict, transform: transformMap });

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
