# ShopSphere

A multi-vendor marketplace built with the MERN stack (MongoDB, Express, React, Node.js).

> Status: in development. Steps 1 to 4 (setup, authentication and roles, products and categories, cart and orders) are complete.

## Tech Stack

- **Frontend:** React (Vite), JavaScript
- **Backend:** Node.js, Express (ES modules)
- **Database:** MongoDB with Mongoose
- **Auth and validation:** JWT, bcryptjs, zod
- **Security and logging:** helmet, cors, morgan

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

## Folder Structure

```
fs-01-shopsphere/
├── client/                 # React app (Vite)
│   └── src/
└── server/                 # Express API
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

2. Create `server/.env` using `server/.env.example` as a template.

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

## Environment Variables

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
- Order status is on the whole order, not per item. If an order has items from more than one vendor, any of those vendors can change the status, and a cancel restores stock for all items.
- MongoDB transactions need a replica set, so stock reservation uses atomic conditional updates plus a manual rollback. A server crash between the steps could leave stock reduced.
- Two order requests from the same cart at the exact same time could create two orders. An idempotency key would prevent this.
- Products are hard deleted. Orders keep a snapshot of name and price, so order history stays correct.
- No automated tests yet.

## Commit Convention

This project follows Conventional Commits: `feat`, `fix`, `chore`, `docs`, `style`, `refactor`, `test`.

## Roadmap

- [x] Step 1: Project setup, Express server, MongoDB connection, health route, React client
- [x] Step 2: Authentication and user roles
- [x] Step 3: Products, categories and vendor features
- [x] Step 4: Cart and orders
