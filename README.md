# ShopSphere

A multi-vendor marketplace built with the MERN stack (MongoDB, Express, React, Node.js).

> Status: in development. Steps 1 to 3 (setup, authentication and roles, products and categories) are complete.

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
- Seed script for sample categories, vendors and products (idempotent)
- Centralized error handling with a custom `ApiError` class and safe messages in production

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
        │   ├── categories/ # model, schemas, service, controller, routes
        │   ├── health/     # health check route
        │   ├── products/   # model, schemas, service, controller, routes
        │   └── users/      # user model and routes
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

| Method | Endpoint                 | Access          | Description                                       |
| ------ | ------------------------ | --------------- | ------------------------------------------------- |
| GET    | `/api/health`            | Public          | Server health and uptime                          |
| POST   | `/api/auth/register`     | Public          | Create a customer account, returns user and token |
| POST   | `/api/auth/login`        | Public          | Login, returns user and token                     |
| GET    | `/api/auth/me`           | Logged-in user  | Returns the current user                          |
| GET    | `/api/categories`        | Public          | List all categories                               |
| POST   | `/api/categories`        | Admin only      | Create a category                                 |
| GET    | `/api/products`          | Public          | List products with pagination, search and filters |
| GET    | `/api/products/:id`      | Public          | Get one product                                   |
| POST   | `/api/products`          | Vendor or admin | Create a product (vendor is taken from the token) |
| PATCH  | `/api/products/:id`      | Owner or admin  | Update fields of a product                        |
| DELETE | `/api/products/:id`      | Owner or admin  | Delete a product                                  |
| GET    | `/api/users/admin-check` | Admin only      | Temporary route to verify role-based access       |

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

## Commit Convention

This project follows Conventional Commits: `feat`, `fix`, `chore`, `docs`, `style`, `refactor`, `test`.

## Roadmap

- [x] Step 1: Project setup, Express server, MongoDB connection, health route, React client
- [x] Step 2: Authentication and user roles
- [x] Step 3: Products, categories and vendor features
- [ ] Step 4: Cart and orders
