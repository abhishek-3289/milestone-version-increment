export class GitHubError extends Error {
  constructor(status, url, message, errors = []) {
    super(`GitHub API ${status} for ${url}: ${message}`);
    this.status = status;
    this.url = url;
    this.errors = errors;
  }
}

export function nextLink(linkHeader) {
  if (!linkHeader) return null;
  for (const part of linkHeader.split(',')) {
    const match = part.match(/<([^>]+)>\s*;\s*rel="([^"]+)"/);
    if (match && match[2].split(/\s+/).includes('next')) return match[1];
  }
  return null;
}

export function createClient({ token, apiUrl, fetchImpl }) {
  const origin = new URL(apiUrl).origin;
  let calls = 0;

  async function request(pathOrUrl, { method = 'GET', body } = {}) {
    const url = pathOrUrl.startsWith('http') ? pathOrUrl : `${apiUrl}${pathOrUrl}`;
    if (new URL(url).origin !== origin) {
      throw new Error(`Refusing to follow a link outside ${origin}: ${url}`);
    }
    calls += 1;
    const headers = {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'milestone-version-increment-action',
    };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const response = await fetchImpl(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    let parsed = null;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }
    }
    if (!response.ok) {
      const isObject = parsed && typeof parsed === 'object';
      const message = isObject && parsed.message ? parsed.message : String(text || response.statusText);
      throw new GitHubError(response.status, url, message, isObject && Array.isArray(parsed.errors) ? parsed.errors : []);
    }
    return { body: parsed, next: nextLink(response.headers.get('link')) };
  }

  async function* paginate(path) {
    let url = path;
    while (url) {
      const { body, next } = await request(url);
      yield body;
      url = next;
    }
  }

  return {
    request,
    paginate,
    get calls() {
      return calls;
    },
  };
}

function normalizeMilestone(milestone) {
  return {
    number: milestone.number,
    title: milestone.title,
    state: milestone.state,
    url: milestone.html_url ?? '',
    dueOn: milestone.due_on ?? null,
  };
}

export async function findMilestone(client, repository, title) {
  for await (const page of client.paginate(`/repos/${repository}/milestones?state=all&per_page=100`)) {
    const found = page.find((milestone) => milestone.title === title);
    if (found) return normalizeMilestone(found);
  }
  return null;
}

function isAlreadyExists(error) {
  return error instanceof GitHubError && error.status === 422 && error.errors.some((item) => item.code === 'already_exists');
}

export async function createMilestone(client, repository, { title, description, dueOn }) {
  const body = { title, state: 'open' };
  if (description) body.description = description;
  if (dueOn) body.due_on = dueOn;
  try {
    const { body: created } = await client.request(`/repos/${repository}/milestones`, { method: 'POST', body });
    return { milestone: normalizeMilestone(created), created: true };
  } catch (error) {
    if (!isAlreadyExists(error)) throw error;
    const existing = await findMilestone(client, repository, title);
    if (!existing) throw error;
    return { milestone: existing, created: false };
  }
}
