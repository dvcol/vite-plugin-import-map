import type { Infer, InjectImportMapOptions } from './import-map.models';
import type { InjectScriptsOptions, ScriptOrLink } from './inject-script.models';

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
export type Scopes = Record<string, Record<string, string | Import>>;

export type ImportMapTemplate = {
  imports: Imports;
  scopes?: Scopes;
};

export type PackageJson = Record<string, unknown> & {
  name?: string;
  version?: string;
  repository?: {
    type?: string;
    url?: string;
    directory?: string;
  };
  dependencies?: Record<string, string>;
  runtimeDependencies?: {
    scope?: string;
    map?: Partial<ImportMapTemplate>;
    imports?: Imports;
    scopes?: Scopes;
    scripts?: ScriptOrLink[];
  };
};

export type ImportMapVitePluginOptions = Omit<InjectImportMapOptions & InjectScriptsOptions, 'domain'> & {
  domain?:
    | string
    | {
        /** The domain to prepend to import paths. */
        map: string;
        /** The domain to prepend to scripts paths. */
        scripts: string;
      };
};

export type ImportMapRollupPluginOptions = ImportMapVitePluginOptions & { input: string };
