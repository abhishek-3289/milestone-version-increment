import { INCREMENT_TYPES } from './version.js';

export const DEFAULTS = Object.freeze({
  'increment-type': 'patch',
  increment: '1',
  prefix: '',
  'due-date': '',
  'due-day-increment': '',
  description: '',
  'github-token': '',
});

export class InputError extends Error {}

export function readInput(env, name) {
  const raw = env[`INPUT_${name.toUpperCase()}`];
  return raw === undefined ? DEFAULTS[name] ?? '' : raw;
}

export function getInput(env, name) {
  return readInput(env, name).trim();
}

const REPOSITORY_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const DAY_MS = 24 * 60 * 60 * 1000;

export function formatTimestamp(date) {
  return date.toISOString().replace(/\.[0-9]{3}Z$/, 'Z');
}

export function resolveDueOn(dueDate, dueDayIncrement, now) {
  if (dueDayIncrement) {
    if (!/^[0-9]+$/.test(dueDayIncrement)) {
      throw new InputError(`due-day-increment must be a whole number of days, got '${dueDayIncrement}'`);
    }
    return formatTimestamp(new Date(now.getTime() + Number(dueDayIncrement) * DAY_MS));
  }
  if (dueDate && Number.isNaN(Date.parse(dueDate))) {
    throw new InputError(`due-date must be an ISO 8601 timestamp such as 2026-01-31T00:00:00Z, got '${dueDate}'`);
  }
  return dueDate;
}

export function parseInputs(env, now = new Date()) {
  const incrementType = getInput(env, 'increment-type');
  if (!INCREMENT_TYPES.includes(incrementType)) {
    throw new InputError(`increment-type must be one of major, minor, patch (https://semver.org/), got '${incrementType}'`);
  }

  const incrementRaw = getInput(env, 'increment');
  if (!/^[1-9][0-9]*$/.test(incrementRaw)) {
    throw new InputError(`increment must be a positive integer, got '${incrementRaw}'`);
  }

  const repository = (env.GITHUB_REPOSITORY ?? '').trim();
  if (!REPOSITORY_PATTERN.test(repository)) {
    throw new InputError(`GITHUB_REPOSITORY must look like 'owner/name', got '${repository}'`);
  }

  const token = (env.GITHUB_TOKEN ?? '').trim() || getInput(env, 'github-token');
  if (!token) {
    throw new InputError('github-token is required');
  }

  return {
    incrementType,
    increment: Number(incrementRaw),
    prefix: readInput(env, 'prefix'),
    dueOn: resolveDueOn(getInput(env, 'due-date'), getInput(env, 'due-day-increment'), now),
    description: getInput(env, 'description'),
    token,
    repository,
    apiUrl: ((env.GITHUB_API_URL ?? '').trim() || 'https://api.github.com').replace(/\/+$/, ''),
    workspace: (env.GITHUB_WORKSPACE ?? '').trim() || process.cwd(),
  };
}
