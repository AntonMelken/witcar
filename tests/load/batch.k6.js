// Load test for POST /api/widgets/batch (masterplan §19 Phase 4, task 8).
// Run against a preview deployment with mock providers:
//   k6 run -e BASE_URL=https://<preview> -e COOKIE="wc_device=..." tests/load/batch.k6.js
// Expectation: p95 < 300 ms, error rate < 1 %, upstream calls stay flat (shared cache).
import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  scenarios: {
    dashboards: { executor: "constant-vus", vus: 200, duration: "3m" },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<300"],
  },
};

const BASE = __ENV.BASE_URL || "http://localhost:3100";
const body = JSON.stringify({
  requests: [
    { kind: "weather", params: { lat: 52.52, lon: 13.41 } },
    { kind: "stock", params: { symbol: "AAPL" } },
    { kind: "crypto", params: { id: "bitcoin", vs: "eur" } },
  ],
});

export default function dashboardPoll() {
  const res = http.post(`${BASE}/api/widgets/batch`, body, {
    headers: {
      "content-type": "application/json",
      origin: BASE,
      cookie: __ENV.COOKIE || "",
      "x-forwarded-for": `10.0.${__VU % 250}.${__ITER % 250}`,
    },
  });
  check(res, { "status 200/429": (r) => r.status === 200 || r.status === 429 });
  sleep(60); // dashboards poll about once per minute
}
