const userAgent = "sadykhzadeh-readme (+https://github.com/Sadykhzadeh/Sadykhzadeh)";

// The parsers read a few tens of kilobytes of markup, and the whole body is held in memory before parsing
const maxBytes = 5 * 1024 * 1024;

const readBody = async (response: Response): Promise<string> => {
  const chunks: Uint8Array[] = [];
  let size = 0;
  // Leaving the loop early cancels the stream, so an oversized body stops being downloaded
  for await (const chunk of response.body ?? []) {
    size += chunk.byteLength;
    if (size > maxBytes) throw new ClientError(`response is larger than ${maxBytes} bytes`);
    chunks.push(chunk);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
};

// A 4xx answer means the request itself is refused, so repeating it would fail the same way
// (408 and 429 are the exceptions: the server is only asking the client to come back later).
// A body over the size limit would come back just as large, so it is not retried either
class ClientError extends Error {}

// A hung connection used to stall the whole run, so every request gets a deadline and one retry.
// The retry waits a moment, since a server that answered 429 or 5xx would likely refuse it again at once
export const fetchHtml = async (url: string, attempts: number = 2, pauseMs: number = 1_000): Promise<string> => {
  for (let i = 1; ; i++) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": userAgent },
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) {
        const message = `HTTP ${response.status}`;
        const retryable = response.status >= 500 || response.status === 408 || response.status === 429;
        throw retryable ? new Error(message) : new ClientError(message);
      }
      return await readBody(response);
    } catch (error) {
      if (i >= attempts || error instanceof ClientError) throw error;
      await Bun.sleep(pauseMs);
    }
  }
}
