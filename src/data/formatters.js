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
