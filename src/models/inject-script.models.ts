import { importAttributes, NamedImport } from './import-map.models';
import type { PackageJson } from './common.models';

export type ScriptAttributes =
  | 'id'
  | 'type'
  | 'defer'
  | 'referrerPolicy'
  | 'async'
  | 'crossOrigin'
  | 'integrity'
  | 'noModule'
  | 'nonce'
  | 'text';

export type LinkAttribute =
  | 'id'
  | 'as'
  | 'crossOrigin'
  | 'disabled'
  | 'href'
  | 'hreflang'
  | 'imageSizes'
  | 'imageSrcset'
  | 'integrity'
  | 'media'
  | 'referrerPolicy'
  | 'rel'
  | 'title'
  | 'type';

export type BaseScriptOrLink = NamedImport;

export type Script = BaseScriptOrLink & Pick<Partial<HTMLScriptElement>, ScriptAttributes> & { group?: string };
export type Link = BaseScriptOrLink & Pick<Partial<HTMLLinkElement>, LinkAttribute> & Pick<HTMLLinkElement, 'rel'>;
export type ScriptOrLink = Script | Link;

export const isScriptOrLinkAttributeTypeGuard = <
  T extends LinkAttribute | ScriptAttributes = LinkAttribute | ScriptAttributes,
>(
  key: string,
): key is T => ![...importAttributes, 'group'].includes(key);

export const isLinkTypeGuard = (script: ScriptOrLink): script is Link => 'rel' in script || 'href' in script;

export class ScriptLoadError extends Error {
  constructor(script: string, message: string) {
    super(`${script} - ${message}`);

    Object.setPrototypeOf(this, ScriptLoadError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export type InjectScriptTransformHook = (
  scripts: ScriptOrLink[],
  context?: { pkg?: PackageJson; debug?: boolean },
) => ScriptOrLink[];

export type InjectScriptsOptions = {
  /** An id to attached to the import map. This is only  added if a new script is injected. Defaults to 'import-map-plugin' */
  id?: string;
  /** The imports to be added to the map. */
  scripts?: ScriptOrLink[];
  /** The optional domain to prepend to import paths. */
  domain?: string;
  /** Package information, including dependencies. */
  pkg?: PackageJson;
  /** A hook executed before writing the final map */
  transformScripts?: InjectScriptTransformHook;
  /** To enable debug logs */
  debug?: boolean;
  /** To prettify mutated html */
  prettier?: boolean;
};

export type RemoteScripts = {
  /** Production scripts */
  scripts: Record<string, string>;
  /** Dev scripts */
  dev: Record<string, string>;
};
