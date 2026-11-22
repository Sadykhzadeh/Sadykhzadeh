import { afterEach, expect, spyOn, test } from 'bun:test';
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
  expect(await fetchHtml('https://example.test/', 2, 0)).toBe('<p>ok</p>');
  expect(calls()).toBe(2);
});

test('the error is thrown once every attempt has failed', async () => {
  const calls = stub(new Error('reset'));
  await expect(fetchHtml('https://example.test/', 2, 0)).rejects.toThrow('reset');
  expect(calls()).toBe(2);
});

test('an HTTP error status counts as a failed attempt', async () => {
  const calls = stub(new Response('slow down', { status: 429 }));
  await expect(fetchHtml('https://example.test/', 2, 0)).rejects.toThrow('HTTP 429');
  expect(calls()).toBe(2);
});

test('the retry waits before the second request is sent', async () => {
  const sentAt: number[] = [];
  globalThis.fetch = (async () => {
    sentAt.push(Date.now());
    return sentAt.length === 1 ? new Response('slow down', { status: 429 }) : new Response('<p>ok</p>');
  }) as unknown as typeof fetch;
  expect(await fetchHtml('https://example.test/', 2, 100)).toBe('<p>ok</p>');
  expect(sentAt[1] - sentAt[0]).toBeGreaterThanOrEqual(90);
});

test('without arguments a page request is retried once after a second', async () => {
  const pauses: number[] = [];
  const sleep = spyOn(Bun, 'sleep').mockImplementation(ms => {
    pauses.push(Number(ms));
    return Promise.resolve();
  });
  try {
    const calls = stub(new Error('reset'), new Response('<p>ok</p>'));
    expect(await fetchHtml('https://example.test/')).toBe('<p>ok</p>');
    expect(calls()).toBe(2);
    expect(pauses).toEqual([1000]);

    const failing = stub(new Error('reset'));
    await expect(fetchHtml('https://example.test/')).rejects.toThrow('reset');
    expect(failing()).toBe(2);
  } finally {
    sleep.mockRestore();
  }
});

test('a page request gets a 10 second deadline', async () => {
  const timeout = spyOn(AbortSignal, 'timeout');
  try {
    stub(new Response('<p>ok</p>'));
    await fetchHtml('https://example.test/');
    expect(timeout).toHaveBeenCalledWith(10_000);
  } finally {
    timeout.mockRestore();
  }
});

test('a client error other than 408 or 429 is not retried', async () => {
  const calls = stub(new Response('gone', { status: 404 }));
  await expect(fetchHtml('https://example.test/')).rejects.toThrow('HTTP 404');
  expect(calls()).toBe(1);
});

test('a server error is retried', async () => {
  const calls = stub(new Response('oops', { status: 503 }), new Response('<p>ok</p>'));
  expect(await fetchHtml('https://example.test/', 2, 0)).toBe('<p>ok</p>');
  expect(calls()).toBe(2);
});

test('a 500 response is retried like the other server errors', async () => {
  const calls = stub(new Response('oops', { status: 500 }), new Response('<p>ok</p>'));
  expect(await fetchHtml('https://example.test/', 2, 0)).toBe('<p>ok</p>');
  expect(calls()).toBe(2);
});

test('a 408 response is retried, since the server asks for the request again', async () => {
  const calls = stub(new Response('timeout', { status: 408 }), new Response('<p>ok</p>'));
  expect(await fetchHtml('https://example.test/', 2, 0)).toBe('<p>ok</p>');
  expect(calls()).toBe(2);
});

test('every request identifies the generator', async () => {
  let sent: Headers | undefined;
  globalThis.fetch = (async (_url: string, init: RequestInit) => {
    sent = new Headers(init.headers);
    return new Response('<p>ok</p>');
  }) as unknown as typeof fetch;
  await fetchHtml('https://example.test/');
  expect(sent?.get('User-Agent')).toMatch(/github\.com\/Sadykhzadeh\/Sadykhzadeh/);
});

test('a body over the size limit is refused and the rest of it is not read', async () => {
  let pulled = 0;
  const body = new ReadableStream({
    pull(controller) {
      if (pulled++ < 100) controller.enqueue(new Uint8Array(1024 * 1024));
      else controller.close();
    },
  });
  stub(new Response(body));
  await expect(fetchHtml('https://example.test/', 1, 0)).rejects.toThrow('larger than');
  expect(pulled).toBeLessThan(10);
});

test('a body of exactly the size limit is read in full', async () => {
  stub(new Response(new Uint8Array(5 * 1024 * 1024)));
  expect((await fetchHtml('https://example.test/', 1, 0)).length).toBe(5 * 1024 * 1024);
});

test('an oversized body is not fetched again', async () => {
  let calls = 0;
  globalThis.fetch = (async () => {
    calls++;
    return new Response(new Uint8Array(6 * 1024 * 1024));
  }) as unknown as typeof fetch;
  await expect(fetchHtml('https://example.test/', 2, 0)).rejects.toThrow('larger than');
  expect(calls).toBe(1);
});

test('a Cyrillic title split across two chunks of the body is decoded whole', async () => {
  const bytes = new TextEncoder().encode('<p>Привет</p>');
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(bytes.slice(0, 4));
      controller.enqueue(bytes.slice(4));
      controller.close();
    },
  });
  stub(new Response(body));
  expect(await fetchHtml('https://example.test/', 1, 0)).toBe('<p>Привет</p>');
});
