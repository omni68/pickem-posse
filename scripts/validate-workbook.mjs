import fs from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { validateWorkbook } = require("./lib/workbook-parser.cjs");
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const inputPath = path.resolve(process.argv[2] || path.join(projectRoot, "public/data/workbook.json"));
const contents = await fs.readFile(inputPath, "utf8");

const secretPatterns = [
  /-----BEGIN (?:RSA )?PRIVATE KEY-----/,
  /"private_key"\s*:/,
];
for (const pattern of secretPatterns) {
  if (pattern.test(contents)) throw new Error(`Credential material detected in ${inputPath}.`);
}

const workbook = JSON.parse(contents);
const errors = validateWorkbook(workbook);
if (errors.length) throw new Error(`Workbook validation failed:\n- ${errors.join("\n- ")}`);
console.log(`Validated ${workbook.tabs.length} workbook tabs with no embedded credentials.`);
