import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { run } from '../src/run.js';
import {
  API,
  REPO,
  actionEnv,
  alreadyExists,
  givenRemoteTags,
  milestone,
  parseOutputFile,
  quietLog,
  readText,
  stubFetch,
  withTempDir,
} from './helpers.js';

const NOW = new Date('2026-10-23T12:00:00Z');
const createUrl = `POST ${API}/repos/${REPO}/milestones`;
const listUrl = `GET ${API}/repos/${REPO}/milestones?state=all&per_page=100`;

function echoCreate(number = 9) {
  return {
    async fetchImpl(url, init) {
      const body = JSON.parse(init.body);
      this.requests.push(body);
      return new Response(JSON.stringify(milestone(number, body.title, { dueOn: body.due_on ?? null })), { status: 201 });
    },
    requests: [],
  };
}

async function runWithTags(tags, inputs = {}, { fetchImpl } = {}) {
  return withTempDir(async (dir) => {
    const clone = givenRemoteTags(dir, tags);
    const summaryFile = join(dir, 'summary.md');
    writeFileSync(summaryFile, '');
    const env = actionEnv(dir, clone, {
      'INPUT_GITHUB-TOKEN': 'test-token',
      GITHUB_REPOSITORY: REPO,
      GITHUB_API_URL: API,
      GITHUB_STEP_SUMMARY: summaryFile,
      ...inputs,
    });
    const api = fetchImpl ? { fetchImpl } : echoCreate();
    const { lines, log } = quietLog();
    let error = null;
    let result = null;
    try {
      result = await run({ env, fetchImpl: api.fetchImpl.bind(api), now: NOW, log });
    } catch (caught) {
      error = caught;
    }
    return {
      outputs: parseOutputFile(readText(env.GITHUB_OUTPUT)),
      raw: readText(env.GITHUB_OUTPUT),
      summary: readText(summaryFile),
      requests: api.requests ?? [],
      lines,
      result,
      error,
    };
  });
}

describe('run', () => {
  it('starts from v0.0.0 without tags', async () => {
    const { outputs, requests, lines, summary, error } = await runWithTags([], { INPUT_PREFIX: 'v' });
    assert.equal(error, null);
    assert.deepEqual(outputs, { title: 'v0.0.1', version: '0.0.1', number: '9' });
    assert.deepEqual(requests, [{ title: 'v0.0.1', state: 'open' }]);
    assert.ok(lines.includes('Latest tag: v0.0.0 -> milestone title: v0.0.1'));
    assert.equal(summary, `Created milestone [v0.0.1](https://github.com/${REPO}/milestone/9) (#9) from latest tag \`v0.0.0\`\n`);
  });

  it('fetches tags missing from a shallow checkout', async () => {
    const { outputs } = await runWithTags(['v1.2.3']);
    assert.equal(outputs.version, '1.2.4');
  });

  it('uses the highest version, not the newest commit', async () => {
    const { outputs } = await runWithTags(['v1.10.0', 'v1.9.0']);
    assert.equal(outputs.version, '1.10.1');
  });

  it('ignores pre-release and non-semver tags', async () => {
    const { outputs } = await runWithTags(['v1.2.0', 'v2.0.0-rc1', 'release-x', 'v3', 'v4.1'], { 'INPUT_INCREMENT-TYPE': 'minor' });
    assert.equal(outputs.version, '1.3.0');
  });

  it('parses tags without the v prefix', async () => {
    const { outputs } = await runWithTags(['1.2.3']);
    assert.equal(outputs.version, '1.2.4');
  });

  it('compares tags with and without the v prefix', async () => {
    const { outputs } = await runWithTags(['1.10.0', 'v1.2.3']);
    assert.equal(outputs.version, '1.10.1');
  });

  it('resets patch on minor', async () => {
    const { outputs } = await runWithTags(['v1.2.3'], { 'INPUT_INCREMENT-TYPE': 'minor' });
    assert.equal(outputs.version, '1.3.0');
  });

  it('applies a custom increment to major and resets minor and patch', async () => {
    const { outputs } = await runWithTags(['v1.2.3'], { 'INPUT_INCREMENT-TYPE': 'major', INPUT_INCREMENT: '2' });
    assert.equal(outputs.version, '3.0.0');
  });

  it('keeps spaces in the prefix', async () => {
    const { outputs } = await runWithTags(['v1.2.3'], { INPUT_PREFIX: 'Release ' });
    assert.equal(outputs.title, 'Release 1.2.4');
  });

  it('sends the description and a due date from due-day-increment', async () => {
    const { requests } = await runWithTags(['v1.2.3'], {
      INPUT_DESCRIPTION: 'Sprint 42',
      'INPUT_DUE-DATE': '2027-01-01T00:00:00Z',
      'INPUT_DUE-DAY-INCREMENT': '3',
    });
    assert.deepEqual(requests, [{ title: '1.2.4', state: 'open', description: 'Sprint 42', due_on: '2026-10-26T12:00:00Z' }]);
  });

  it('returns an existing milestone with a warning', async () => {
    const { fetchImpl } = stubFetch({
      [createUrl]: alreadyExists,
      [listUrl]: { body: [milestone(3, 'v1.2.4', { state: 'closed' })] },
    });
    const { outputs, lines, summary, result } = await runWithTags(['v1.2.3'], { INPUT_PREFIX: 'v' }, { fetchImpl });
    assert.deepEqual(outputs, { title: 'v1.2.4', version: '1.2.4', number: '3' });
    assert.equal(result.created, false);
    assert.ok(lines.includes("::warning::Milestone 'v1.2.4' already exists (#3, closed); returning it unchanged"));
    assert.match(summary, /^Reused milestone \[v1\.2\.4\]/);
  });

  it('keeps title and version outputs when the milestone cannot be created', async () => {
    const { fetchImpl } = stubFetch({ [createUrl]: { status: 403, body: { message: 'Resource not accessible by integration' } } });
    const { outputs, error } = await runWithTags(['v1.2.3'], {}, { fetchImpl });
    assert.match(error.message, /GitHub API 403/);
    assert.deepEqual(outputs, { title: '1.2.4', version: '1.2.4' });
  });

  it('rejects an unknown increment type without writing outputs', async () => {
    const { raw, requests, error } = await runWithTags(['v1.2.3'], { 'INPUT_INCREMENT-TYPE': 'huge' });
    assert.match(error.message, /increment-type must be one of major, minor, patch/);
    assert.equal(raw, '');
    assert.deepEqual(requests, []);
  });

  it('rejects a zero increment', async () => {
    const { error } = await runWithTags(['v1.2.3'], { INPUT_INCREMENT: '0' });
    assert.match(error.message, /increment must be a positive integer, got '0'/);
  });
});
