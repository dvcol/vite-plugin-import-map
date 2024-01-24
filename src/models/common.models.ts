import type { ImportMap, Imports, InjectImportMapOptions } from './import-map.models';

import type { InjectScriptsOptions, ScriptOrLink } from './inject-script.models';

export type PackageJson = Record<string, unknown> & {
  repository?: {
    type?: string;
    url?: string;
    directory?: string;
  };
  dependencies?: Record<string, string>;
  runtimeDependencies?: {
    map?: Partial<ImportMap>;
    imports?: Imports;
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
