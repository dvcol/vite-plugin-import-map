import { mkdir, writeFile } from 'node:fs/promises';

import { dirname } from 'node:path';

import type { Abortable } from 'node:events';
import type { Mode, ObjectEncodingOptions, OpenMode } from 'node:fs';

type WriteJsonOptions = ObjectEncodingOptions &
  Abortable & {
    mode?: Mode | undefined;
    flag?: OpenMode | undefined;
    debug?: boolean;
  };

/**
 * Writes data to a JSON file asynchronously.
 *
 * @async
 * @template T - The type of data to be written to the JSON file.
 *
 * @param {string} path - The path to the JSON file.
 * @param {string | T} data - The data to be written to the JSON file. If it's an object, it will be stringified.
 * @param {import('fs').ObjectEncodingOptions} [options] - The encoding options for writing the file.
 * @param  {boolean | undefined} debug  - Enables debug logging
 *
 * @throws {Error} Throws an error if there are issues creating folders, writing the file, or handling errors.
 *
 * @returns {Promise<void>} A Promise that resolves once the file is written successfully.
 */
export async function writeFileJson<T = Record<string, unknown>>(
  path: string,
  data: string | T,
  { debug, ...options }: WriteJsonOptions = {},
): Promise<void> {
  const _data = typeof data === 'string' ? data : JSON.stringify(data);
  if (path.includes('/')) {
    try {
      await mkdir(dirname(path), { recursive: true });
    } catch (err) {
      console.error(`Failed to create folder`, { path });
      throw err;
    }
  }
  try {
    await writeFile(path, _data, options);
    if (debug) console.info(`File written to '${`${process.cwd()}/${path}`}'.`);
  } catch (err) {
    console.error(`Failed to write file`, { path, options });
    throw err;
  }
}
