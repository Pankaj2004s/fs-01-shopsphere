# ShopSphere Test Results

Result of the full server test suite, run on 16 November 2026.

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

## Not covered

- Test coverage percentage was not measured.
- The React client has no automated tests. It is checked with `npm run lint` and `npm run build` only.
- The Razorpay Checkout popup and a real webhook call from Razorpay were not tested end to end. Payment confirm and webhook logic is tested with generated signatures.
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
