import { mkdir, writeFile } from 'node:fs/promises';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { writeFileJson } from './write-json.utils';

vi.mock('node:fs/promises', async () => {
  const nodePromise = await vi.importActual('node:fs/promises');
  return {
    ...nodePromise,
    mkdir: vi.fn(),
    writeFile: vi.fn(),
  };
});

describe('writeFileJson.utils.ts', async () => {
  const filePath = 'test.json';
  const dirPath = '/custom/directory';
  const filePathWithDir = `${dirPath}/${filePath}`;
  const testData = { key: 'value' };
  const options = { debug: true };

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should writes JSON data to a file without dir', async () => {
    expect.assertions(3);

    try {
      await writeFileJson(filePath, testData, options);
    } catch (error) {
      console.error('Error occurred during testing', error);
      throw error;
    } finally {
      expect(mkdir).not.toHaveBeenCalled();
      expect(writeFile).toHaveBeenCalledOnce();
      expect(writeFile).toHaveBeenCalledWith(filePath, JSON.stringify(testData, undefined, 2), {});
    }
  });

  it('should writes JSON data to a file with nested dir', async () => {
    expect.assertions(4);

    try {
      await writeFileJson(filePathWithDir, testData, options);
    } catch (error) {
      console.error('Error occurred during testing', error);
      throw error;
    } finally {
      expect(mkdir).toHaveBeenCalledOnce();
      expect(mkdir).toHaveBeenCalledWith(dirPath, { recursive: true });
      expect(writeFile).toHaveBeenCalledOnce();
      expect(writeFile).toHaveBeenCalledWith(filePathWithDir, JSON.stringify(testData, undefined, 2), {});
    }
  });
});
