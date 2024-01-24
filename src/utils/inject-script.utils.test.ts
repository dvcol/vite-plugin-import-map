import { describe, expect, it } from 'vitest';

import { Link, Script, ScriptLoadError } from '../models/inject-script.models';

import { createElement, injectScript } from './inject-script.utils';

/**
 * @vitest-environment jsdom
 */
describe('inject-script.utils.ts', () => {
  const script: Script = {
    id: 'test-script',
    name: 'testScript',
    version: '1.0.0',
    domain: 'https://my-domain',
    type: 'module',
  };

  const link: Link = {
    id: 'test-link',
    name: 'testLink',
    version: '2.0.0',
    domain: 'https://my-domain',
    rel: 'stylesheet',
  };

  it('should create a HTMLScriptElement', () => {
    expect.assertions(6);

    const { element, path } = createElement(script);

    const scriptElement = element as HTMLScriptElement;

    expect(scriptElement).toBeDefined();
    expect(scriptElement.tagName).toBe('SCRIPT');
    expect(scriptElement.type).toBe(script.type);
    expect(scriptElement.src).toBe(path);
    expect(scriptElement.dataset.name).toBe(script.name);
    expect(scriptElement.dataset.version).toBe(script.version);
  });

  it('should create a HTMLScriptElement without src for group', () => {
    expect.assertions(9);

    const _script = { ...script, group: 'testGroup', text: 'import "path/to/entry/file"' };
    const { element, path } = createElement(_script);

    const scriptElement = element as HTMLScriptElement;

    expect(path).toBeUndefined();
    expect(scriptElement).toBeDefined();
    expect(scriptElement.tagName).toBe('SCRIPT');
    expect(scriptElement.type).toBe(_script.type);
    expect(scriptElement.src).toBe('');
    expect(scriptElement.text).toBe(_script.text);
    expect(scriptElement.dataset.name).toBe(_script.name);
    expect(scriptElement.dataset.version).toBe(_script.version);
    expect(scriptElement.dataset.group).toBe(_script.group);
  });

  it('should create a HTMLLinkElement', () => {
    expect.assertions(6);

    const { element, path } = createElement(link);

    const scriptElement = element as HTMLLinkElement;

    expect(scriptElement).toBeDefined();
    expect(scriptElement.tagName).toBe('LINK');
    expect(scriptElement.rel).toBe(link.rel);
    expect(scriptElement.href).toBe(path);
    expect(scriptElement.dataset.name).toBe(link.name);
    expect(scriptElement.dataset.version).toBe(link.version);
  });

  it('should inject a script into dom', async () => {
    expect.assertions(2);

    const result = injectScript(script);
    const element = document.getElementById(`${script.id}`) as HTMLScriptElement;

    expect(element).toBeDefined();
    element.onload?.(new UIEvent('script loaded'));

    await expect(result).resolves.toBeTruthy();
  });

  it('should failed to inject a script into dom', async () => {
    expect.assertions(2);

    const result = injectScript(link);
    const element = document.getElementById(`${link.id}`) as HTMLScriptElement;

    expect(element).toBeDefined();
    element.onerror?.('error');

    const error = new ScriptLoadError(`${link.name}`, 'error');
    await expect(result).rejects.toStrictEqual(error);
  });
});
