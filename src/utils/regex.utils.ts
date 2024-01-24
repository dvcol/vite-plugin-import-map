export const semverRegex = /(\d+\.\d+\.\d+)/;
export const workspaceRegex = /workspace:?/;

/**
 * Extracts the absolute version (major.minor.patch) from a Semantic Versioning (SemVer) version.
 *
 * @param { string | undefined } semver - The input SemVer version.
 *
 * @returns { string  | undefined } The absolute version (major.minor.patch) or undefined if the input is invalid.
 */
export function extractAbsoluteVersion(semver?: string): string | undefined {
  if (!semver) return semver;
  return semver.match(semverRegex)?.at(1);
}
