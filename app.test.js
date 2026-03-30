// app.test.js
import { jest } from '@jest/globals';

// Must mock BEFORE importing app
const mockPost = jest.fn();
jest.unstable_mockModule('axios', () => ({
  default: { post: mockPost },
}));

// Dynamic import AFTER mock is set up
const { app } = await import('./app.js');

const mockResults = [
  { name: 'Software Engineer at Canva',    url: 'https://canva.com/jobs/1', content: 'Great role at Canva building design tools.' },
  { name: 'Backend Engineer at Atlassian', url: 'https://atlassian.com/jobs/2', content: 'Exciting Jira opportunity.' },
];

beforeEach(() => mockPost.mockReset());
afterAll(() => app.close());

describe('GET /health', () => {
  test('returns status ok', async () => {
    // Use Fastify's built-in inject instead of supertest
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).status).toBe('ok');
  });
});

describe('POST /api/search', () => {
  test('returns results for a valid query', async () => {
    mockPost.mockResolvedValueOnce({ data: { results: mockResults } });
    const res = await app.inject({
      method: 'POST', url: '/api/search',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'software engineer jobs Melbourne' }),
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).results).toHaveLength(2);
  });

  test('returns 400 when query is missing', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/search',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ depth: 'standard' }),
    });
    expect(res.statusCode).toBe(400);
  });

  test('returns 400 when depth is invalid', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/search',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'developer jobs', depth: 'turbo' }),
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('GET /api/jobs', () => {
  test('returns shaped job results', async () => {
    mockPost.mockResolvedValueOnce({ data: { results: mockResults } });
    const res = await app.inject({ method: 'GET', url: '/api/jobs?query=software+engineer' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toHaveProperty('query');
    expect(body).toHaveProperty('count');
    expect(body.results[0]).toHaveProperty('title');
    expect(body.results[0]).toHaveProperty('url');
    expect(body.results[0]).toHaveProperty('snippet');
  });

  test('returns 400 when query param is missing', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/jobs' });
    expect(res.statusCode).toBe(400);
  });
});

describe('GET /api/company', () => {
  test('returns company hiring results', async () => {
    mockPost.mockResolvedValueOnce({ data: { results: mockResults } });
    const res = await app.inject({ method: 'GET', url: '/api/company?name=Atlassian' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.company).toBe('Atlassian');
    expect(body.results).toHaveLength(2);
  });

  test('returns 400 when name is missing', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/company' });
    expect(res.statusCode).toBe(400);
  });
});