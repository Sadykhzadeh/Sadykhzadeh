import { afterEach, expect, test } from 'bun:test';
import { fetchHtml } from './fetch-html';

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

const stub = (...responses: Array<Response | Error>) => {
  let calls = 0;
  globalThis.fetch = (async () => {
    const next = responses[Math.min(calls, responses.length - 1)];
    calls++;
    if (next instanceof Error) throw next;
    return next;
  }) as unknown as typeof fetch;
  return () => calls;
};

test('a failed request is retried once and the second answer is used', async () => {
  const calls = stub(new Error('reset'), new Response('<p>ok</p>'));
  expect(await fetchHtml('https://example.test/')).toBe('<p>ok</p>');
  expect(calls()).toBe(2);
});

test('the error is thrown once every attempt has failed', async () => {
  const calls = stub(new Error('reset'));
  await expect(fetchHtml('https://example.test/')).rejects.toThrow('reset');
  expect(calls()).toBe(2);
});

test('an HTTP error status counts as a failed attempt', async () => {
  const calls = stub(new Response('slow down', { status: 429 }));
  await expect(fetchHtml('https://example.test/')).rejects.toThrow('HTTP 429');
  expect(calls()).toBe(2);
});
