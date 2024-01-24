import { afterEach, describe, expect, it } from 'vitest';

import { injectImportMapInDom } from './import-map.entry';

/**
 * @vitest-environment jsdom
 */
describe('import-map.entry.ts', () => {
  const scripts: Set<HTMLElement> = new Set();

  afterEach(() => {
    // Restore the original head after each test
    if (scripts?.size) {
      scripts.forEach(s => s.remove());
      scripts.clear();
    }
  });

  it('should inject import map script into head', () => {
    expect.assertions(2);
    const map = { imports: { 'example-package': 'path/to/example-package' } };

    const { mapScript } = injectImportMapInDom(map, { debug: true });
    scripts.add(mapScript);

    // Ensure the map script was added to the head
    expect(document.head.contains(mapScript)).toBeTruthy();

    // Check if the map was correctly injected
    expect(mapScript.text).toBe(JSON.stringify(map));
  });

  it('should inject import map script before first module script', () => {
    expect.assertions(2);

    const map = { imports: { 'example-package': 'path/to/example-package' } };

    const existingScript = document.createElement('script');
    document.head.appendChild(existingScript);

    const existingModuleScript = document.createElement('script');
    existingModuleScript.type = 'module';
    document.head.appendChild(existingModuleScript);
    scripts.add(existingModuleScript);

    const { mapScript } = injectImportMapInDom(map, { debug: true });
    scripts.add(mapScript);

    // Ensure the map script was added before the existing module script
    const headChildren = Array.from(document.head.children);
    const scriptIndex = headChildren.indexOf(mapScript);
    const moduleScriptIndex = headChildren.indexOf(existingModuleScript);
    expect(scriptIndex).toBeLessThan(moduleScriptIndex);

    // Check if the map was correctly injected
    const scriptContent = mapScript.text;
    expect(scriptContent).toBe(JSON.stringify(map));
  });

  it('should inject import map script before first script', () => {
    expect.assertions(2);

    const map = { imports: { 'example-package': 'path/to/example-package' } };

    const existingScript = document.createElement('script');
    document.head.appendChild(existingScript);

    const { mapScript } = injectImportMapInDom(map, { debug: true });

    // Ensure the map script was added before the existing script
    const headChildren = Array.from(document.head.children);
    const scriptIndex = headChildren.indexOf(mapScript);
    const existingScriptIndex = headChildren.indexOf(existingScript);
    expect(scriptIndex).toBeLessThan(existingScriptIndex);

    // Check if the map was correctly injected
    const scriptContent = mapScript.text;
    expect(scriptContent).toBe(JSON.stringify(map));
  });
});
