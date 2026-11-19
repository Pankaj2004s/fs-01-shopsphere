# ShopSphere Test Results

Result of the full server test suite, run on 16 November 2026. Since that run, only documentation, the seed script and static product images have changed. No API or server logic code has changed.

## Summary

| Item | Result |
| --- | --- |
| Test files | 25 passed (25) |
| Tests | 315 passed (315) |
| Failed or skipped | 0 |
| Duration | 215.97 s |
| Runner | vitest 5.0.5 |
| Node.js | v22.14.0 |
| OS | Windows (Git Bash) |

Command used (from the `server` folder):

```bash
npx vitest run --reporter=verbose
```

## Test environment

- Tests run against a separate MongoDB database, `shopsphere_test`. The development database is never touched.
- Redis 7 and Elasticsearch 9.0.0 run in Docker (`docker compose up -d` from the repo root) and are used for real by the tests that need them. Elasticsearch needs about a minute to become healthy; check `docker compose ps` before starting.
- API tests call the Express app in-process, so no server port is needed.
- The S3 storage adapter is tested with a mock. It was not run against live AWS.
- Rate limiting is switched off in tests except in `rateLimit.test.js`, which turns it on for that file.

## Tests per file

| File | Tests |
| --- | --- |
| `auth.test.js` | 16 |
| `me.test.js` | 7 |
| `users.vendor.test.js` | 4 |
| `categories.test.js` | 10 |
| `products.read.test.js` | 17 |
| `products.write.test.js` | 33 |
| `products.mine.test.js` | 8 |
| `products.search.test.js` | 14 |
| `products.cache.test.js` | 9 |
| `cart.test.js` | 31 |
| `orders.place.test.js` | 11 |
| `orders.history.test.js` | 14 |
| `orders.vendor.test.js` | 13 |
| `orders.stats.test.js` | 8 |
| `orders.status.test.js` | 28 |
| `payments.test.js` | 14 |
| `payments.webhook.test.js` | 11 |
| `uploads.test.js` | 9 |
| `storage.test.js` | 15 |
| `cache.test.js` | 9 |
| `rateLimit.test.js` | 5 |
| `errorHandler.test.js` | 12 |
| `health.test.js` | 1 |
| `helpers.test.js` | 2 |
| `gaps.test.js` | 14 |
| **Total** | **315** |

## Tests per area

| Area | Files | Tests |
| --- | --- | --- |
| Auth and users | auth, me, users.vendor | 27 |
| Categories | categories | 10 |
| Products (read, write, vendor list, search, cache) | products.* | 81 |
| Cart | cart | 31 |
| Orders (place, history, vendor, stats, status) | orders.* | 74 |
| Payments (create, confirm, webhook) | payments, payments.webhook | 25 |
| Uploads and storage adapters | uploads, storage | 24 |
| Cache, rate limit, error handler, health, helpers, extra cases | cache, rateLimit, errorHandler, health, helpers, gaps | 43 |
| **Total** | **25 files** | **315** |

## Performance (local measurements)

Measured on 18 November 2026 on the development machine (Windows, local MongoDB, Redis and Elasticsearch in Docker). This is a simple latency check, not a load test: one client sent 10 requests one after another to each endpoint with curl, and the total time of every request was recorded.

| Endpoint | First request | Next 9 requests (average) | Min | Max |
| --- | --- | --- | --- | --- |
| `/api/health` | 4.6 ms | 3.6 ms | 2.6 ms | 5.0 ms |
| `/api/categories` | 33.4 ms | 8.4 ms | 8.0 ms | 9.4 ms |
| `/api/products?limit=10` | 32.5 ms | 9.3 ms | 8.5 ms | 11.0 ms |
| `/api/products?search=runing` | 249.5 ms | 9.0 ms | 7.7 ms | 11.7 ms |

How to read it:

- The first request is a cache miss. It reads from MongoDB, and for search also from Elasticsearch. The first search request may also include one-time warm-up work.
- The next requests are answered from the Redis cache (cache-aside, 60 seconds for products and 5 minutes for categories).
- `/api/health` touches no database or cache, so it shows the base cost of the server and of curl itself.

Not measured: concurrent load, and the latency of the deployed server. The free Render plan sleeps when idle, and the first request after a sleep can take about a minute.

Command used (from the `server` folder, with the server running):

```bash
for url in "api/health" "api/categories" "api/products?limit=10" "api/products?search=runing"; do
  echo "== $url"
  for i in 1 2 3 4 5 6 7 8 9 10; do
    curl -s -o /dev/null -w "%{time_total}\n" "http://localhost:5000/$url"
  done
done
```

## Manual browser check

Done by hand on 18 November 2026, on a local run (client on port 5173, server on port 5000), with Razorpay in test mode:

- Home page and product list, with the product images
- Search for `runing`, which finds Running Shoes
- Register, and the logged-in navbar
- Product detail, add to cart, cart page and placing an order
- Orders page with the Pay now button, which opens Razorpay Checkout in test mode
- A payment with an international test card was rejected by Razorpay. The app showed Razorpay's message and the order stayed unpaid
- A payment with a domestic test card succeeded, and the order then showed the Paid badge (payment signature verified by the server)

Not checked in a browser: the vendor pages (dashboard, product form, vendor orders), the admin flow, the mobile layout, and the deployed site (it was checked with curl only).

## Not covered

- Test coverage percentage was not measured.
- The React client has no automated tests. It is checked with `npm run lint`, `npm run build` and the manual browser check above.
- A real webhook call from Razorpay after a payment was not tested, because Razorpay cannot reach a local server. The webhook logic is tested with generated signatures, and a signed test event was sent to the deployed server with curl.
- The S3 adapter was not run on live AWS (no AWS account). The Cloudinary adapter was checked live once with curl on the deployed API.

## Live checks on the deployed system

Done with curl after deployment (no browser):

- Health check, product list and category list from MongoDB Atlas.
- CORS preflight with the Vercel origin returns 204.
- Register (201), login (200) and become-vendor (200).
- Login rate limit headers are present (10 per 15 minutes), so the Redis limiter works.
- Webhook without a signature returns 400, and a signed test event returns 200.
- Image upload to Cloudinary returns 201 and a working `res.cloudinary.com` URL.
- Search for `runing` finds Running Shoes (typo tolerance from Elasticsearch), and `zzzzqq` returns an empty list.

## How to re-run

```bash
cd /d/coding/fs-01-shopsphere
docker compose up -d
docker compose ps
cd server
npx vitest run
```

Run a single file with `npx vitest run tests/cart.test.js`.
