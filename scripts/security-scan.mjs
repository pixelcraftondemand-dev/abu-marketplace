import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const secretPatterns = [
  /AKIA[0-9A-Z]{16}/,
  /AIza[0-9A-Za-z\-_]{35}/,
  /ghp_[A-Za-z0-9]{36,}/,
  /sk-(live|test)_[A-Za-z0-9]{16,}/,
  /BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY/,
];

function scanForSecrets() {
  const files = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (['.git', 'node_modules', '.next', 'coverage', 'tmp-pgdata'].includes(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(env|json|js|ts|tsx|mjs|md|yml|yaml)$/.test(entry.name) || entry.name.startsWith('.env')) {
        files.push(full);
      }
    }
  }
  walk(root);

  const hits = [];
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    for (const pattern of secretPatterns) {
      if (pattern.test(text)) {
        hits.push(`${path.relative(root, file)}: likely secret match`);
        break;
      }
    }
  }

  return hits;
}

try {
  console.log('Running npm audit (high only)...');
  execSync('npm audit --audit-level=high', { stdio: 'inherit' });

  const secretHits = scanForSecrets();
  if (secretHits.length > 0) {
    console.error('\nSecret scanner found likely credentials in the repo:');
    for (const hit of secretHits) console.error(` - ${hit}`);
    process.exit(1);
  }

  console.log('\nSecurity scan passed.');
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('npm audit') || message.includes('`npm audit`')) {
    console.error('\nSecurity scan failed because a high-severity vulnerability was reported.');
  }
  process.exit(error && typeof error === 'object' && 'status' in error ? error.status : 1);
}
