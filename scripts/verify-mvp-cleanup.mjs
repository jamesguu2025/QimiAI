import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const forbiddenFiles = [
  'pages/api/rag/test.ts',
  'pages/api/test-modules.ts',
];

const forbiddenReferences = [
  '/api/rag/test',
  '/api/test-modules',
  'pages/api/rag/test.ts',
  'pages/api/test-modules.ts',
];

const requiredFiles = [
  'pages/api/subscribe.ts',
];

const ignoredDirs = new Set([
  '.claude',
  '.git',
  '.next',
  'node_modules',
  '.vercel',
]);

const searchableExtensions = new Set([
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.mjs',
  '.json',
  '.md',
]);

const selfPath = path.join(root, 'scripts/verify-mvp-cleanup.mjs');
const failures = [];

for (const relativePath of forbiddenFiles) {
  if (fs.existsSync(path.join(root, relativePath))) {
    failures.push(`Forbidden public test endpoint still exists: ${relativePath}`);
  }
}

for (const relativePath of requiredFiles) {
  if (!fs.existsSync(path.join(root, relativePath))) {
    failures.push(`Required retained MVP file is missing: ${relativePath}`);
  }
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) {
        walk(path.join(dir, entry.name));
      }
      continue;
    }

    const filePath = path.join(dir, entry.name);
    if (filePath === selfPath || !searchableExtensions.has(path.extname(entry.name))) {
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    for (const token of forbiddenReferences) {
      if (content.includes(token)) {
        failures.push(`Forbidden public test endpoint reference found in ${path.relative(root, filePath)}: ${token}`);
      }
    }
  }
}

walk(root);

if (failures.length > 0) {
  console.error('MVP cleanup verification failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('MVP cleanup verification passed.');
