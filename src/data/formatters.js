export const showCell = (value, fallback = '—') => value?.display || fallback;

export const cellNumber = (value) => {
  const number = Number(value?.raw);
  return Number.isFinite(number) ? number : null;
};

export const formatCurrency = (value, fallback = '$0') => {
  const number = cellNumber(value);
  if (number == null) return showCell(value, fallback);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: Number.isInteger(number) ? 0 : 2,
  }).format(number);
};

export const initials = (name = '') => name
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0])
  .join('')
  .toUpperCase();

export const valueTone = (value) => {
  const number = cellNumber(value);
  if (number == null || number === 0) return 'default';
  return number > 0 ? 'success' : 'error';
};

const dateParts = (value) => {
  const parsed = new Date(value?.raw || value?.display || '');
  if (Number.isNaN(parsed.getTime())) return null;
  return {
    year: parsed.getUTCFullYear(),
    month: parsed.getUTCMonth(),
    day: parsed.getUTCDate(),
  };
};

const timeParts = (value) => {
  const source = String(value?.raw || value?.display || '');
  const parsed = new Date(source);
  if (!Number.isNaN(parsed.getTime())) {
    return { hours: parsed.getUTCHours(), minutes: parsed.getUTCMinutes() };
  }

  const match = source.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3]?.toLowerCase();
  if (meridiem === 'pm' && hours < 12) hours += 12;
  if (meridiem === 'am' && hours === 12) hours = 0;
  return { hours, minutes };
};

export const gameStartTimestamp = (dateValue, timeValue) => {
  const date = dateParts(dateValue);
  const time = timeParts(timeValue);
  if (!date) return Number.POSITIVE_INFINITY;
  return Date.UTC(date.year, date.month, date.day, time?.hours || 0, time?.minutes || 0);
};

export const formatGameStart = (dateValue, timeValue) => {
  const date = dateParts(dateValue);
  const time = timeParts(timeValue);
  if (!date) return 'Date TBD';

  const calendarDate = new Date(Date.UTC(date.year, date.month, date.day));
  const dateTokens = new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).formatToParts(calendarDate).reduce((tokens, token) => ({ ...tokens, [token.type]: token.value }), {});
  const dateLabel = `${dateTokens.weekday} ${dateTokens.month} ${dateTokens.day}, ${dateTokens.year}`;
  if (!time) return `${dateLabel} @ Time TBD`;

  const hour = time.hours % 12 || 12;
  const minute = time.minutes ? `:${String(time.minutes).padStart(2, '0')}` : '';
  const meridiem = time.hours >= 12 ? 'pm' : 'am';
  return `${dateLabel} @ ${hour}${minute}${meridiem}`;
};
