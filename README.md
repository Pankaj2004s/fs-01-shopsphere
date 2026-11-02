# ShopSphere

A multi-vendor marketplace built with the MERN stack (MongoDB, Express, React, Node.js).

> Status: in development. Steps 1 to 6 (setup, authentication and roles, products and categories, cart and orders, automated tests, React client) are complete.

## Tech Stack

- **Frontend:** React 19 (Vite), JavaScript, React Router, Context API
- **Backend:** Node.js, Express (ES modules)
- **Database:** MongoDB with Mongoose
- **Auth and validation:** JWT, bcryptjs, zod
- **Security and logging:** helmet, cors, morgan
- **Testing:** Vitest, Supertest, @vitest/coverage-v8

## Features So Far

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
- Vendor view: a vendor sees only the orders that contain their products, and only their own items and subtotal (customer name only)
- Order status flow with allowed transitions; cancelling an order puts the items back in stock exactly once
- Seed script for sample categories, vendors and products (idempotent)
- Centralized error handling with a custom `ApiError` class, Mongo duplicate, validation and cast errors mapped to 409 or 400, and safe messages in production
- Automated test suite: 206 tests, including concurrency tests for stock reservation and double cancel

## Client (React)

The client talks to the API through one small fetch wrapper (`src/api/client.js`). It adds the base URL from `VITE_API_URL`, the JSON header and the Bearer token, and turns network and HTTP errors into a single `ApiError` with a `status` and the server message.

- Register, login and logout; the token is kept in `localStorage` and checked with `GET /api/auth/me` when the page reloads
- Auth state in a React Context (`AuthProvider` and a `useAuth` hook)
- Protected routes: guests who open the cart or orders are sent to login and come back to the same page after logging in
- Product list with loading, error and empty states, and pagination
- Product detail page with an add-to-cart form (quantity limited by stock)
- Cart page: change quantity, remove items, see line totals and the total from the server, place an order
- Order history with pagination and a cancel button for pending and confirmed orders

| Route           | Access         | Page                        |
| --------------- | -------------- | --------------------------- |
| `/`             | Public         | Home with API status        |
| `/products`     | Public         | Product list                |
| `/products/:id` | Public         | Product detail, add to cart |
| `/login`        | Public         | Login                       |
| `/register`     | Public         | Register                    |
| `/cart`         | Logged-in user | Cart and place order        |
| `/orders`       | Logged-in user | Order history and cancel    |
| `*`             | Public         | 404 page                    |

The route guard only decides what the UI shows. The real protection is the `protect` middleware on the server.

## Folder Structure

```
fs-01-shopsphere/
├── client/                 # React app (Vite)
│   └── src/
│       ├── api/            # fetch wrapper and API functions (auth, products, cart, orders)
│       ├── components/     # Layout (navbar, footer), ProtectedRoute
│       ├── context/        # auth context and AuthProvider
│       ├── hooks/          # useAuth
│       ├── pages/          # Home, Products, ProductDetail, Cart, Orders, Login, Register, NotFound
│       ├── App.jsx         # route table
│       └── main.jsx        # entry point (StrictMode, BrowserRouter, AuthProvider)
└── server/                 # Express API
    ├── tests/              # Vitest and Supertest tests
    │   └── helpers/        # database helpers and data factories
    └── src/
        ├── config/         # env and database setup
        ├── features/       # one folder per feature
        │   ├── auth/       # schemas, service, controller, routes
        │   ├── cart/       # model, schemas, service, controller, routes
        │   ├── categories/ # model, schemas, service, controller, routes
        │   ├── health/     # health check route
        │   ├── orders/     # model, schemas, transitions, service, controller, routes
        │   ├── products/   # model, schemas, service, controller, routes
        │   └── users/      # user model
        ├── middlewares/    # auth (protect, authorize), validate, notFound, errorHandler
        ├── scripts/        # seed script
        ├── utils/          # ApiError, asyncHandler, token (jwt helpers)
        ├── app.js          # express app and middleware setup
        └── server.js       # connects to the database and starts the server
```

## Getting Started

### Prerequisites

- Node.js 18 or later
- MongoDB running locally (or a MongoDB Atlas connection string)

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

3. (Optional) Load sample data:

```bash
cd server && npm run seed
```

4. Run the backend and the frontend in two terminals:

```bash
cd server && npm run dev
cd client && npm run dev
```

- API: http://localhost:5000/api/health
- App: http://localhost:5173

Restart the Vite dev server after you change `client/.env`, because Vite reads it only at startup.

## Testing

The tests are integration tests: Supertest calls the Express app directly (no open port) and the requests go through the routes, middleware, controllers and services to a real MongoDB.

```bash
cd server
npm test                # run all tests once
npm run test:watch      # re-run tests when files change
npm run test:coverage   # run all tests and print a coverage report
```

- Tests use a separate database, `shopsphere_test`, on the local MongoDB. The connection string is set in `server/vitest.config.js`, so your development data in `shopsphere` is never touched. The test helper refuses to run if the database name does not end with `_test`.
- Collections are cleared after every test, and test files run one after another because they share one database.
- The full run takes about 1.5 to 2 minutes, mostly because bcrypt (12 rounds) is slow on purpose.

What is covered:

- Auth: register, login, `/me`, forged and expired tokens, mass assignment of `role`
- Categories and products: roles (401 vs 403), ownership, admin override, validation, filters and pagination
- Cart: add, set, remove, stock checks, per-user isolation
- Orders: stock reservation, price snapshot, rollback, two buyers racing for the last item, order history and ownership (404 instead of 403), vendor privacy, status flow, double cancel restoring stock only once

Latest result: 14 test files, 206 tests, all passing.

| Metric     | Coverage |
| ---------- | -------- |
| Statements | 98.77%   |
| Branches   | 94.36%   |
| Functions  | 98.68%   |
| Lines      | 98.99%   |

`src/server.js` and `src/scripts/` are excluded. `src/config/db.js` shows 0% because the tests connect with their own helper.

## Environment Variables

### Server (`server/.env`)

| Variable         | Description                                   |
| ---------------- | --------------------------------------------- |
| `PORT`           | Server port (default 5000)                    |
| `MONGO_URI`      | MongoDB connection string (required)          |
| `CLIENT_URL`     | Allowed frontend origin for CORS              |
| `NODE_ENV`       | `development` or `production`                 |
| `JWT_SECRET`     | Secret used to sign tokens (required)         |
| `JWT_EXPIRES_IN` | Token lifetime, for example `7d` (default 7d) |

Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Client (`client/.env`)

| Variable       | Description                                                                   |
| -------------- | ----------------------------------------------------------------------------- |
| `VITE_API_URL` | Base URL of the API including `/api`, for example `http://localhost:5000/api` |

Only variables that start with `VITE_` are visible to browser code. Never put a secret in them.

## API Endpoints

| Method | Endpoint                     | Access                          | Description                                                   |
| ------ | ---------------------------- | ------------------------------- | ------------------------------------------------------------- |
| GET    | `/api/health`                | Public                          | Server health and uptime                                      |
| POST   | `/api/auth/register`         | Public                          | Create a customer account, returns user and token             |
| POST   | `/api/auth/login`            | Public                          | Login, returns user and token                                 |
| GET    | `/api/auth/me`               | Logged-in user                  | Returns the current user                                      |
| GET    | `/api/categories`            | Public                          | List all categories                                           |
| POST   | `/api/categories`            | Admin only                      | Create a category                                             |
| GET    | `/api/products`              | Public                          | List products with pagination, search and filters             |
| GET    | `/api/products/:id`          | Public                          | Get one product                                               |
| POST   | `/api/products`              | Vendor or admin                 | Create a product (vendor is taken from the token)             |
| PATCH  | `/api/products/:id`          | Owner or admin                  | Update fields of a product                                    |
| DELETE | `/api/products/:id`          | Owner or admin                  | Delete a product                                              |
| GET    | `/api/cart`                  | Logged-in user                  | View my cart with live prices and total                       |
| POST   | `/api/cart/items`            | Logged-in user                  | Add a product (quantity defaults to 1, checked against stock) |
| PATCH  | `/api/cart/items/:productId` | Logged-in user                  | Set the quantity of an item                                   |
| DELETE | `/api/cart/items/:productId` | Logged-in user                  | Remove an item from the cart                                  |
| POST   | `/api/orders`                | Logged-in user                  | Place an order from the cart                                  |
| GET    | `/api/orders`                | Logged-in user                  | My orders with pagination and status filter                   |
| GET    | `/api/orders/vendor`         | Vendor only                     | Orders that contain my products, showing only my items        |
| GET    | `/api/orders/:id`            | Order owner                     | Get one of my orders                                          |
| PATCH  | `/api/orders/:id/status`     | Customer or vendor of the order | Change the order status (rules below)                         |

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

## Design Notes and Limitations

- Prices are stored as a Number in rupees. A production system would use integer paise.
- Order status is on the whole order, not per item. If an order has items from more than one vendor, any of those vendors can change the status, and a cancel restores stock for all items. This behaviour is covered by a test.
- MongoDB transactions need a replica set, so stock reservation uses atomic conditional updates plus a manual rollback. A server crash between the steps could leave stock reduced.
- Two order requests from the same cart at the exact same time could create two orders. An idempotency key would prevent this. The client only disables the button while the request runs.
- Products are hard deleted. Orders keep a snapshot of name and price, so order history stays correct.
- Tests need a local MongoDB and take about 2 minutes. There are no frontend tests yet.
- The client keeps the JWT in `localStorage`, which JavaScript can read, so an XSS bug could steal it. An `httpOnly` cookie would be safer in production.
- The seed products use random placeholder images (picsum.photos), so a picture does not match the product name.
- The client has no styling yet, and there is no shipping address, payment or vendor dashboard.

## Commit Convention

This project follows Conventional Commits: `feat`, `fix`, `chore`, `docs`, `style`, `refactor`, `test`.

## Roadmap

- [x] Step 1: Project setup, Express server, MongoDB connection, health route, React client
- [x] Step 2: Authentication and user roles
- [x] Step 3: Products, categories and vendor features
- [x] Step 4: Cart and orders
- [x] Step 5: Automated tests and coverage
- [x] Step 6: React client (auth, products, cart, orders)
