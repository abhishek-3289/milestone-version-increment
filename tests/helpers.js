import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const GIT_CONFIG = [
  '-c', 'user.name=test',
  '-c', 'user.email=test@example.com',
  '-c', 'init.defaultBranch=main',
  '-c', 'commit.gpgsign=false',
  '-c', 'tag.gpgsign=false',
];

function git(args, cwd) {
  execFileSync('git', [...GIT_CONFIG, ...args], { cwd, stdio: 'ignore' });
}

export function withTempDir(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'milestone-version-increment-'));
  return Promise.resolve()
    .then(() => fn(dir))
    .finally(() => rmSync(dir, { recursive: true, force: true }));
}

// Creates an origin repository with one commit per tag and a shallow clone without tags,
// like the default actions/checkout.
export function givenRemoteTags(dir, tags = []) {
  const origin = join(dir, 'origin');
  const clone = join(dir, 'clone');
  git(['init', origin], dir);
  git(['commit', '--allow-empty', '-m', 'init'], origin);
  for (const tag of tags) {
    git(['commit', '--allow-empty', '-m', tag], origin);
    git(['tag', tag], origin);
  }
  git(['clone', '--depth', '1', '--no-tags', `file://${origin}`, clone], dir);
  return clone;
}

export function actionEnv(dir, workspace, overrides = {}) {
  const outputFile = join(dir, 'output.txt');
  writeFileSync(outputFile, '');
  return { GITHUB_OUTPUT: outputFile, GITHUB_WORKSPACE: workspace, ...overrides };
}

export function quietLog() {
  const lines = [];
  return { lines, log: (line) => lines.push(line) };
}

export function readText(path) {
  return readFileSync(path, 'utf8');
}

export function parseOutputFile(content) {
  const outputs = {};
  const lines = content.split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line) continue;
    const heredoc = line.match(/^([^=<]+)<<(.+)$/);
    if (heredoc) {
      const value = [];
      index += 1;
      while (lines[index] !== heredoc[2]) {
        value.push(lines[index]);
        index += 1;
      }
      outputs[heredoc[1]] = value.join('\n');
    } else {
      const separator = line.indexOf('=');
      outputs[line.slice(0, separator)] = line.slice(separator + 1);
    }
  }
  return outputs;
}

export const API = 'https://api.github.com';
export const REPO = 'octo-org/mobile-app';

export function stubFetch(routes) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init, body: init.body === undefined ? undefined : JSON.parse(init.body) });
    const route = routes[`${init.method} ${url}`];
    if (!route) throw new Error(`Unexpected request: ${init.method} ${url}`);
    const { status = 200, body, headers = {} } = route;
    return new Response(body === undefined ? '' : JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
    });
  };
  return { fetchImpl, calls };
}

export function link(next) {
  return next ? `<${next}>; rel="next"` : '';
}

export function milestone(number, title, { state = 'open', dueOn = null, description = '' } = {}) {
  return {
    url: `${API}/repos/${REPO}/milestones/${number}`,
    html_url: `https://github.com/${REPO}/milestone/${number}`,
    labels_url: `${API}/repos/${REPO}/milestones/${number}/labels`,
    id: 9001000 + number,
    node_id: `MI_${number}`,
    number,
    title,
    description,
    creator: { login: 'release-bot', id: 1, type: 'Bot' },
    open_issues: 0,
    closed_issues: 0,
    state,
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
    due_on: dueOn,
    closed_at: null,
  };
}

export const alreadyExists = {
  status: 422,
  body: {
    message: 'Validation Failed',
    errors: [{ resource: 'Milestone', code: 'already_exists', field: 'title' }],
    documentation_url: 'https://docs.github.com/rest/issues/milestones#create-a-milestone',
    status: '422',
  },
};
