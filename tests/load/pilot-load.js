import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = {
  scenarios: {
    browse: {
      executor: 'ramping-vus',
      startVUs: 5,
      stages: [
        { duration: '30s', target: 25 },
        { duration: '30s', target: 75 },
        { duration: '30s', target: 100 },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<800'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';
  const res = http.get(`${baseUrl}/api/health`);
  check(res, {
    'health is 200': (r) => r.status === 200,
  });

  const productRes = http.get(`${baseUrl}/api/products?sort=featured`);
  check(productRes, {
    'products request success': (r) => r.status === 200,
  });

  sleep(1);
}
