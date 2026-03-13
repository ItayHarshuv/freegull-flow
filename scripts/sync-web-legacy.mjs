import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const sourceEntries = ['App.tsx', 'store.tsx', 'types.ts', 'components', 'utils'];
const targetDir = path.join(repoRoot, 'apps', 'web', 'src', 'legacy');

function isIgnored(name) {
  return name === '.DS_Store';
}

function resetDirectory(dirPath) {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
    return;
  }

  for (const entry of readdirSync(dirPath, { withFileTypes: true })) {
    if (isIgnored(entry.name)) {
      continue;
    }

    rmSync(path.join(dirPath, entry.name), { recursive: true, force: true });
  }
}

function copyEntry(relativePath) {
  const sourcePath = path.join(repoRoot, relativePath);
  const targetPath = path.join(targetDir, relativePath);

  cpSync(sourcePath, targetPath, {
    recursive: true,
    force: true,
    filter: (src) => !isIgnored(path.basename(src)),
  });
}

resetDirectory(targetDir);

for (const entry of sourceEntries) {
  copyEntry(entry);
}

console.log(`Synced legacy app into ${path.relative(repoRoot, targetDir)}`);
