import type { ImportMap } from '../models/import-map.models';
export { generateImportMap } from '../utils/generate-import-map.utils';

function createImportMapDomScript(
  map: ImportMap,
  { onload, onerror }: Partial<Pick<HTMLScriptElement, 'onload' | 'onerror'>> = {},
): HTMLScriptElement {
  const mapScript = document.createElement('script');
  mapScript.type = 'importmap';
  mapScript.text = JSON.stringify(map);
  if (onload) mapScript.onload = onload;
  if (onerror) mapScript.onerror = onerror;
  return mapScript;
}

function insertNode(selector: string, node: Node, debug = false): Element | null {
  const script = document.head.querySelector(selector);
  if (script?.parentNode) {
    if (debug) console.info(`Module '${selector}' found, injecting map...`, { map: node, sibling: script });
    script.parentNode.insertBefore(node, script);
    return script;
  }
  return null;
}

export const injectImportMapInDom = (
  map: ImportMap,
  { debug = false, ...options }: { debug?: boolean } & Partial<Pick<HTMLScriptElement, 'onload' | 'onerror'>>,
) => {
  if (debug) console.info('Injecting map', map);

  const mapScript = createImportMapDomScript(map, options);

  if (document.head.children.length) {
    const firstModuleScript = insertNode('script[type="module"]', mapScript, debug);
    if (firstModuleScript) return { map, mapScript };

    const firstScript = insertNode('script', mapScript, debug);
    if (firstScript) return { map, mapScript };
  }

  if (debug) console.info('No script found in head, injecting map...', { map: mapScript, parent: document.head });
  document.head.appendChild(mapScript);
  return { map, mapScript };
};
