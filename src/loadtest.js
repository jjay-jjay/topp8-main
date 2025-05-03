import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 100 }, // 1 นาที ขึ้นไป 100 users
    { duration: '1m', target: 200 }, // 1 นาที ขึ้นไป 200 users
    { duration: '1m', target: 300 }, // 1 นาที ขึ้นไป 300 users
    { duration: '1m', target: 400 }, // 1 นาที ขึ้นไป 400 users
    { duration: '30s', target: 0 },  // Cool down
  ],
};

export default function () {
  const res = http.get('https://jay2248-yader.github.io/topp6/');
  check(res, {
    'status is 200': (r) => r.status === 200,
  });
  sleep(1);
}
