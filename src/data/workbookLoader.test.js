import { loadLatestWorkbook, revisionFromHtml } from './workbookLoader';

const spreadsheetId = '109oz6b2-TF-X8p_YbwIrsIHdwb4jM0vZs-_e4bXVlJo';
const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
const metadataUrl = '/data/workbook-meta.json';
const dataUrl = '/data/workbook.json';

function jsonResponse(value) {
  return { ok: true, json: async () => value };
}

function revisionResponse(revision) {
  return { ok: true, text: async () => `<script>{"revision":${revision}}</script>` };
}

function workbook(revision, label = 'workbook') {
  return {
    version: 1,
    label,
    source: { spreadsheetId, url: sheetUrl, revision },
    tabs: [{ slug: 'scoreboard' }],
  };
}

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: jest.fn((key) => values.get(key) ?? null),
    setItem: jest.fn((key, value) => values.set(key, value)),
  };
}

test('extracts the public revision marker', () => {
  expect(revisionFromHtml('before "revision": 2967, after')).toBe('2967');
  expect(() => revisionFromHtml('no revision here')).toThrow(/not found/i);
});

test('uses the browser cache when the current revision is unchanged', async () => {
  const cached = workbook('42', 'cached');
  const storage = memoryStorage({
    [`pickem-posse:workbook:v1:${spreadsheetId}`]: JSON.stringify({
      version: 1,
      spreadsheetId,
      revision: '42',
      workbook: cached,
    }),
  });
  const fetchImpl = jest.fn()
    .mockResolvedValueOnce(jsonResponse({ version: 1, spreadsheetId, sheetUrl, bundledRevision: '40' }))
    .mockResolvedValueOnce(revisionResponse('42'));
  const normalizeBuffer = jest.fn();

  await expect(loadLatestWorkbook({ metadataUrl, dataUrl, fetchImpl, storage, normalizeBuffer }))
    .resolves.toEqual(cached);
  expect(fetchImpl).toHaveBeenCalledTimes(2);
  expect(normalizeBuffer).not.toHaveBeenCalled();
});

test('uses the bundled workbook when its revision is current', async () => {
  const bundled = workbook('42', 'bundled');
  const storage = memoryStorage();
  const fetchImpl = jest.fn()
    .mockResolvedValueOnce(jsonResponse({ version: 1, spreadsheetId, sheetUrl, bundledRevision: '42' }))
    .mockResolvedValueOnce(revisionResponse('42'))
    .mockResolvedValueOnce(jsonResponse(bundled));

  await expect(loadLatestWorkbook({ metadataUrl, dataUrl, fetchImpl, storage }))
    .resolves.toEqual(bundled);
  expect(fetchImpl).toHaveBeenCalledTimes(3);
  expect(storage.setItem).toHaveBeenCalledTimes(1);
});

test('downloads and normalizes the live workbook when the revision changed', async () => {
  const fresh = workbook('43', 'fresh');
  const storage = memoryStorage();
  const exportBuffer = new ArrayBuffer(4);
  const fetchImpl = jest.fn()
    .mockResolvedValueOnce(jsonResponse({ version: 1, spreadsheetId, sheetUrl, bundledRevision: '42' }))
    .mockResolvedValueOnce(revisionResponse('43'))
    .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => exportBuffer })
    .mockResolvedValueOnce(revisionResponse('43'));
  const normalizeBuffer = jest.fn().mockResolvedValue(fresh);

  await expect(loadLatestWorkbook({ metadataUrl, dataUrl, fetchImpl, storage, normalizeBuffer }))
    .resolves.toEqual(fresh);
  expect(normalizeBuffer).toHaveBeenCalledWith(
    exportBuffer,
    expect.objectContaining({ spreadsheetId }),
    '43',
  );
  expect(storage.setItem).toHaveBeenCalledTimes(1);
});

test('bypasses stale caches when the revision check is unavailable', async () => {
  const fresh = workbook(null, 'fresh');
  const storage = memoryStorage();
  const fetchImpl = jest.fn()
    .mockResolvedValueOnce(jsonResponse({ version: 1, spreadsheetId, sheetUrl, bundledRevision: '42' }))
    .mockResolvedValueOnce({ ok: false, status: 503 })
    .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => new ArrayBuffer(2) });
  const normalizeBuffer = jest.fn().mockResolvedValue(fresh);

  await expect(loadLatestWorkbook({ metadataUrl, dataUrl, fetchImpl, storage, normalizeBuffer }))
    .resolves.toEqual(fresh);
  expect(normalizeBuffer).toHaveBeenCalledTimes(1);
  expect(storage.getItem).not.toHaveBeenCalled();
});

