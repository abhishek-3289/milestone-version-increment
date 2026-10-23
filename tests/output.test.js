import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { escapeAnnotation, formatOutput, writeOutputs, writeSummary } from '../src/output.js';
import { readText, withTempDir } from './helpers.js';

describe('formatOutput', () => {
  it('writes single-line values as name=value', () => {
    assert.equal(formatOutput('number', 3), 'number=3\n');
    assert.equal(formatOutput('title', ''), 'title=\n');
  });

  it('writes multi-line values with a heredoc delimiter', () => {
    assert.equal(formatOutput('title', 'v1\n- a', () => 'EOF_1'), 'title<<EOF_1\nv1\n- a\nEOF_1\n');
  });

  it('refuses a value that contains its delimiter', () => {
    assert.throws(() => formatOutput('x', 'a\nEOF_1', () => 'EOF_1'), /delimiter/);
  });
});

describe('writeOutputs and writeSummary', () => {
  it('appends to GITHUB_OUTPUT and GITHUB_STEP_SUMMARY', () =>
    withTempDir(async (dir) => {
      const env = { GITHUB_OUTPUT: join(dir, 'out'), GITHUB_STEP_SUMMARY: join(dir, 'summary') };
      writeOutputs(env, { version: '1.2.3' });
      writeOutputs(env, { number: 2 });
      writeSummary(env, '## Version');
      assert.equal(readText(env.GITHUB_OUTPUT), 'version=1.2.3\nnumber=2\n');
      assert.equal(readText(env.GITHUB_STEP_SUMMARY), '## Version\n');
    }));

  it('falls back to stdout without GITHUB_OUTPUT and skips the summary', () => {
    const written = [];
    writeOutputs({}, { version: '0.0.1' }, (text) => written.push(text));
    writeSummary({}, 'ignored');
    assert.deepEqual(written, ['version=0.0.1\n']);
  });
});

describe('escapeAnnotation', () => {
  it('escapes characters that break workflow commands', () => {
    assert.equal(escapeAnnotation('50% done\r\nnext'), '50%25 done%0D%0Anext');
  });
});
