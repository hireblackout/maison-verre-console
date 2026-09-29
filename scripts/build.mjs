import { copyFile, mkdir, rm, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'dist');

/* Listed explicitly rather than copying the directory: this is what keeps
   node_modules, test/ and the README out of the deployed site. */
const SITE = ['index.html', 'styles.css', 'app.js'];

const missing = [];
for (const f of SITE) {
  try {
    await stat(join(root, f));
  } catch {
    missing.push(f);
  }
}

if (missing.length) {
  console.error(`build failed: missing ${missing.join(', ')}`);
  process.exit(1);
}

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

for (const f of SITE) {
  await copyFile(join(root, f), join(out, f));
  console.log(`  ${f}`);
}

console.log(`\n${SITE.length} files -> dist/`);
