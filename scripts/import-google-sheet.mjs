import ExcelJS from "exceljs";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { normalizeWorkbook, validateWorkbook } = require("./lib/workbook-parser.cjs");
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = path.join(projectRoot, "public/data/workbook.json");
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

async function main() {
  if (!sheetUrl) throw new Error("GOOGLE_SHEET_URL is required.");
  const spreadsheetId = spreadsheetIdFromUrl(sheetUrl);
  const buffer = await fetchPublicWorkbook(spreadsheetId);
  const sourceWorkbook = new ExcelJS.Workbook();
  await sourceWorkbook.xlsx.load(buffer);

  const source = {
    spreadsheetId,
    title: sourceWorkbook.title || "Pick'em Scoreboard",
    url: sheetUrl,
    generatedAt: new Date().toISOString(),
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
  console.log(`Imported ${workbook.tabs.length} public workbook tabs.`);
}

await main();
