import { Plugin } from 'vite';

import { ImportMapVitePluginOptions } from '../models/import-map.models';
import { injectImportMap } from '../transform/inject-import-map.transform';
import { injectScriptTags } from '../transform/inject-scripts.transform';

/**
 * Injects import map into an index.html with the help of the RollupPluginHTML.
 *
 * @see [import map]{@link https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap}
 * @see [html plugin]{@link https://github.com/rollup/plugins/tree/master/packages/html}
 *
 * @param id {string | undefined} - An id to attached to the import map. This is only  added if a new script is injected. Defaults to 'import-map-plugin'
 * @param imports {Imports | undefined} - The imports to be added to the map.
 * @param map {ImportMap | undefined} - An original import map containing some seed mappings.
 * @param transformMap {(map: ImportMap) => (ImportMap) | undefined} - A hook executed before writing the final map
 * @param scripts {Array<ScriptOrLink> | undefined} - The scripts to be added to the html string.
 * @param transformScripts {{(scripts: Array<ScriptOrLink>) => (Array<ScriptOrLink>) | undefined} - A hook executed before writing the final scripts
 * @param domain {string | {map:string scripts:string} | undefined} - The optional domain(s) to prepend to import paths.
 * @param pkg {PackageJson | undefined}  - Package information, including dependencies.
 * @param debug {boolean | undefined} - To enable debug logs
 * @param strict {boolean | undefined} - To enable strict validation of dependencies
 * @param prettier {boolean | undefined} - To prettify mutated html
 * @param write {boolean | string | undefined} - To write the import-map as json file
 * @param cache {boolean | undefined} - Enable caching of workspace versions.
 * @param plugin {Plugin | undefined} - Additional vite plugin definition.
 *
 * @return {Plugin} - A configured plugin instance.
 */
export function importMapVitePlugin(
  {
    id,
    imports,
    map,
    transformMap,
    scripts,
    transformScripts,
    domain,
    pkg,
    debug,
    strict,
    prettier,
    write,
    cache,
  }: ImportMapVitePluginOptions,
  plugin: Partial<Plugin> = {},
): Plugin {
  const { map: mapDomain, scripts: scriptsDomain } =
    domain && typeof domain !== 'string' ? domain : { map: domain, scripts: domain };
  return {
    ...plugin,
    name: 'import-map-vite-plugin',
    transformIndexHtml: html => {
      let mutatedHtml = html;

      if (imports || map || pkg?.runtimeDependencies?.map || pkg?.runtimeDependencies?.imports) {
        mutatedHtml = injectImportMap({
          id: id ? `${id}-import-map` : id,
          imports,
          map,
          transformMap,
          domain: mapDomain,
          pkg,
          debug,
          strict,
          prettier,
          write,
          cache,
        })(mutatedHtml);
      }

      if (scripts || pkg?.runtimeDependencies?.scripts) {
        mutatedHtml = injectScriptTags({
          id: id ? `${id}-scripts` : id,
          scripts,
          transformScripts,
          domain: scriptsDomain,
          pkg,
          debug,
          prettier,
        })(mutatedHtml);
      }

      return mutatedHtml;
    },
  };
}
