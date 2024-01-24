import { rollupPluginHTML, RollupPluginHtml, RollupPluginHTMLOptions } from '@web/rollup-plugin-html';

import { TransformHtmlFunction } from '@web/rollup-plugin-html/src/RollupPluginHTMLOptions';

import { injectImportMap } from '../transform/inject-import-map.transform';

import { injectScriptTags } from '../transform/inject-scripts.transform';

import type { ImportMapRollupPluginOptions } from '../models/import-map.models';

/**
 * Injects import map into an index.html with the help of the RollupPluginHTML.
 *
 * @see [import map]{@link https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap}
 * @see [html plugin]{@link https://github.com/rollup/plugins/tree/master/packages/html}
 *
 * @param input {string} - The path to the index.html to mutate
 * @param id {string | undefined} - An id to attached to the import map. This is only  added if a new script is injected. Defaults to 'import-map-plugin'
 * @param imports {Imports | undefined} - The imports to be added to the map.
 * @param map {ImportMap | undefined} - An original import map containing some seed mappings.
 * @param transformMap {(map: ImportMap) => (ImportMap) | undefined} - A hook executed before writing the final map
 * @param scripts {Array<ScriptOrLink> | undefined} - The scripts to be added to the html string.
 * @param transformScripts {{(scripts: Array<ScriptOrLink>) => (Array<ScriptOrLink>) | undefined} - A hook executed before writing the final scripts
 * @param domain {string | undefined} - The optional domain to prepend to import paths.
 * @param pkg {PackageJson | undefined}  - Package information, including dependencies.
 * @param debug {boolean | undefined} - To enable debug logs
 * @param strict {boolean | undefined} - To enable strict validation of dependencies
 * @param prettier {boolean | undefined} - To prettify mutated html
 * @param write {boolean | string | undefined} - To write the import-map as json file
 * @param cache {boolean | undefined} - Enable caching of workspace versions.
 * @param htmlOptions {RollupPluginHTMLOptions | undefined} - The original plugin options for the HTML rollup plugin.
 *
 * @return {RollupPluginHtml} - A configured HTML plugin instance.
 */
export function importMapRollupPlugin(
  {
    input,
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
  }: ImportMapRollupPluginOptions,
  htmlOptions: RollupPluginHTMLOptions = {},
): RollupPluginHtml {
  const { map: mapDomain, scripts: scriptsDomain } =
    domain && typeof domain !== 'string' ? domain : { map: domain, scripts: domain };

  const transformHtml: TransformHtmlFunction[] = [];

  if (imports || map || pkg?.runtimeDependencies?.map || pkg?.runtimeDependencies?.imports) {
    transformHtml.push(
      injectImportMap({
        id: id ? `${id}-import-map` : id,
        imports,
        map,
        domain: mapDomain,
        pkg,
        transformMap,
        debug,
        strict,
        prettier,
        write,
        cache,
      }),
    );
  }

  if (scripts || pkg?.runtimeDependencies?.scripts) {
    transformHtml.push(
      injectScriptTags({
        id: id ? `${id}-scripts` : id,
        scripts,
        transformScripts,
        domain: scriptsDomain,
        pkg,
        debug,
        prettier,
      }),
    );
  }

  if (htmlOptions.transformHtml) {
    transformHtml.push(
      ...(Array.isArray(htmlOptions.transformHtml) ? htmlOptions.transformHtml : [htmlOptions.transformHtml]),
    );
  }

  return rollupPluginHTML({
    ...htmlOptions,
    input,
    transformHtml,
  });
}
