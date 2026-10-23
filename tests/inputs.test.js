import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { InputError, formatTimestamp, parseInputs, resolveDueOn } from '../src/inputs.js';
import { API, REPO } from './helpers.js';

const NOW = new Date('2026-10-23T12:34:56.789Z');

function env(overrides = {}) {
  return { 'INPUT_GITHUB-TOKEN': 'input-token', GITHUB_REPOSITORY: REPO, ...overrides };
}

function rejects(overrides, pattern) {
  assert.throws(
    () => parseInputs(env(overrides), NOW),
    (error) => error instanceof InputError && pattern.test(error.message),
  );
}

describe('parseInputs', () => {
  it('applies defaults', () => {
    assert.deepEqual(parseInputs(env(), NOW), {
      incrementType: 'patch',
      increment: 1,
      prefix: '',
      dueOn: '',
      description: '',
      token: 'input-token',
      repository: REPO,
      apiUrl: API,
      workspace: process.cwd(),
    });
  });

  it('keeps spaces in the prefix', () => {
    assert.equal(parseInputs(env({ INPUT_PREFIX: 'Release ' }), NOW).prefix, 'Release ');
  });

  it('reads the increment, description and GitHub environment', () => {
    const config = parseInputs(
      env({
        'INPUT_INCREMENT-TYPE': 'major',
        INPUT_INCREMENT: '2',
        INPUT_DESCRIPTION: ' Sprint 42 ',
        GITHUB_API_URL: 'https://ghe.example.com/api/v3/',
        GITHUB_WORKSPACE: '/work',
      }),
      NOW,
    );
    assert.equal(config.incrementType, 'major');
    assert.equal(config.increment, 2);
    assert.equal(config.description, 'Sprint 42');
    assert.equal(config.apiUrl, 'https://ghe.example.com/api/v3');
    assert.equal(config.workspace, '/work');
  });

  it('prefers GITHUB_TOKEN from env over github-token', () => {
    assert.equal(parseInputs(env({ GITHUB_TOKEN: 'env-token' }), NOW).token, 'env-token');
  });

  it('requires a token', () => {
    rejects({ 'INPUT_GITHUB-TOKEN': '' }, /github-token is required/);
  });

  it('requires GITHUB_REPOSITORY', () => {
    rejects({ GITHUB_REPOSITORY: '' }, /GITHUB_REPOSITORY must look like 'owner\/name'/);
  });

  it('rejects unknown increment types', () => {
    rejects({ 'INPUT_INCREMENT-TYPE': 'huge' }, /increment-type must be one of major, minor, patch .* got 'huge'/);
  });

  it('rejects zero, negative and non-numeric increments', () => {
    for (const value of ['0', '-1', 'abc', '1.5', '01']) {
      rejects({ INPUT_INCREMENT: value }, new RegExp(`increment must be a positive integer, got '${value.replace('.', '\\.')}'`));
    }
  });
});

describe('resolveDueOn', () => {
  it('is empty without a due date', () => {
    assert.equal(resolveDueOn('', '', NOW), '');
  });

  it('passes due-date through', () => {
    assert.equal(resolveDueOn('2026-11-01T00:00:00Z', '', NOW), '2026-11-01T00:00:00Z');
  });

  it('adds due-day-increment days to now and takes precedence over due-date', () => {
    assert.equal(resolveDueOn('2026-11-01T00:00:00Z', '3', NOW), '2026-10-26T12:34:56Z');
    assert.equal(resolveDueOn('', '0', NOW), '2026-10-23T12:34:56Z');
  });

  it('rejects a non-numeric due-day-increment', () => {
    assert.throws(() => resolveDueOn('', '3d', NOW), /due-day-increment must be a whole number of days, got '3d'/);
  });

  it('rejects an unparseable due-date', () => {
    assert.throws(() => resolveDueOn('next friday', '', NOW), /due-date must be an ISO 8601 timestamp/);
  });
});

describe('formatTimestamp', () => {
  it('drops milliseconds', () => {
    assert.equal(formatTimestamp(NOW), '2026-10-23T12:34:56Z');
  });
});
