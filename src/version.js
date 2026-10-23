export const DEFAULT_TAG = 'v0.0.0';
export const INCREMENT_TYPES = Object.freeze(['major', 'minor', 'patch']);

const TAG_PATTERN = /^v?([0-9]+)\.([0-9]+)\.([0-9]+)$/;

export function parseVersion(tag) {
  const match = tag.match(TAG_PATTERN);
  if (!match) return null;
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
}

export function compareVersions(a, b) {
  return a.major - b.major || a.minor - b.minor || a.patch - b.patch;
}

export function latestTag(tags) {
  let latest = null;
  for (const tag of tags) {
    const version = parseVersion(tag);
    if (version && (!latest || compareVersions(version, latest.version) >= 0)) {
      latest = { tag, version };
    }
  }
  return latest ? latest.tag : DEFAULT_TAG;
}

export function incrementVersion(version, type, amount = 1) {
  switch (type) {
    case 'major':
      return { major: version.major + amount, minor: 0, patch: 0 };
    case 'minor':
      return { major: version.major, minor: version.minor + amount, patch: 0 };
    case 'patch':
      return { major: version.major, minor: version.minor, patch: version.patch + amount };
    default:
      throw new Error(`Unknown increment type '${type}'`);
  }
}

export function formatVersion(version) {
  return `${version.major}.${version.minor}.${version.patch}`;
}
