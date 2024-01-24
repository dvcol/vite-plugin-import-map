import chalk from 'chalk';
import { format } from 'prettier';

import type { ImportMap } from '../models/import-map.models';

/**
 * Inserts text into a string at a specific index.
 *
 * @param {string} originalString - The original string.
 * @param {string} insertionText - The text to be inserted.
 * @param {number} index - The index at which the text should be inserted.
 *
 * @throws Error - Index out of range.
 *
 * @returns {string} The modified string with the text inserted.
 */
export function insertTextAtIndex(originalString: string, insertionText: string, index?: number): string {
  if (!index || index < 0 || index > originalString.length) {
    throw new Error('[import-map-plugin]: Index out of range.');
  }

  return originalString.slice(0, index) + insertionText + originalString.slice(index);
}

/**
 * Prettifies the provided HTML string using prettier.
 *
 * @param {string} html - The input HTML string to be prettified.
 * @param {Object} options - Options for the prettification process.
 * @param {boolean} [options.debug=false] - Enable debug mode for logging additional information.
 * @param {string} [options.original] - The original HTML string for debugging purposes.
 *
 * @returns {string} - The prettified HTML string.
 *
 * @throws {Error} - If an error occurs during the prettification process.
 *
 * @example
 * const result = prettifyHtml('<div><p>Hello, World!</p></div>', { debug: true, original: '<div><p>Hello, World!</p></div>' });
 */
export const prettifyHtml = (html: string, { debug, original }: { debug?: boolean; original?: string }): string => {
  try {
    return format(html, { parser: 'html' });
  } catch (err) {
    if (debug) console.info('[import-map-plugin]:', chalk.blue('Generated Html'), { original, html });
    console.warn('[import-map-plugin]:', chalk.yellow('Failed to prettify html'), err);
  }
  return html;
};

const headRegex = /<head[^>]*>[\s\S]*?<\/head>/i;
const firstScriptRegex = /(?<!<!--\s*)<script[^>]*>[\s\S]*?<\/script>(?!\s*-->)/i;
const firstModuleScriptRegex = /(?<!<!--\s*)<script(?:\s[^>]*)?type=["'`]?module["'`]?[\s\S]*?<\/script>(?!\s*-->)/i;

/**
 * Finds the first <script> tag with type="module" inside the <head> section of an HTML document, or the first script tag if none exist, or the closing head tag and return its index.
 *
 * We target the first module tag as import map should be defined before any such tag.
 * We then target script tag as blocking call could inject module tag in the document.
 *
 * @param { string } htmlString - The HTML document as a string.
 *
 * @returns {number  | undefined}  The index of the first character of the matched <script> or the index of the closing head tag, or undefined if not found.
 */
export function findFirstModuleScriptInHead(htmlString: string): number | undefined {
  const head = htmlString.match(headRegex)?.at(0);
  if (!head) return;
  const headStartIndex = htmlString.indexOf(head);
  const moduleIndex = head.search(firstModuleScriptRegex);
  if (moduleIndex > -1) return headStartIndex + moduleIndex;
  const scriptIndex = head.search(firstScriptRegex);
  if (scriptIndex > -1) return headStartIndex + scriptIndex;
  const headCloseIndex = head.indexOf('</head>');
  if (headCloseIndex > -1) return headStartIndex + headCloseIndex;
}

const importMapRegex = /(?<!<!--\s*)<script[^>]*type=['"`]?importmap['"`]?[^>]*>([\s\S]*?)<\/script>(?!\s*-->)/gi;

/**
 * Parse html string document and extracts existing import map if any.
 *
 * @param  html {string} the original html document
 *
 * @throws Error - Invalid import map detected. An index file can only have one import map script.
 *
 * @returns {{ rawMap: string | undefined, parsedMap: ImportMap }} the parsed and raw extracted map
 */
export function extractMap(html: string): { rawMap?: string; parsedMap: ImportMap } {
  const groups = Array.from(html.matchAll(importMapRegex));
  if (groups.length > 1) {
    throw new Error('[import-map-plugin]: Invalid import map detected. An index file can only have one import map script.');
  }
  let rawMap;
  let parsedMap = { imports: {} };
  if (groups.length) {
    rawMap = groups.at(0)?.at(1);
    if (rawMap) {
      try {
        parsedMap = JSON.parse(rawMap);
      } catch (err) {
        console.error('[import-map-plugin]:', chalk.red('Failed to parse'), rawMap);
        throw err;
      }
    }
  }
  return { rawMap, parsedMap };
}
