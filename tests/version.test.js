import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { compareVersions, formatVersion, incrementVersion, latestTag, parseVersion } from '../src/version.js';

describe('parseVersion', () => {
  it('parses tags with and without the v prefix', () => {
    assert.deepEqual(parseVersion('v1.2.3'), { major: 1, minor: 2, patch: 3 });
    assert.deepEqual(parseVersion('10.20.30'), { major: 10, minor: 20, patch: 30 });
  });

  it('rejects pre-release and non-semver tags', () => {
    for (const tag of ['v2.0.0-rc1', 'release-x', 'v3', 'v4.1', 'V1.2.3', 'v1.2.3.4', 'vv1.2.3']) {
      assert.equal(parseVersion(tag), null, tag);
    }
  });
});

describe('latestTag', () => {
  it('defaults to v0.0.0 without matching tags', () => {
    assert.equal(latestTag([]), 'v0.0.0');
    assert.equal(latestTag(['release-x', 'v2.0.0-rc1']), 'v0.0.0');
  });

  it('compares numerically, not lexically', () => {
    assert.equal(latestTag(['v1.9.0', 'v1.10.0', 'v1.2.30']), 'v1.10.0');
  });

  it('compares tags with and without the v prefix', () => {
    assert.equal(latestTag(['v1.2.3', '1.10.0']), '1.10.0');
  });

  it('ignores pre-release and non-semver tags', () => {
    assert.equal(latestTag(['v1.2.0', 'v2.0.0-rc1', 'release-x', 'v3', 'v4.1']), 'v1.2.0');
  });
});

describe('incrementVersion', () => {
  const version = { major: 1, minor: 2, patch: 3 };

  it('increments patch', () => {
    assert.equal(formatVersion(incrementVersion(version, 'patch')), '1.2.4');
  });

  it('increments minor and resets patch', () => {
    assert.equal(formatVersion(incrementVersion(version, 'minor')), '1.3.0');
  });

  it('increments major and resets minor and patch', () => {
    assert.equal(formatVersion(incrementVersion(version, 'major')), '2.0.0');
  });

  it('adds a custom amount', () => {
    assert.equal(formatVersion(incrementVersion(version, 'major', 2)), '3.0.0');
    assert.equal(formatVersion(incrementVersion(version, 'patch', 5)), '1.2.8');
  });

  it('rejects unknown increment types', () => {
    assert.throws(() => incrementVersion(version, 'huge'), /Unknown increment type 'huge'/);
  });
});

describe('compareVersions', () => {
  it('orders by major, minor, then patch', () => {
    assert.ok(compareVersions({ major: 2, minor: 0, patch: 0 }, { major: 1, minor: 9, patch: 9 }) > 0);
    assert.ok(compareVersions({ major: 1, minor: 2, patch: 3 }, { major: 1, minor: 3, patch: 0 }) < 0);
    assert.equal(compareVersions({ major: 1, minor: 2, patch: 3 }, { major: 1, minor: 2, patch: 3 }), 0);
  });
});
