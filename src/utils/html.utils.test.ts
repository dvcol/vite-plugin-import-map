import { describe, expect, it } from 'vitest';

import { extractMap, findFirstModuleScriptInHead, insertTextAtIndex, prettifyHtml } from './html.utils';

describe('html.utils.ts', () => {
  const getHtml = (insert = '') => `<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>Titre de la page</title>
    <link rel="stylesheet" href="style.css" />
    <script src="script.js"></script>
    ${insert}<!-- insert here -->
  </head>
  <body>
    ...
  </body>
</html>
`;

  const html = getHtml();

  const insertionText = '<tag>New tag inserted</tag>';
  const index = html.indexOf('<!-- insert here -->');

  describe('insertTextAtIndex', () => {
    it('should insert text in the html string at a specific index', () => {
      expect.assertions(1);

      const result = insertTextAtIndex(html, insertionText, index);

      expect(result).toBe(getHtml(insertionText));
    });

    it('should throw error for out-of-range index', () => {
      expect.assertions(3);

      expect(() => insertTextAtIndex(html, insertionText, -10)).toThrow('[import-map-plugin]: Index out of range.');

      expect(() => insertTextAtIndex(html, insertionText, html.length + 30)).toThrow(
        '[import-map-plugin]: Index out of range.',
      );

      expect(() => insertTextAtIndex(html, insertionText, undefined)).toThrow(
        '[import-map-plugin]: Index out of range.',
      );
    });
  });

  describe('prettifyHtml', () => {
    it('should prettify the provided HTML string', () => {
      expect.assertions(1);

      const original = html.replace(/\r?\n/g, '');
      const options = { original };

      const result = prettifyHtml(original, options);

      expect(result).toBe(html);
    });
  });

  describe('findFirstModuleScriptInHead', () => {
    it('should return the index of the first module script', () => {
      expect.assertions(1);

      const htmlStringWithModule = `
    <html>
      <head>
        <script>
          // Regular script content
        </script>
        <script type="module">
          // Module script content
        </script>
        <script>
          // Regular script content
        </script>
      </head>
      <body>
        <!-- Body content -->
      </body>
    </html>
  `;

      expect(findFirstModuleScriptInHead(htmlStringWithModule)).toBe(104);
    });

    it('should return the index of the first script', () => {
      expect.assertions(1);

      const htmlStringWithRegularScript = `
    <html>
      <head>
        <script>
          // Regular script content
        </script>
      </head>
      <body>
        <!-- Body content -->
      </body>
    </html>
  `;

      expect(findFirstModuleScriptInHead(htmlStringWithRegularScript)).toBe(33);
    });

    it('should return the index of the closing head tag', () => {
      expect.assertions(1);

      const htmlStringWithoutScripts = `
    <html>
      <head>
        <!-- No scripts in the head -->
      </head>
      <body>
        <!-- Body content -->
      </body>
    </html>
  `;

      expect(findFirstModuleScriptInHead(htmlStringWithoutScripts)).toBe(71);
    });

    it('should return undefined', () => {
      expect.assertions(1);

      const htmlStringWithoutHead = `
    <html>
      <body>
        <!-- Body content -->
      </body>
    </html>
  `;

      expect(findFirstModuleScriptInHead(htmlStringWithoutHead)).toBeUndefined();
    });
  });

  describe('findFirstModuleScriptInHead', () => {
    it('should correctly parse import map', () => {
      expect.assertions(3);

      const validHtmlWithImportMap = `
        <html>
          <head>
            <script type="importmap">
              {
                "imports": {
                  "module1": "/path/to/module1.js",
                  "module2": "/path/to/module2.js"
                }
              }
            </script>
          </head>
          <body>
            <!-- Body content -->
          </body>
        </html>
      `;

      const { rawMap, parsedMap } = extractMap(validHtmlWithImportMap);
      expect(rawMap).toBeDefined();
      expect(rawMap).not.toHaveLength(0);
      expect(parsedMap).toStrictEqual({
        imports: {
          module1: '/path/to/module1.js',
          module2: '/path/to/module2.js',
        },
      });
    });

    it('should fail to parse index.html with multiple maps', () => {
      expect.assertions(1);

      const invalidHtmlWithMultipleImportMaps = `
        <html>
          <head>
            <script type="importmap">
              {
                "imports": {
                  "module1": "/path/to/module1.js"
                }
              }
            </script>
            <script type="importmap">
              {
                "imports": {
                  "module2": "/path/to/module2.js"
                }
              }
            </script>
          </head>
          <body>
            <!-- Body content -->
          </body>
        </html>
      `;

      expect(() => extractMap(invalidHtmlWithMultipleImportMaps)).toThrow(
        '[import-map-plugin]: Invalid import map detected. An index file can only have one import map script.',
      );
    });

    it('should fail to parse malformed import map json', () => {
      expect.assertions(1);

      const invalidHtmlWithMalformedImportMap = `
        <html>
          <head>
            <script type="importmap">
              Malformed Import Map
            </script>
          </head>
          <body>
            <!-- Body content -->
          </body>
        </html>
      `;

      expect(() => extractMap(invalidHtmlWithMalformedImportMap)).toThrow('Unexpected token');
    });

    it('should not find any map and return an empty map', () => {
      expect.assertions(2);

      const htmlWithoutImportMap = `
    <html>
      <head>
        <!-- No import map in the head -->
      </head>
      <body>
        <!-- Body content -->
      </body>
    </html>
  `;

      const { rawMap, parsedMap } = extractMap(htmlWithoutImportMap);
      expect(rawMap).toBeUndefined();
      expect(parsedMap).toStrictEqual({ imports: {} });
    });
  });
});
