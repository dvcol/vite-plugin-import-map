import {
  isLinkTypeGuard,
  isScriptOrLinkAttributeTypeGuard,
  ScriptAttributes,
  ScriptLoadError,
  ScriptOrLink,
} from '../models/inject-script.models';

import { computeUrl } from './import.utils';

const isHtmlLink = (element: HTMLLinkElement | HTMLScriptElement): element is HTMLLinkElement =>
  'rel' in element || 'href' in element;

export const createElement = (scriptOrLink: ScriptOrLink) => {
  const element = document.createElement(isLinkTypeGuard(scriptOrLink) ? 'link' : 'script');

  Object.entries(scriptOrLink).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (isScriptOrLinkAttributeTypeGuard<ScriptAttributes>(key)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- we can't succinctly infer key and element matching signature
      (element as any)[key] = value;
    } else if (['group', 'name', 'version'].includes(key)) {
      element.dataset[key] = String(value);
    }
  });

  let path: string | undefined;
  if (isHtmlLink(element)) {
    !element.href && (element.href = computeUrl(scriptOrLink));
    path = element.href;
  } else if (!isLinkTypeGuard(scriptOrLink) && !scriptOrLink.group) {
    !element.src && (element.src = computeUrl(scriptOrLink));
    path = element.src;
  }

  return { name: scriptOrLink.name, path, element };
};

export function injectScript(scriptOrLink: ScriptOrLink) {
  return new Promise<boolean>((resolve, reject) => {
    const { name, path, element } = createElement(scriptOrLink);

    element.onload = () => {
      resolve(true);
    };
    element.onerror = err => {
      reject(new ScriptLoadError(name ?? path ?? JSON.stringify(scriptOrLink), err.toString()));
    };

    document.head.appendChild(element);
  });
}
