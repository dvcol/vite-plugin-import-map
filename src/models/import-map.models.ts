import type { PackageJson } from './common.models';

export const Infer = 'infer' as const;

export type Import = {
  version?: string | typeof Infer;
  /** Version separator to compute script url */
  separator?: string | '@' | '/';
  domain?: string;
  base?: string;
  index?: string;
  src?: string;
};
export type Imports = Record<string, string | Import>;
export type ImportMap = { imports: Record<string, string>; scopes?: Record<string, Record<string, string>> };

export type NamedImport = Import & {
  name?: string;
};

export const importAttributes: (keyof NamedImport)[] = ['name', 'version', 'separator', 'index', 'domain', 'src'];

export type ImportMapTransformHook = (map: ImportMap, context?: { pkg?: PackageJson; debug?: boolean; strict?: boolean }) => ImportMap;
export type HtmlTransformHook = (html: string) => string;

export type InjectImportMapOptions = {
  /** An id to attached to the import map. This is only  added if a new script is injected. Defaults to 'import-map-plugin' */
  id?: string;
  /** The imports to be added to the map. */
  imports?: Imports;
  /** An original import map containing some seed mappings. */
  map?: ImportMap;
  /** The optional domain to prepend to import paths. */
  domain?: string;
  /** The optional scope of the package to validate against import-map */
  scope?: string;
  /** Package information, including dependencies. */
  pkg?: PackageJson;
  /** A hook executed before writing the final map */
  transformMap?: ImportMapTransformHook;
  /** To enable debug logs */
  debug?: boolean;
  /** To enable strict validation of dependencies */
  strict?: boolean;
  /** To prettify mutated html */
  prettier?: boolean;
  /** To write generated import map */
  write?: boolean | string;
  /** Enable caching of workspace versions. */
  cache?: boolean;
};

export type VersionOptions = {
  version?: string;
  entry?: string | Import;
  pkg?: PackageJson;
  debug?: boolean;
  cache?: boolean;
};
export type VersionHook = (name: string, options: VersionOptions) => string | undefined;

export type GenerateImportMapOptions = {
  domain?: string;
  pkg?: PackageJson;
  debug?: boolean;
  cache?: boolean;
  versionHook?: VersionHook;
};
