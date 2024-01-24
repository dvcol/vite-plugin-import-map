# import-map-plugin

This package provides rollup and vite plugins to manage import map injection into an index.html.

If you set a version to `infer`, import-map-plugin will attempt to resolve the version from the dependencies.

## Usage

- Html Transform

```javascript
import html from '@web/rollup-plugin-html';

import { injectImportMap } from '@dvcol/import-map-plugin';

export default defineConfig({
  plugins: [
    html({
      input: 'src/index.html',
      transformHtml: [
        addMainScripts,
        replaceCsEnv,
        injectImportMap({
          pkg,
          debug: true,
          imports: {
            package_a: '0.0.17',
            package_b: {
              version: '3.3.7',
              index: 'remote-entry.js',
            },
            package_c: {
              src: 'http://my-cdn/package_c@latest/index.js',
            },
          },
          map: {
            scopes: {
              package_d: {
                package_c: 'http://my-cdn/package_c@3.4.0/index.js',
              },
            },
          },
        }),
      ],
    }),
  ],
});
```

- Rollup Plugin

```javascript
import { importMapRollupPlugin } from '@dvcol/import-map-plugin';

export default defineConfig({
  plugins: [
    importMapRollupPlugin(
      {
        input: 'src/index.html',
        imports: {
          package_a: '0.0.17',
          package_b: {
            version: '3.3.7',
            index: 'remote-entry.js',
          },
          package_c: {
            src: 'http://my-cdn/package_c@latest/index.js',
          },
        },
        map: {
          scopes: {
            package_d: {
              package_c: 'http://my-cdn/package_c@3.4.0/index.js',
            },
          },
        },
      },
      {
        transformHtml: [addMainScripts, replaceCsEnv],
      },
    ),
  ],
});
```

- Vite Plugin

```javascript
import { importMapVitePlugin } from '@dvcol/import-map-plugin';

export default defineConfig({
  plugins: [
    importMapVitePlugin({
      pkg,
      debug: true,
      imports: {
        package_a: '0.0.17',
        package_b: {
          version: '3.3.7',
          index: 'remote-entry.js',
        },
        package_c: {
          src: 'http://my-cdn/package_c@latest/index.js',
        },
      },
      map: {
        scopes: {
          package_d: {
            package_c: 'http://my-cdn/package_c@3.4.0/index.js',
          },
        },
      },
    }),
  ],
});
```

- Package Override

If you want to maintain your import map from your package.json, you can populate the custom runtimeDependencies key.

If you set the version to `infer`, import-map-plugin will attempt to resolve the version from the dependencies.

```json
{
  "runtimeDependencies": {
    "map": {
      "scopes": {
        "package_d": {
          "package_c": "http://my-cdn/package_c@3.4.0/index.js"
        }
      }
    },
    "imports": {
      "package_a": "infer",
      "package_b": "infer",
      "package_c": "infer"
    },
    "scripts": [
      {
        "name": "@scope/my-stylesheet",
        "rel": "stylesheet",
        "version": "latest",
        "index": "custom/index.css"
      },
      {
        "name": "@scope/my-script",
        "type": "module",
        "url": "https://frontends.dvcol.com/@cs-materials/common@latest/build/cs-materials-common.esm.js"
      }
    ]
  }
}
```
