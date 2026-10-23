import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GitHubError, createClient, createMilestone, findMilestone, nextLink } from '../src/github.js';
import { API, REPO, alreadyExists, link, milestone, stubFetch } from './helpers.js';

const createUrl = `POST ${API}/repos/${REPO}/milestones`;
const listUrl = `${API}/repos/${REPO}/milestones?state=all&per_page=100`;
const listPage2 = `${API}/repositories/123/milestones?state=all&per_page=100&page=2`;

function client(routes) {
  const stub = stubFetch(routes);
  return { ...stub, client: createClient({ token: 'test-token', apiUrl: API, fetchImpl: stub.fetchImpl }) };
}

describe('nextLink', () => {
  it('returns the next URL from a Link header', () => {
    assert.equal(nextLink(`<${listPage2}>; rel="next", <${listPage2}>; rel="last"`), listPage2);
    assert.equal(nextLink(`<${listUrl}>; rel="prev"`), null);
    assert.equal(nextLink(null), null);
  });
});

describe('createClient', () => {
  it('sends JSON with auth headers', async () => {
    const { client: api, calls } = client({ [createUrl]: { status: 201, body: milestone(5, 'v1.0.0') } });
    await api.request(`/repos/${REPO}/milestones`, { method: 'POST', body: { title: 'v1.0.0' } });
    assert.equal(calls[0].init.method, 'POST');
    assert.equal(calls[0].init.headers.Authorization, 'Bearer test-token');
    assert.equal(calls[0].init.headers['Content-Type'], 'application/json');
    assert.deepEqual(calls[0].body, { title: 'v1.0.0' });
    assert.equal(api.calls, 1);
  });

  it('raises GitHubError with the API message and errors', async () => {
    const { client: api } = client({ [createUrl]: alreadyExists });
    await assert.rejects(
      api.request(`/repos/${REPO}/milestones`, { method: 'POST', body: {} }),
      (error) => error instanceof GitHubError && error.status === 422 && /Validation Failed/.test(error.message) && error.errors[0].code === 'already_exists',
    );
  });

  it('refuses links to another origin', async () => {
    const { client: api } = client({});
    await assert.rejects(api.request('https://evil.example.com/x'), /Refusing to follow a link outside/);
  });
});

describe('createMilestone', () => {
  it('creates an open milestone with description and due date', async () => {
    const { client: api, calls } = client({
      [createUrl]: { status: 201, body: milestone(5, 'v1.3.0', { dueOn: '2026-10-26T07:00:00Z' }) },
    });
    const result = await createMilestone(api, REPO, { title: 'v1.3.0', description: 'Sprint', dueOn: '2026-10-26T07:00:00Z' });
    assert.deepEqual(calls[0].body, { title: 'v1.3.0', state: 'open', description: 'Sprint', due_on: '2026-10-26T07:00:00Z' });
    assert.deepEqual(result, {
      created: true,
      milestone: { number: 5, title: 'v1.3.0', state: 'open', url: `https://github.com/${REPO}/milestone/5`, dueOn: '2026-10-26T07:00:00Z' },
    });
  });

  it('leaves out empty description and due date', async () => {
    const { client: api, calls } = client({ [createUrl]: { status: 201, body: milestone(5, 'v1.3.0') } });
    await createMilestone(api, REPO, { title: 'v1.3.0', description: '', dueOn: '' });
    assert.deepEqual(calls[0].body, { title: 'v1.3.0', state: 'open' });
  });

  it('returns an existing milestone with the same title', async () => {
    const { client: api, calls } = client({
      [createUrl]: alreadyExists,
      [`GET ${listUrl}`]: { body: [milestone(1, 'v1.2.0', { state: 'closed' })], headers: { link: link(listPage2) } },
      [`GET ${listPage2}`]: { body: [milestone(4, 'v1.3.0', { state: 'closed' })] },
    });
    const result = await createMilestone(api, REPO, { title: 'v1.3.0' });
    assert.equal(result.created, false);
    assert.equal(result.milestone.number, 4);
    assert.equal(result.milestone.state, 'closed');
    assert.equal(calls.length, 3);
  });

  it('rethrows other errors', async () => {
    const { client: api } = client({ [createUrl]: { status: 403, body: { message: 'Resource not accessible by integration' } } });
    await assert.rejects(createMilestone(api, REPO, { title: 'v1.3.0' }), /GitHub API 403 .*Resource not accessible by integration/);
  });

  it('rethrows already_exists when the milestone cannot be found', async () => {
    const { client: api } = client({ [createUrl]: alreadyExists, [`GET ${listUrl}`]: { body: [] } });
    await assert.rejects(createMilestone(api, REPO, { title: 'v1.3.0' }), /GitHub API 422/);
  });
});

describe('findMilestone', () => {
  it('matches the title exactly', async () => {
    const { client: api } = client({ [`GET ${listUrl}`]: { body: [milestone(1, 'V1.3.0'), milestone(2, 'v1.3.0 ')] } });
    assert.equal(await findMilestone(api, REPO, 'v1.3.0'), null);
  });
});
