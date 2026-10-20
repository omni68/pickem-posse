import ExcelJS from "exceljs";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { normalizeWorkbook, validateWorkbook } from "../src/data/workbookParser.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = path.join(projectRoot, "public/data/workbook.json");
const metadataPath = path.join(projectRoot, "public/data/workbook-meta.json");
const sheetUrl = process.env.GOOGLE_SHEET_URL || "";

function spreadsheetIdFromUrl(value) {
  const match = String(value).match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  if (/^[a-zA-Z0-9_-]{20,}$/.test(String(value))) return String(value);
  throw new Error("GOOGLE_SHEET_URL must be a Google Sheets URL or spreadsheet ID.");
}

function cellRawValue(cell) {
  const value = cell.value;
  if (value == null) return null;
  if (value instanceof Date) return cell.text || value.toISOString();
  if (typeof value !== "object") return value;
  if (Object.prototype.hasOwnProperty.call(value, "result")) {
    const result = value.result;
    if (result instanceof Date) return cell.text || result.toISOString();
    if (result && typeof result === "object") return cell.text || null;
    return result ?? null;
  }
  if (Array.isArray(value.richText)) return value.richText.map((part) => part.text || "").join("");
  if (Object.prototype.hasOwnProperty.call(value, "text")) return value.text;
  if (Object.prototype.hasOwnProperty.call(value, "error")) return value.error;
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

async function fetchPublicWorkbook(spreadsheetId) {
  const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx`;
  const response = await fetch(exportUrl, { redirect: "follow" });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Public Google Sheet export failed (${response.status}): ${body.slice(0, 300)}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("spreadsheetml") && !contentType.includes("application/octet-stream")) {
    throw new Error(
      `Google did not return an Excel workbook (${contentType || "unknown content type"}). `
      + "Confirm the sheet is shared with anyone who has the link.",
    );
  }

  return Buffer.from(await response.arrayBuffer());
}

function revisionFromHtml(html) {
  const match = String(html).match(/"revision"\s*:\s*(\d+)/);
  if (!match) throw new Error("Google Sheet revision metadata was not found.");
  return match[1];
}

async function fetchPublicRevision(spreadsheetId) {
  const response = await fetch(
    `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit?usp=sharing`,
    { cache: "no-store", redirect: "follow" },
  );
  if (!response.ok) throw new Error(`Google Sheet revision request failed (${response.status}).`);
  return revisionFromHtml(await response.text());
}

async function fetchStablePublicWorkbook(spreadsheetId) {
  let revision = await fetchPublicRevision(spreadsheetId);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const buffer = await fetchPublicWorkbook(spreadsheetId);
    const confirmedRevision = await fetchPublicRevision(spreadsheetId);
    if (confirmedRevision === revision) return { buffer, revision };
    revision = confirmedRevision;
  }
  throw new Error("The Google Sheet changed repeatedly during import. Try again shortly.");
}

async function main() {
  if (!sheetUrl) throw new Error("GOOGLE_SHEET_URL is required.");
  const spreadsheetId = spreadsheetIdFromUrl(sheetUrl);
  const { buffer, revision } = await fetchStablePublicWorkbook(spreadsheetId);
  const revisionCheckedAt = new Date().toISOString();
  const sourceWorkbook = new ExcelJS.Workbook();
  await sourceWorkbook.xlsx.load(buffer);

  const source = {
    spreadsheetId,
    title: sourceWorkbook.title || "Pick'em Scoreboard",
    url: sheetUrl,
    generatedAt: new Date().toISOString(),
    revision,
    revisionCheckedAt,
    sheets: sourceWorkbook.worksheets.map((worksheet, index) => ({
      sheetId: worksheet.id,
      title: worksheet.name,
      index,
      rawValues: sheetMatrix(worksheet, cellRawValue),
      formattedValues: sheetMatrix(worksheet, (cell) => cell.text || ""),
    })),
  };

  const workbook = normalizeWorkbook(source);
  const errors = validateWorkbook(workbook);
  if (errors.length) throw new Error(`Workbook validation failed:\n- ${errors.join("\n- ")}`);

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(workbook)}\n`, "utf8");
  await fs.writeFile(metadataPath, `${JSON.stringify({
    version: 1,
    spreadsheetId,
    sheetUrl,
    bundledRevision: revision,
    generatedAt: workbook.generatedAt,
  })}\n`, "utf8");
  console.log(`Imported ${workbook.tabs.length} public workbook tabs.`);
}

await main();
