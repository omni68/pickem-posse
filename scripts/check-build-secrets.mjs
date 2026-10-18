import fs from "node:fs/promises";
import path from "node:path";

const buildRoot = path.resolve("build");
const patterns = [
  /-----BEGIN (?:RSA )?PRIVATE KEY-----/,
  /"private_key"\s*:/,
];

async function filesIn(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? filesIn(target) : [target];
  }));
  return nested.flat();
}

const files = await filesIn(buildRoot);
for (const file of files) {
  const contents = await fs.readFile(file);
  if (contents.includes(0)) continue;
  const text = contents.toString("utf8");
  if (patterns.some((pattern) => pattern.test(text))) {
    throw new Error(`Credential marker detected in ${path.relative(buildRoot, file)}.`);
  }
}
console.log(`Scanned ${files.length} build files; no credential markers found.`);
