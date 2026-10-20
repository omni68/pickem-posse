import { normalizeWorkbook, validateWorkbook } from './workbookParser.mjs';
const CACHE_VERSION = 1;
const CACHE_PREFIX = 'pickem-posse:workbook';

export function revisionFromHtml(html) {
  const match = String(html).match(/"revision"\s*:\s*(\d+)/);
  if (!match) throw new Error('Google Sheet revision metadata was not found.');
  return match[1];
}

export function spreadsheetIdFromUrl(value) {
  const match = String(value || '').match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  if (/^[a-zA-Z0-9_-]{20,}$/.test(String(value || ''))) return String(value);
  throw new Error('The workbook metadata does not contain a valid Google Sheet URL.');
}

function cacheKey(spreadsheetId) {
  return `${CACHE_PREFIX}:v${CACHE_VERSION}:${spreadsheetId}`;
}

function readCachedWorkbook(storage, spreadsheetId, revision) {
  if (!storage || !revision) return null;
  try {
    const cached = JSON.parse(storage.getItem(cacheKey(spreadsheetId)) || 'null');
    if (
      cached?.version === CACHE_VERSION
      && cached.spreadsheetId === spreadsheetId
      && cached.revision === revision
      && cached.workbook?.version === 1
    ) {
      return cached.workbook;
    }
  } catch {
    // A corrupt or unavailable browser cache should never block a fresh load.
  }
  return null;
}

function writeCachedWorkbook(storage, spreadsheetId, revision, workbook) {
  if (!storage || !revision) return;
  try {
    storage.setItem(cacheKey(spreadsheetId), JSON.stringify({
      version: CACHE_VERSION,
      spreadsheetId,
      revision,
      workbook,
    }));
  } catch {
    // Storage limits and privacy settings are safe to ignore; the live workbook is still usable.
  }
}

async function fetchJson(fetchImpl, url) {
  const response = await fetchImpl(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Workbook request failed (${response.status})`);
  return response.json();
}

export async function fetchPublicRevision(fetchImpl, spreadsheetId) {
  const response = await fetchImpl(
    `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit?usp=sharing`,
    {
      cache: 'no-store',
      credentials: 'omit',
      redirect: 'follow',
    },
  );
  if (!response.ok) throw new Error(`Google Sheet revision request failed (${response.status}).`);
  return revisionFromHtml(await response.text());
}

function cellRawValue(cell) {
  const value = cell.value;
  if (value == null) return null;
  if (value instanceof Date) return cell.text || value.toISOString();
  if (typeof value !== 'object') return value;
  if (Object.prototype.hasOwnProperty.call(value, 'result')) {
    const result = value.result;
    if (result instanceof Date) return cell.text || result.toISOString();
    if (result && typeof result === 'object') return cell.text || null;
    return result ?? null;
  }
  if (Array.isArray(value.richText)) return value.richText.map((part) => part.text || '').join('');
  if (Object.prototype.hasOwnProperty.call(value, 'text')) return value.text;
  if (Object.prototype.hasOwnProperty.call(value, 'error')) return value.error;
  return cell.text || null;
}

function sheetMatrix(worksheet, formatter) {
  return Array.from({ length: worksheet.rowCount }, (_, rowIndex) => {
    const row = worksheet.getRow(rowIndex + 1);
    return Array.from({ length: worksheet.columnCount }, (_, columnIndex) => (
      formatter(row.getCell(columnIndex + 1))
    ));
  });
}

export async function normalizeWorkbookBuffer(arrayBuffer, metadata, revision) {
  const excelJsModule = await import('exceljs');
  const ExcelJS = excelJsModule.default || excelJsModule;
  const sourceWorkbook = new ExcelJS.Workbook();
  await sourceWorkbook.xlsx.load(arrayBuffer);
  const revisionCheckedAt = new Date().toISOString();
  const source = {
    spreadsheetId: metadata.spreadsheetId,
    title: sourceWorkbook.title || "Pick'em Scoreboard",
    url: metadata.sheetUrl,
    generatedAt: revisionCheckedAt,
    revision,
    revisionCheckedAt,
    sheets: sourceWorkbook.worksheets.map((worksheet, index) => ({
      sheetId: worksheet.id,
      title: worksheet.name,
      index,
      rawValues: sheetMatrix(worksheet, cellRawValue),
      formattedValues: sheetMatrix(worksheet, (cell) => cell.text || ''),
    })),
  };
  const workbook = normalizeWorkbook(source);
  const errors = validateWorkbook(workbook);
  if (errors.length) throw new Error(`Workbook validation failed: ${errors.join(' ')}`);
  return workbook;
}

async function fetchWorkbookExport(fetchImpl, spreadsheetId) {
  const response = await fetchImpl(
    `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx`,
    {
      cache: 'no-store',
      credentials: 'omit',
      redirect: 'follow',
    },
  );
  if (!response.ok) throw new Error(`Public Google Sheet export failed (${response.status}).`);
  return response.arrayBuffer();
}

async function fetchFreshWorkbook({ fetchImpl, metadata, initialRevision, normalizeBuffer }) {
  let revision = initialRevision;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const arrayBuffer = await fetchWorkbookExport(fetchImpl, metadata.spreadsheetId);
    if (!revision) return normalizeBuffer(arrayBuffer, metadata, null);

    let confirmedRevision;
    try {
      confirmedRevision = await fetchPublicRevision(fetchImpl, metadata.spreadsheetId);
    } catch {
      return normalizeBuffer(arrayBuffer, metadata, null);
    }
    if (confirmedRevision === revision) {
      return normalizeBuffer(arrayBuffer, metadata, revision);
    }
    revision = confirmedRevision;
  }
  throw new Error('The Google Sheet changed repeatedly while loading. Please reload in a moment.');
}

export async function loadLatestWorkbook({
  metadataUrl,
  dataUrl,
  fetchImpl = window.fetch.bind(window),
  storage = window.localStorage,
  normalizeBuffer = normalizeWorkbookBuffer,
}) {
  let bundledWorkbook = null;
  let metadata;
  try {
    metadata = await fetchJson(fetchImpl, metadataUrl);
  } catch {
    bundledWorkbook = await fetchJson(fetchImpl, dataUrl);
    metadata = {
      version: 1,
      spreadsheetId: bundledWorkbook.source?.spreadsheetId,
      sheetUrl: bundledWorkbook.source?.url,
      bundledRevision: bundledWorkbook.source?.revision || null,
    };
  }

  const spreadsheetId = metadata.spreadsheetId || spreadsheetIdFromUrl(metadata.sheetUrl);
  metadata = { ...metadata, spreadsheetId };

  let currentRevision = null;
  try {
    currentRevision = await fetchPublicRevision(fetchImpl, spreadsheetId);
  } catch {
    // If freshness cannot be checked, bypass every cache and download the workbook.
  }

  const cachedWorkbook = readCachedWorkbook(storage, spreadsheetId, currentRevision);
  if (cachedWorkbook) return cachedWorkbook;

  if (currentRevision && metadata.bundledRevision === currentRevision) {
    bundledWorkbook ||= await fetchJson(fetchImpl, dataUrl);
    if (bundledWorkbook.source?.revision === currentRevision) {
      writeCachedWorkbook(storage, spreadsheetId, currentRevision, bundledWorkbook);
      return bundledWorkbook;
    }
  }

  const freshWorkbook = await fetchFreshWorkbook({
    fetchImpl,
    metadata,
    initialRevision: currentRevision,
    normalizeBuffer,
  });
  writeCachedWorkbook(storage, spreadsheetId, freshWorkbook.source?.revision, freshWorkbook);
  return freshWorkbook;
}
