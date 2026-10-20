import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { normalizeWorkbook, validateWorkbook } from "../src/data/workbookParser.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const inputPath = path.resolve(process.argv[2] || path.join(projectRoot, "raw-workbook.json"));
const outputPath = path.resolve(process.argv[3] || path.join(projectRoot, "public/data/workbook.json"));

const source = JSON.parse(await fs.readFile(inputPath, "utf8"));
const workbook = normalizeWorkbook(source);
const errors = validateWorkbook(workbook);

if (errors.length) {
  throw new Error(`Workbook validation failed:\n- ${errors.join("\n- ")}`);
}

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(workbook)}\n`, "utf8");
console.log(`Generated ${outputPath} with ${workbook.tabs.length} tabs.`);
