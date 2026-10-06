import process from 'node:process';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

const endpoints = [
  '/api/health',
  '/en',
  '/en/shop',
  '/en/verify-email',
];

async function check(url) {
  const res = await fetch(url, { redirect: 'manual' });
  return { url, status: res.status, ok: res.ok || [301, 302, 307, 308].includes(res.status) };
}

const results = await Promise.all(endpoints.map((path) => check(`${BASE_URL}${path}`)));
const failures = results.filter((result) => !result.ok);

if (failures.length > 0) {
  console.error('Smoke test failed:');
  for (const failure of failures) console.error(` - ${failure.url} -> ${failure.status}`);
  process.exit(1);
}

console.log('Smoke checks passed:', results.map((result) => `${result.url} -> ${result.status}`).join(', '));
