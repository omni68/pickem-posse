import { formatGameStart } from './formatters';

test('formats separate spreadsheet date and time values as one Central kickoff', () => {
  const date = {
    raw: 'Fri Oct 16 2026 19:00:00 GMT-0500 (Central Daylight Time)',
    display: 'Fri Oct 16 2026 19:00:00 GMT-0500 (Central Daylight Time)',
  };
  const time = {
    raw: 'Sat Dec 30 1899 05:00:00 GMT-0600 (Central Standard Time)',
    display: 'Sat Dec 30 1899 05:00:00 GMT-0600 (Central Standard Time)',
  };

  expect(formatGameStart(date, time)).toBe('Sat Oct 17, 2026 @ 11am CDT');
});

test('omits minutes on the hour and keeps minutes when needed', () => {
  const date = { raw: '2026-10-17T00:00:00.000Z', display: '' };

  expect(formatGameStart(date, { raw: '1899-12-30T19:00:00.000Z', display: '' }))
    .toBe('Sat Oct 17, 2026 @ 7pm CDT');
  expect(formatGameStart(date, { raw: '1899-12-30T19:15:00.000Z', display: '' }))
    .toBe('Sat Oct 17, 2026 @ 7:15pm CDT');
});
