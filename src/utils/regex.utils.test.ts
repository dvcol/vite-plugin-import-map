import { describe, expect, it } from 'vitest';

import { extractAbsoluteVersion } from './regex.utils';

describe('regex.utils.test.ts', () => {
  it('should extract valid SemVer version', () => {
    expect.assertions(1);
    expect(extractAbsoluteVersion('1.2.3')).equal('1.2.3');
  });

  it('should extract invalid SemVer version (undefined)', () => {
    expect.assertions(1);
    expect(extractAbsoluteVersion(undefined)).equal(undefined);
  });

  it('should extract invalid SemVer version (non-matching format)', () => {
    expect.assertions(1);
    expect(extractAbsoluteVersion('invalid-version')).equal(undefined);
  });

  it('should extract valid SemVer version with additional details', () => {
    expect.assertions(1);
    expect(extractAbsoluteVersion('^1.2.3-beta+build456')).equal('1.2.3');
  });
});
