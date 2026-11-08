# ShopSphere

A multi-vendor marketplace built with the MERN stack (MongoDB, Express, React, Node.js), with Redis for caching and rate limiting, Elasticsearch for product search and Razorpay (test mode) for payments.

> Status: in development. Steps 1 to 10 are complete: setup, authentication and roles, products and categories, cart and orders, automated tests, React client, Tailwind styling, vendor features with image upload, Redis plus Elasticsearch, and Razorpay payments with a webhook.

## Tech Stack

- **Frontend:** React 19 (Vite), JavaScript, React Router, Context API, Tailwind CSS 4
- **Backend:** Node.js, Express 5 (ES modules)
- **Database:** MongoDB with Mongoose
- **Cache and rate limiting:** Redis (node-redis, express-rate-limit with a Redis store)
- **Search:** Elasticsearch 9 (official Node client)
- **Payments:** Razorpay in test mode (REST API with Node's built-in `fetch`, Razorpay Checkout in the browser)
- **File upload:** multer (memory storage) with a pluggable storage adapter (local disk for now)
- **Auth and validation:** JWT, bcryptjs, zod
- **Security and logging:** helmet, cors, morgan
- **Infrastructure:** Docker Compose for Redis and Elasticsearch
- **Testing:** Vitest, Supertest, @vitest/coverage-v8

## Features So Far

### Core marketplace

- Register and login with hashed passwords (bcrypt, 12 salt rounds)
- JWT authentication with a protected `GET /api/auth/me` route
- Role-based access control (customer, vendor, admin)
- Request validation with zod for body, route params and query string (unknown fields such as `role` or `vendor` are stripped)
- Categories: public list, admin-only create with auto-generated slug and case-insensitive duplicate check
- Products: vendors and admins can create, update and delete; vendors can only modify their own products (ownership check)
- Product listing with pagination, text search, category and price filters, and whitelisted sorting
- Cart: one cart per user; add items, set quantity and remove items; live prices, line totals and a cart total; quantity is checked against stock
- Orders: place an order from the cart; name, price and vendor of every item are saved as a snapshot, so later price changes or product deletion never change old orders
- Stock safety: stock is reserved with an atomic conditional update (no overselling when two customers buy the last item) and is rolled back if any item fails
- Order history for customers with pagination and a status filter
- Order status flow with allowed transitions; cancelling an order puts the items back in stock exactly once
- Seed script for sample categories, vendors and products (idempotent)
- Centralized error handling with a custom `ApiError` class, Mongo duplicate, validation, cast and upload errors mapped to 409, 400 or 413, and safe messages in production

### Vendor features

- Become a seller: a customer upgrades to vendor with one request (atomic update, so it only works from the customer role)
- Image upload: multipart upload with type whitelist (JPEG, PNG, WebP), 5 MB limit, UUID file names and no user-supplied names; images are served from `/uploads`
- Storage adapter: the upload controller only knows `saveImage`, so local disk can be replaced by cloud storage without touching the controller
- Vendor product list (`GET /api/products/mine`): the vendor id always comes from the token, never from the query
- Vendor orders: a vendor sees only the orders that contain their products, and only their own items and subtotal (customer name only)
- Vendor dashboard statistics computed with a MongoDB aggregation: orders, revenue (confirmed, shipped and delivered only), units sold, orders per status, product count and low-stock products

### Performance and search

- Rate limiting: login, register and image upload are limited per IP, with counters stored in Redis
- Redis cache with the cache-aside pattern: the category list and the public product list are cached; any product or stock change invalidates the product cache
- Elasticsearch search: stemming, typo tolerance and a higher weight for matches in the product name; filters, sorting and pagination run inside Elasticsearch
- Products are synced to Elasticsearch on create, update, delete, order and cancel, and `npm run reindex` rebuilds the whole index from MongoDB
- Graceful degradation: if Redis is down the app reads straight from MongoDB, and if Elasticsearch is down search falls back to MongoDB text search

### Payments

- Razorpay in test mode: the server creates a Razorpay order for an order of the logged-in customer, the browser opens Razorpay Checkout, and the server verifies the payment signature before it marks the order paid
- The amount is never sent by the client: the server reads the order total, converts it to paise and sends that to Razorpay
- Payment status is a separate field (`unpaid`, `paid`, `failed`) from the order status (`pending` to `delivered`), so the vendor fulfilment flow is not affected
- Confirmation is idempotent: confirming twice, or a webhook after a confirm, never changes a paid order again
- Webhook as a backup: Razorpay calls the server directly, so an order is still marked paid if the customer closes the browser after paying
- Missing Razorpay keys do not stop the server: only the payment endpoints answer 503
- Automated test suite: 300 tests, including concurrency tests for stock reservation and double cancel, and payment and webhook tests with the Razorpay network call replaced by a stub

## Client (React)

The client talks to the API through one small fetch wrapper (`src/api/client.js`). It adds the base URL from `VITE_API_URL`, the Bearer token and the JSON header (or no header for `FormData` uploads), and turns network and HTTP errors into a single `ApiError` with a `status` and the server message. The UI is styled with Tailwind CSS.

- Register, login and logout; the token is kept in `localStorage` and checked with `GET /api/auth/me` when the page reloads
- Auth state in a React Context (`AuthProvider` and a `useAuth` hook); a role change takes effect without a new token because the server reads the role from the database on every request
- Protected routes: guests who open the cart or orders are sent to login and come back to the same page after logging in
- Product list with a search box, category, price and sort filters, loading, error and empty states, and pagination; every filter and the page number live in the URL, so refresh, back button and shared links work
- Search and price inputs are debounced, so a request is sent only when the user stops typing
- Product detail page with an add-to-cart form (quantity limited by stock)
- Cart page: change quantity, remove items, see line totals and the total from the server, place an order
- Order history with pagination, an order status badge, a payment status badge, a Pay now button for unpaid orders and a cancel button for pending and confirmed orders
- Pay now loads the Razorpay checkout script only when it is needed, opens the popup with data from the server, and sends the three values returned by the popup to the server for verification
- Vendor area: dashboard with statistic cards and a low-stock list, product list with add, edit and delete, one form for create and edit with multi-image upload (up to 5), and an orders page with status buttons

| Route                       | Access         | Page                                 |
| --------------------------- | -------------- | ------------------------------------ |
| `/`                         | Public         | Home with featured products          |
| `/products`                 | Public         | Product list with search and filters |
| `/products/:id`             | Public         | Product detail, add to cart          |
| `/login`                    | Public         | Login                                |
| `/register`                 | Public         | Register                             |
| `/cart`                     | Logged-in user | Cart and place order                 |
| `/orders`                   | Logged-in user | Order history, pay and cancel        |
| `/become-seller`            | Logged-in user | Upgrade to a vendor account          |
| `/vendor/dashboard`         | Vendor         | Statistics and low stock             |
| `/vendor/products`          | Vendor         | My products                          |
| `/vendor/products/new`      | Vendor         | Create a product                     |
| `/vendor/products/:id/edit` | Vendor         | Edit a product                       |
| `/vendor/orders`            | Vendor         | Orders containing my products        |
| `*`                         | Public         | 404 page                             |

The route guards only decide what the UI shows. The real protection is the `protect` and `authorize` middleware on the server.

## Folder Structure

```
fs-01-shopsphere/
├── docker-compose.yml      # Redis and Elasticsearch for local development
├── client/                 # React app (Vite)
│   └── src/
│       ├── api/            # fetch wrapper and API functions (auth, products, cart, orders, payments, users, uploads, categories)
│       ├── components/     # Layout, ProtectedRoute, VendorRoute, ProductCard, ProductFilters, Pagination
│       ├── context/        # auth context and AuthProvider
│       ├── hooks/          # useAuth, useDebouncedValue
│       ├── pages/          # Home, Products, ProductDetail, Cart, Orders, Login, Register, BecomeSeller, NotFound
│       │   └── vendor/     # Dashboard, VendorProducts, ProductForm, VendorOrders
│       ├── utils/          # buildQuery, formatPrice, loadRazorpay
│       ├── App.jsx         # route table
│       └── main.jsx        # entry point (StrictMode, BrowserRouter, AuthProvider)
└── server/                 # Express API
    ├── tests/              # Vitest and Supertest tests
    │   └── helpers/        # database helpers and data factories
    └── src/
        ├── config/         # env, database, Redis and Elasticsearch clients
        ├── features/       # one folder per feature
        │   ├── auth/       # schemas, service, controller, routes
        │   ├── cart/       # model, schemas, service, controller, routes
        │   ├── categories/ # model, schemas, service, controller, routes
        │   ├── health/     # health check route
        │   ├── orders/     # model, schemas, transitions, service, controller, routes
        │   ├── payments/   # schemas, service, controller, webhook route, providers/razorpay.provider.js
        │   ├── products/   # model, schemas, service, controller, routes
        │   ├── search/     # Elasticsearch index mapping, search query and sync helpers
        │   ├── uploads/    # upload controller and routes
        │   └── users/      # user model, become-vendor service, controller, routes
        ├── middlewares/    # auth (protect, authorize), validate, upload (multer), rateLimit, notFound, errorHandler
        ├── scripts/        # seed and reindex scripts
        ├── storage/        # local disk image storage adapter
        ├── utils/          # ApiError, asyncHandler, token (jwt helpers), cache (Redis cache helper)
        ├── app.js          # express app and middleware setup
        └── server.js       # connects to the services and starts the server
```

## Getting Started

### Prerequisites

- Node.js 22 (developed and tested on 22.14)
- MongoDB running locally (or a MongoDB Atlas connection string)
- Docker Desktop, for Redis and Elasticsearch
- (Optional) a Razorpay account in test mode, for payments

### Setup

1. Clone the repo and install dependencies:

```bash
git clone https://github.com/Pankaj2004s/fs-01-shopsphere.git
cd fs-01-shopsphere/server && npm install
cd ../client && npm install
```

2. Create `server/.env` using `server/.env.example` as a template, and create `client/.env` by copying `client/.env.example`:

```bash
cp client/.env.example client/.env
```

3. Start Redis and Elasticsearch (from the repo root). Elasticsearch needs about a minute before it is healthy:

```bash
docker compose up -d
docker compose ps
```

4. (Optional) Load sample data and copy it into the search index:

```bash
cd server && npm run seed
npm run reindex
```

5. Run the backend and the frontend in two terminals:

```bash
cd server && npm run dev
cd client && npm run dev
```

- API: http://localhost:5000/api/health
- App: http://localhost:5173

Restart the Vite dev server after you change `client/.env`, because Vite reads it only at startup.

The server also starts without Docker: with Redis down there is no cache and rate limit counters are skipped, and with Elasticsearch down search uses MongoDB. Run `npm run reindex` whenever products were changed outside the API (for example after `npm run seed`). The server also starts without Razorpay keys, and then only the payment endpoints answer 503.

## Testing

The tests are integration tests: Supertest calls the Express app directly (no open port) and the requests go through the routes, middleware, controllers and services to real MongoDB, Redis and Elasticsearch. Start the Docker containers before running them.

```bash
cd server
npm test                # run all tests once
npm run test:watch      # re-run tests when files change
npm run test:coverage   # run all tests and print a coverage report
```

- Tests use a separate MongoDB database, `shopsphere_test`, a separate Redis database (number 1) and a separate Elasticsearch index (`shopsphere-products-test`). The values are set in `server/vitest.config.js`, so development data is never touched. The test helper refuses to run if the database name does not end with `_test`, and the cache tests refuse to run if the Redis URL is not database 1.
- Tests run with `SEARCH_ENGINE=mongodb`, so most product tests do not need the search index. Only `products.search.test.js` switches to Elasticsearch.
- Payment tests never call Razorpay: they replace the global `fetch` with a stub and set test keys on the `env` object, so no internet and no real keys are needed. Webhook tests build an event body and sign it with a test webhook secret, like Razorpay does.
- Collections are cleared after every test, and test files run one after another because they share one database.
- The full run takes about 4 minutes, mostly because bcrypt (12 rounds) is slow on purpose.
- Elasticsearch needs about a minute after `docker compose up -d`. Tests started earlier fail with connection errors.

What is covered:

- Auth: register, login, `/me`, forged and expired tokens, mass assignment of `role`
- Categories and products: roles (401 vs 403), ownership, admin override, validation, filters and pagination
- Cart: add, set, remove, stock checks, per-user isolation
- Orders: stock reservation, price snapshot, rollback, two buyers racing for the last item, order history and ownership (404 instead of 403), vendor privacy, status flow, double cancel restoring stock only once, vendor statistics
- Vendor features: become-vendor, image upload (size and type limits, cross-origin image header), vendor product list and its data isolation
- Rate limiter: 429 after the limit, custom message, standard headers, separate counters per limiter
- Cache: hit and miss, key order, TTL, invalidation, fallback when Redis fails, and invalidation on product create, update, delete, order and cancel
- Search: stemming, typo tolerance, filters, sorting, pagination, sync on create, update, delete and orders, and fallback to MongoDB when Elasticsearch fails
- Payments: amount in paise, secret never in a response, 404 for another user's order, 409 for cancelled or paid orders, 502 when Razorpay rejects, 503 without keys, valid and invalid signatures, a payment of a different provider order, idempotent confirm
- Webhook: missing, wrong and valid signatures, invalid JSON, `payment.captured` and `payment.failed`, the same event twice, a paid order never becoming failed, failed then captured, unknown order and unknown event answered with 200

Latest result: 24 test files, 300 tests, all passing.

The coverage table below was measured after Step 5 (206 tests) and has not been measured again.

| Metric     | Coverage |
| ---------- | -------- |
| Statements | 98.77%   |
| Branches   | 94.36%   |
| Functions  | 98.68%   |
| Lines      | 98.99%   |

`src/server.js` and `src/scripts/` are excluded.

## Environment Variables

### Server (`server/.env`)

| Variable                  | Description                                                               |
| ------------------------- | ------------------------------------------------------------------------- |
| `PORT`                    | Server port (default 5000)                                                |
| `MONGO_URI`               | MongoDB connection string (required)                                      |
| `CLIENT_URL`              | Allowed frontend origin for CORS                                          |
| `NODE_ENV`                | `development` or `production`                                             |
| `JWT_SECRET`              | Secret used to sign tokens (required)                                     |
| `JWT_EXPIRES_IN`          | Token lifetime, for example `7d` (default 7d)                             |
| `SERVER_URL`              | Public URL of the server, used in image URLs (default `http://localhost:PORT`) |
| `UPLOAD_DIR`              | Folder for uploaded images (default `uploads`)                            |
| `REDIS_URL`               | Redis connection string (default `redis://127.0.0.1:6379`)                |
| `ELASTICSEARCH_URL`       | Elasticsearch address (default `http://127.0.0.1:9200`)                   |
| `SEARCH_ENGINE`           | `elasticsearch` (default) or `mongodb` to search with MongoDB text search |
| `RAZORPAY_KEY_ID`         | Razorpay key id, `rzp_test_...` in test mode (payments are off when empty) |
| `RAZORPAY_KEY_SECRET`     | Razorpay key secret, used to create orders and verify payments. Never commit it |
| `RAZORPAY_WEBHOOK_SECRET` | Secret chosen by you and set in the Razorpay dashboard for the webhook, used to verify webhook calls |

Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Client (`client/.env`)

| Variable       | Description                                                                   |
| -------------- | ----------------------------------------------------------------------------- |
| `VITE_API_URL` | Base URL of the API including `/api`, for example `http://localhost:5000/api` |

Only variables that start with `VITE_` are visible to browser code. Never put a secret in them. The Razorpay key id reaches the browser through the API response, and the key secret never leaves the server.

## API Endpoints

| Method | Endpoint                       | Access                          | Description                                                       |
| ------ | ------------------------------ | ------------------------------- | ----------------------------------------------------------------- |
| GET    | `/api/health`                  | Public                          | Server health and uptime                                          |
| POST   | `/api/auth/register`           | Public                          | Create a customer account, returns user and token                 |
| POST   | `/api/auth/login`              | Public                          | Login, returns user and token (rate limited)                      |
| GET    | `/api/auth/me`                 | Logged-in user                  | Returns the current user                                          |
| POST   | `/api/users/become-vendor`     | Customer                        | Upgrade my account to a vendor (409 if already a vendor)          |
| GET    | `/api/categories`              | Public                          | List all categories (cached)                                      |
| POST   | `/api/categories`              | Admin only                      | Create a category                                                 |
| GET    | `/api/products`                | Public                          | List products with pagination, search and filters                 |
| GET    | `/api/products/mine`           | Vendor or admin                 | List my own products (same query parameters, never cached)        |
| GET    | `/api/products/:id`            | Public                          | Get one product                                                   |
| POST   | `/api/products`                | Vendor or admin                 | Create a product (vendor is taken from the token)                 |
| PATCH  | `/api/products/:id`            | Owner or admin                  | Update fields of a product                                        |
| DELETE | `/api/products/:id`            | Owner or admin                  | Delete a product                                                  |
| POST   | `/api/uploads/images`          | Vendor or admin                 | Upload one image (field `image`), returns `{ url }` (rate limited) |
| GET    | `/uploads/:file`               | Public                          | Serve an uploaded image                                           |
| GET    | `/api/cart`                    | Logged-in user                  | View my cart with live prices and total                           |
| POST   | `/api/cart/items`              | Logged-in user                  | Add a product (quantity defaults to 1, checked against stock)     |
| PATCH  | `/api/cart/items/:productId`   | Logged-in user                  | Set the quantity of an item                                       |
| DELETE | `/api/cart/items/:productId`   | Logged-in user                  | Remove an item from the cart                                      |
| POST   | `/api/orders`                  | Logged-in user                  | Place an order from the cart                                      |
| GET    | `/api/orders`                  | Logged-in user                  | My orders with pagination and status filter                       |
| GET    | `/api/orders/vendor`           | Vendor only                     | Orders that contain my products, showing only my items            |
| GET    | `/api/orders/vendor/stats`     | Vendor only                     | Dashboard numbers: orders, revenue, units, statuses, low stock    |
| GET    | `/api/orders/:id`              | Order owner                     | Get one of my orders                                              |
| PATCH  | `/api/orders/:id/status`       | Customer or vendor of the order | Change the order status (rules below)                             |
| POST   | `/api/orders/:id/pay`          | Order owner                     | Create a Razorpay order for my unpaid order, returns checkout data |
| POST   | `/api/orders/:id/pay/confirm`  | Order owner                     | Verify the payment signature and mark the order paid              |
| POST   | `/api/payments/webhook`        | Razorpay (signature)            | Razorpay events, verified with the webhook secret, raw body       |

Protected routes expect the header `Authorization: Bearer <token>`.

### Product list query parameters

| Param      | Default  | Description                                          |
| ---------- | -------- | ---------------------------------------------------- |
| `page`     | `1`      | Page number                                          |
| `limit`    | `10`     | Items per page (max 50)                              |
| `search`   | none     | Text search on name and description                  |
| `category` | none     | Category id                                          |
| `minPrice` | none     | Minimum price                                        |
| `maxPrice` | none     | Maximum price                                        |
| `sort`     | `newest` | One of `newest`, `oldest`, `price_asc`, `price_desc` |

With `search`, the products come from Elasticsearch (all words must match, small typos are accepted, matches in the name count three times more) and the result is ordered by `sort`, not by relevance. Without `search`, or when Elasticsearch fails, MongoDB answers.

Example:

```bash
curl "http://localhost:5000/api/products?search=book&sort=price_asc&page=1&limit=5"
```

### Order list query parameters

Used by `GET /api/orders` and `GET /api/orders/vendor`.

| Param    | Default | Description                                                        |
| -------- | ------- | ------------------------------------------------------------------ |
| `page`   | `1`     | Page number                                                        |
| `limit`  | `10`    | Items per page (max 50)                                            |
| `status` | none    | One of `pending`, `confirmed`, `shipped`, `delivered`, `cancelled` |

### Order status flow

```
pending -> confirmed -> shipped -> delivered
pending -> cancelled
confirmed -> cancelled
```

Send `PATCH /api/orders/:id/status` with a body like `{ "status": "shipped" }`.

- A customer can only cancel their own order. A vendor whose product is in the order can set `confirmed`, `shipped`, `delivered` or `cancelled`.
- `delivered` and `cancelled` are final.
- A status the role may not set returns 403. A change that is not allowed from the current status returns 409. An order that is not yours returns 404.
- Cancelling puts the items back in stock. The status change is a compare-and-set update, so two cancel requests at the same time restore stock only once.

## Redis and Elasticsearch

### Rate limits

| Route                      | Limit                       |
| -------------------------- | --------------------------- |
| `POST /api/auth/login`     | 10 requests per 15 minutes  |
| `POST /api/auth/register`  | 5 requests per hour         |
| `POST /api/uploads/images` | 30 requests per 15 minutes  |

The limit is counted per IP in Redis, so it survives a restart and is shared by several server instances. A request over the limit gets `429` with a JSON `message`. If Redis fails, the request is let through (fail open). The limiters are skipped in the test environment.

### Cache

| Data                 | Time to live | Cleared when                                    |
| -------------------- | ------------ | ----------------------------------------------- |
| Category list        | 5 minutes    | a category is created                           |
| Public product list  | 60 seconds   | a product is created, updated or deleted, or stock changes by an order or a cancel |

The vendor's own product list is never cached, because a shared cache must not hold per-user data. Invalidation uses a version number per namespace: one atomic increment makes all old keys unreachable, and they expire by themselves.

### Search index

MongoDB stays the source of truth. Elasticsearch holds a copy with strict mapping (`name` and `description` as English text, `price` and `stock` as numbers, `category` and `vendor` as exact keywords). The search returns only product ids, and the full products, with category and vendor names, are loaded from MongoDB, so the response has the same shape as the normal list.

- The index is created on server start if it does not exist
- Writes go to MongoDB first, then to Elasticsearch, then the cache is cleared
- `npm run reindex` recreates the index and copies every product from MongoDB in batches of 500

## Payments (Razorpay test mode)

An order has two separate states: `status` (fulfilment: `pending` to `delivered`) and `paymentStatus` (money: `unpaid`, `paid`, `failed`). The `payment` object on the order keeps the provider name, the Razorpay order id, the Razorpay payment id and the time of payment. Orders created before payments existed read as `unpaid`, so no migration is needed.

### Flow

1. `POST /api/orders/:id/pay`: the server finds the order of the logged-in user (another user's order is a 404), refuses a cancelled order or an already paid order (409), converts the total to paise, creates the order at Razorpay (`POST /v1/orders` with Basic auth and an 8 second timeout), saves the Razorpay order id on the order and returns the id, amount, currency and the public key id. The client never sends an amount.
2. The browser loads `checkout.js` from Razorpay (only when the customer clicks Pay now) and opens the popup with that data.
3. After a successful payment the popup returns the order id, the payment id and a signature. The client sends them to `POST /api/orders/:id/pay/confirm`.
4. The server checks that the Razorpay order id belongs to this order, recomputes `HMAC_SHA256(orderId + "|" + paymentId)` with the key secret and compares it in constant time (`timingSafeEqual`). If it matches, one atomic update with the condition `paymentStatus != "paid"` marks the order paid. A second confirm returns the same paid order.

### Webhook

Razorpay can call the server directly, so a payment is still recorded when the browser was closed after paying.

- `POST /api/payments/webhook` is mounted before `express.json()` and uses `express.raw`, because the signature is computed over the exact bytes of the body. The `x-razorpay-signature` header is checked with the webhook secret before the body is parsed. A wrong signature gets 400.
- `payment.captured` marks the order paid (only if it is not paid yet). `payment.failed` marks an unpaid order failed, but never touches a paid order, so a late failure event cannot undo a successful retry.
- The order is found by the Razorpay order id (indexed). An unknown order or an unknown event still gets 200, because Razorpay retries on any other answer.

### Errors

| Case                                   | Status |
| -------------------------------------- | ------ |
| Razorpay keys or webhook secret not set | 503    |
| Razorpay refuses to create the order    | 502    |
| Wrong signature or wrong provider order | 400    |
| Cancelled or already paid order         | 409    |
| Order of another user                   | 404    |

## Design Notes and Limitations

- Prices are stored as a Number in rupees and converted to paise (rounded) when talking to Razorpay. A production system would store integer paise.
- Order status is on the whole order, not per item. If an order has items from more than one vendor, any of those vendors can change the status, and a cancel restores stock for all items. This behaviour is covered by a test.
- MongoDB transactions need a replica set, so stock reservation uses atomic conditional updates plus a manual rollback. A server crash between the steps could leave stock reduced.
- Two order requests from the same cart at the exact same time could create two orders. An idempotency key would prevent this. The client only disables the button while the request runs.
- Products are hard deleted. Orders keep a snapshot of name and price, so order history stays correct.
- Elasticsearch is updated after MongoDB in a separate step, so the two can differ for a short time, or longer if the server crashes in between. `npm run reindex` repairs the index. If the index was missing when the first product was written, Elasticsearch creates one with a guessed mapping, and `npm run reindex` replaces it with the correct one.
- A cached product list can be up to 60 seconds old if Redis was down when a product changed.
- Search results are ordered by the chosen sort, not by relevance.
- When Elasticsearch fails, the MongoDB fallback does not accept typos, so its results can differ.
- Uploaded images are stored on the local disk. Hosts with a temporary disk need a cloud storage adapter before deployment. Files are not deleted when an image is removed from a product or the product is deleted, and the file type is taken from the request header (a production system should check the file contents).
- Becoming a vendor is instant, there is no approval step. An admin who opens a vendor page is sent to the become-seller page.
- Behind a proxy (for example a hosting platform) the server needs `trust proxy` set, otherwise all users share one rate limit counter.
- On startup the rate limit library logs a store initialization error when Redis is not connected yet. The limiter still works once Redis is ready.
- `npm audit` reports a moderate issue in `minimatch` through `nodemon`, which is a development tool only.
- Tests need local MongoDB, Redis and Elasticsearch and take about 4 minutes. There are no frontend tests, so the search and filter page and the Pay now flow were checked only with lint and build, not in a browser.
- The client keeps the JWT in `localStorage`, which JavaScript can read, so an XSS bug could steal it. An `httpOnly` cookie would be safer in production.
- Payments run in Razorpay test mode only. Creating a real Razorpay order was checked once against the test API with a script. The Razorpay popup itself and the webhook call from the Razorpay dashboard have not been run end to end yet, because the webhook needs a public URL.
- There is no vendor payout or split: the money would go to one Razorpay account. Razorpay Route or Stripe Connect need business verification. Every order item stores its vendor and price, so a split could be calculated later.
- A paid order that is cancelled afterwards is not refunded by the code. A refund has to be made in the Razorpay dashboard.
- A payment that arrives for an order cancelled in the meantime is still recorded as paid, with no automatic refund.
- There is no shipping address and no vendor charts yet. The dashboard shows numbers only.

## Commit Convention

This project follows Conventional Commits: `feat`, `fix`, `chore`, `docs`, `style`, `refactor`, `test`.

## Roadmap

- [x] Step 1: Project setup, Express server, MongoDB connection, health route, React client
- [x] Step 2: Authentication and user roles
- [x] Step 3: Products, categories and vendor features
- [x] Step 4: Cart and orders
- [x] Step 5: Automated tests and coverage
- [x] Step 6: React client (auth, products, cart, orders)
- [x] Step 7: Tailwind CSS styling
- [x] Step 8: Vendor dashboard, product management and image upload
- [x] Step 9: Redis rate limiting and caching, Elasticsearch search and filters
- [x] Step 10: Razorpay payments (test mode), signature verification, webhook, Pay now button
