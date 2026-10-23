import { execFileSync } from 'node:child_process';

export function git(args, { cwd, exec = execFileSync } = {}) {
  return exec('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

export function readTags({ cwd, exec, warn = () => {} } = {}) {
  try {
    git(['fetch', '--tags', '--force', '--quiet'], { cwd, exec });
  } catch {
    warn('Could not fetch tags from remote; using tags available locally');
  }
  return git(['tag', '--list'], { cwd, exec })
    .split('\n')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}
