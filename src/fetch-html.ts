// A hung connection used to stall the whole run, so every request gets a deadline and one retry
export const fetchHtml = async (url: string, attempts: number = 2): Promise<string> => {
  for (let i = 1; ; i++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } catch (error) {
      if (i >= attempts) throw error;
    }
  }
}
