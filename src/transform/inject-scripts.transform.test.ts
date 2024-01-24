import { describe, expect, it } from 'vitest';

import { createScriptTag, injectScriptTags, mergeScripts } from './inject-scripts.transform';

import type { Link, Script, ScriptOrLink } from '../models/inject-script.models';

describe('inject-scripts.transform.ts', () => {
  // Sample scriptOrLink object
  const script: Script = {
    id: 'script-id',
    name: 'myScript',
    src: 'path/to/script.js',
    version: '1.0',
    type: 'module',
    text: 'console.log("Hello, World!");',
  };

  // Sample scriptOrLink object for link
  const link: Link = {
    name: 'myStyles',
    href: 'path/to/styles.css',
    version: '2.0',
    rel: 'stylesheet',
  };

  describe('createScriptTag', () => {
    it('should create a script', () => {
      expect.assertions(9);

      // Options object with an id
      const options = { id: 'uniqueScriptId' };

      const result = createScriptTag(script, options);

      // Assertions
      expect(result.startsWith('<script')).toBeTruthy();
      expect(result).toContain(`data-id="${options.id}"`);
      expect(result).toContain(`data-name="${script.name}"`);
      expect(result).toContain(`data-version="${script.version}"`);
      expect(result).toContain(`id="${script.id}"`);
      expect(result).toContain(`src="${script.src}"`);
      expect(result).toContain(`type="${script.type}"`);
      expect(result).toContain(script.text);
      expect(result.endsWith('</script>')).toBeTruthy();
    });

    it('should create a script group', () => {
      expect.assertions(10);

      const group = { ...script, group: 'script-group' };

      // Options object with an id
      const options = { id: 'uniqueScriptId' };

      const result = createScriptTag(group, options);

      // Assertions
      expect(result.startsWith('<script')).toBeTruthy();
      expect(result).toContain(`data-id="${options.id}"`);
      expect(result).toContain(`data-name="${group.name}"`);
      expect(result).toContain(`data-version="${group.version}"`);
      expect(result).toContain(`id="${group.id}"`);
      expect(result).toContain(`type="${group.type}"`);
      expect(result).toContain(`group="${group.group}"`);
      expect(result).not.toContain(`src="${group.src}"`);
      expect(result).toContain(group.text);
      expect(result.endsWith('</script>')).toBeTruthy();
    });

    it('should create a link', () => {
      expect.assertions(7);

      // Options object with an id
      const options = { id: 'uniqueLinkId' };

      const result = createScriptTag(link, options);

      // Assertions
      expect(result.startsWith('<link')).toBeTruthy();
      expect(result).toContain(`data-id="${options.id}"`);
      expect(result).toContain(`data-name="${link.name}"`);
      expect(result).toContain(`data-version="${link.version}"`);
      expect(result).toContain(`href="${link.href}"`);
      expect(result).toContain(`rel="${link.rel}"`);
      expect(result.endsWith('/>')).toBeTruthy();
    });
  });

  describe('mergeScripts', () => {
    it('should merge scripts based on the group property', () => {
      expect.assertions(8);

      // Sample scripts array
      const scripts: Script[] = [
        { src: 'script1.js', group: 'group1' },
        { src: 'script2.js', group: 'group1' },
        { src: 'script3.js', group: 'group2' },
        { src: 'script4.js' },
      ];

      // Call the function
      const mergedScripts = mergeScripts(scripts) as Script[];

      // Assertions
      expect(mergedScripts).toHaveLength(3);

      const mergedGroup1 = mergedScripts.find(_script => _script.group === 'group1');
      expect(mergedGroup1).toBeDefined();
      expect(mergedGroup1?.text).toContain('import "script1.js"');
      expect(mergedGroup1?.text).toContain('import "script2.js"');

      const mergedGroup2 = mergedScripts.find(_script => _script.group === 'group2');
      expect(mergedGroup2).toBeDefined();
      expect(mergedGroup2?.text).toContain('import "script3.js"');

      const ungroupedScript = mergedScripts.find(_script => !_script.group);
      expect(ungroupedScript).toBeDefined();
      expect(ungroupedScript?.src).toBe('script4.js');
    });
  });

  it('should handle scripts without a group property', () => {
    expect.assertions(10);

    // Scripts array without a group property
    const scripts: Script[] = [{ src: 'script1.js' }, { src: 'script2.js' }, { src: 'script3.js' }];

    // Call the function
    const mergedScripts = mergeScripts(scripts) as Script[];

    // Assertions
    expect(mergedScripts).toHaveLength(3);

    mergedScripts.forEach(_script => {
      expect(_script.group).toBeUndefined();
      expect(_script.src).toBeDefined();
      expect(_script.text).toBeUndefined();
    });
  });

  it('should handle an empty scripts array', () => {
    expect.assertions(1);

    // Call the function
    const mergedScripts = mergeScripts([]);

    // Assertions
    expect(mergedScripts).toHaveLength(0);
  });

  describe('injectScriptTags', () => {
    // Sample HTML string
    const htmlString = '<html><head></head><body></body></html>';

    it('should inject scripts into HTML string', () => {
      expect.assertions(2);

      // Sample script data
      const scripts = [
        { src: 'script1.js', group: 'group1' },
        { src: 'script2.js', group: 'group1' },
      ];

      // Sample package.json scripts
      const pkgScripts: ScriptOrLink[] = [{ src: 'pkg-script1.js', group: 'group2' }, { src: 'pkg-script2.js' }];

      // Call the function
      const htmlTransformHook = injectScriptTags({
        id: 'custom-id',
        scripts,
        domain: 'example.com',
        pkg: { runtimeDependencies: { scripts: pkgScripts } },
        debug: true,
        prettier: true,
      });

      const mutatedHtml = htmlTransformHook(htmlString);

      // Assertions
      scripts.forEach(_script => expect(mutatedHtml).toContain(_script.src));
    });

    it('should handle missing scripts and return original HTML', () => {
      expect.assertions(1);

      const htmlTransformHook = injectScriptTags({
        id: 'custom-id',
        debug: true,
        prettier: true,
      });

      const mutatedHtml = htmlTransformHook(htmlString);

      // Assertions
      expect(mutatedHtml).toStrictEqual(htmlString);
    });
  });
});
