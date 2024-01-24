import chalk from 'chalk';

import {
  InjectScriptsOptions,
  isLinkTypeGuard,
  isScriptOrLinkAttributeTypeGuard,
  Script,
  ScriptAttributes,
  ScriptOrLink,
} from '../models/inject-script.models';

import { insertTextAtIndex, prettifyHtml } from '../utils/html.utils';
import { computeUrl } from '../utils/import.utils';

import type { HtmlTransformHook } from '../models/import-map.models';

/**
 * Creates an HTML script or link tag based on the provided script or link object and additional options.
 *
 * @param {ScriptOrLink} scriptOrLink - The script or link object containing information for the tag.
 * @param {Object} options - Additional options for creating the tag.
 * @param {string} options.id - The identifier for the script or link.
 * @returns {string} - The HTML script or link tag.
 *
 * @example
 * const scriptTag = createScriptTag({ name: 'myScript', src: 'path/to/script.js', version: '1.0' }, { id: 'uniqueId', domain: 'example.com' });
 */
export const createScriptTag = (scriptOrLink: ScriptOrLink, { id }: { id: string }): string => {
  const isLink = isLinkTypeGuard(scriptOrLink);

  const attributes: string[] = [];
  if (id) attributes.push(`data-id="${id}"`);

  const ignore = ['text'];
  const data = ['group', 'name', 'version'];

  Object.entries(scriptOrLink).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (isScriptOrLinkAttributeTypeGuard<ScriptAttributes>(key) && !ignore.includes(key)) {
      attributes.push(`${key}="${value}"`);
    } else if (data.includes(key)) {
      attributes.push(`data-${key}="${value}"`);
    }
  });

  if (isLink || !scriptOrLink.group) {
    const path = (isLink ? scriptOrLink.href : scriptOrLink.src) ?? computeUrl(scriptOrLink, '/');
    if (path) attributes.push(`${isLink ? 'href' : 'src'}="${path}"`);
  }

  if (isLink) return `<link ${attributes?.join(' ')} />`;
  return `<script ${attributes?.join(' ')}>${scriptOrLink.text ?? ''}</script>`;
};

/**
 * Merges an array of script objects into groups based on the 'group' property, and generates merged scripts.
 *
 * @param {ScriptOrLink[]} scripts - An array of script or link objects to be merged.
 * @returns {ScriptOrLink[]} - An array of merged script or link objects.
 *
 * @example
 * const scripts = [
 *   { src: 'script1.js', group: 'group1' },
 *   { src: 'script2.js', group: 'group1' },
 *   { src: 'script3.js', group: 'group2' },
 *   { src: 'script4.js' },
 * ];
 * const mergedScripts = mergeScripts(scripts);
 * // Result: [
 * //   { text: 'import "script1.js" import "script2.js"', group: 'group1' },
 * //   { text: 'import "script3.js"', group: 'group2' },
 * //   { src: 'script4.js' },
 * // ];
 */
export const mergeScripts = (scripts: ScriptOrLink[]): ScriptOrLink[] => {
  const mergedGroups: ScriptOrLink[] = [];
  const map = new Map<string, Script[]>();

  scripts.forEach(script => {
    if (isLinkTypeGuard(script) || !script.group) {
      mergedGroups.push(script);
    } else {
      map.set(script.group, [...(map.get(script.group) ?? []), script]);
    }
  });

  map.forEach(values => {
    let mergeGroup: Script | undefined = undefined;
    values.forEach((_script, index) => {
      if (index === 0) {
        mergeGroup = { ..._script, text: `import "${computeUrl(_script, '/')}"` };
        delete mergeGroup.name;
        delete mergeGroup.src;
        delete mergeGroup.version;
        delete mergeGroup.index;
        delete mergeGroup.separator;
        delete mergeGroup.domain;
      } else if (mergeGroup) {
        mergeGroup.text = [mergeGroup.text, `import "${computeUrl(_script, '/')}"`].join('\n');
      }
    });

    if (mergeGroup) mergedGroups.push(mergeGroup);
  });

  return mergedGroups;
};

/**
 * Injects scripts or links into a html string.
 *
 * @param id {string | undefined} - A data-id to attached to the scripts. Defaults to 'import-map-plugin'
 * @param scripts {Array<ScriptOrLink> | undefined} - The scripts to be added to the html string.
 * @param transformScripts {{(scripts: Array<ScriptOrLink>) => (Array<ScriptOrLink>) | undefined} - A hook executed before writing the final scripts
 * @param domain {string | undefined} - The optional domain to prepend to scripts paths.
 * @param pkg {PackageJson | undefined} - Package information, including dependencies.
 * @param debug {boolean | undefined} - To enable debug logs
 * @param prettier {boolean | undefined} - To prettify mutated html
 *
 * @return {(html: string) => string} - A configured HTML plugin instance.
 */
export function injectScriptTags({
  id = 'import-map-plugin',
  scripts = [],
  domain,
  pkg,
  transformScripts = scripts => scripts,
  debug = false,
  prettier = true,
}: InjectScriptsOptions): HtmlTransformHook {
  return html => {
    const pkgScripts = pkg?.runtimeDependencies?.scripts ?? [];

    if (pkgScripts?.length && debug) {
      console.info('[import-map-plugin]:', chalk.blue('Package scripts found'), pkgScripts);
    }

    const transformedScripts = mergeScripts(
      transformScripts([...pkgScripts, ...scripts]).map(_script => {
        if (!_script.domain) _script.domain = domain;
        return _script;
      }),
    );

    if (!transformedScripts?.length) {
      if (debug) console.warn('[import-map-plugin]:', chalk.yellow('No scripts found'), transformedScripts);
      return html;
    }

    const scriptTags = transformedScripts.map(script => createScriptTag(script, { id }));
    if (!scriptTags?.length) {
      if (debug) console.warn('[import-map-plugin]:', chalk.yellow('No script tags generated'), scriptTags);
      return html;
    } else if (debug) console.info('[import-map-plugin]:', chalk.blue('Injecting scripts'), scriptTags);

    const index = html.indexOf('</head>');
    if (debug) console.info('[import-map-plugin]:', chalk.blue('Injecting scripts at index'), index);

    const mutatedHtml = insertTextAtIndex(html, `\n${scriptTags.join('\n')}\n`, index);

    if (prettier) return prettifyHtml(mutatedHtml, { debug, original: html });
    return mutatedHtml;
  };
}
