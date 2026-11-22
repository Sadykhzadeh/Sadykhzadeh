import { expect, setSystemTime, test } from 'bun:test';
import { nowUTC } from './nowUTC';

test('the timestamp is the UTC time, whatever the local zone', () => {
  const cases = [
    ['2026-03-29T00:59:59.999Z', '2026-03-29 00:59:59 (UTC time)'],
    ['2026-03-29T01:00:00.000Z', '2026-03-29 01:00:00 (UTC time)'],
    ['2026-10-25T00:59:59.999Z', '2026-10-25 00:59:59 (UTC time)'],
    ['2026-12-31T23:59:59.999Z', '2026-12-31 23:59:59 (UTC time)'],
    ['2027-01-01T00:00:00.000Z', '2027-01-01 00:00:00 (UTC time)'],
  ];
  try {
    for (const [now, stamp] of cases) {
      setSystemTime(new Date(now));
      expect(nowUTC()).toBe(stamp);
    }
  } finally {
    setSystemTime();
  }
});
