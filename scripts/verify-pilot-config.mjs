import fs from 'node:fs';
import path from 'node:path';

const files = ['.env.example', 'TESTING.md', 'package.json'];
const required = ['OTP_PROVIDER', 'PAYMENTS_ONLINE_ENABLED', 'OLD_LOGIN_FALLBACK'];

let ok = true;
for (const file of files) {
  const full = path.join(process.cwd(), file);
  if (!fs.existsSync(full)) {
    console.error(`Missing required file: ${file}`);
    ok = false;
  }
}

for (const flag of required) {
  const text = fs.readFileSync(path.join(process.cwd(), '.env.example'), 'utf8');
  if (!text.includes(flag)) {
    console.error(`Missing feature flag in .env.example: ${flag}`);
    ok = false;
  }
}

if (!ok) process.exit(1);
console.log('Pilot config verification passed.');
