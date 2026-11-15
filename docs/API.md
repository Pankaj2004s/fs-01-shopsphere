# ShopSphere API Reference

REST API of ShopSphere, a multi-vendor marketplace. All request and response bodies are JSON, except image upload (multipart) and the Razorpay webhook (raw JSON body).

## Base URLs

| Environment | Base URL |
| --- | --- |
| Local | `http://localhost:5000/api` |
| Deployed | `https://shopsphere-api-8ab5.onrender.com/api` |

The deployed API runs on a free Render plan. After a period of inactivity the first request can take about a minute.

## Conventions

### Authentication

Send the JWT from register or login in the `Authorization` header:

```
Authorization: Bearer <token>
```

The token expires after 7 days by default.

### Roles

| Role | How to get it |
| --- | --- |
| `customer` | Default for every new account |
| `vendor` | `POST /users/become-vendor` |
| `admin` | Set directly in the database |

### Error format

Every error has the same shape:

```json
{ "message": "Email is already registered" }
```

Validation errors join all messages with a comma: `{ "message": "Name is required, Please enter a valid email" }`.

| Status | Meaning |
| --- | --- |
| 400 | Validation failed, invalid id, or a business rule was broken |
| 401 | Token missing, invalid or expired, user deleted, or wrong login |
| 403 | Role or ownership does not allow this |
| 404 | Resource (or route) not found |
| 409 | Conflict: duplicate value, stock, or a state change is not allowed |
| 413 | Uploaded image is larger than 5 MB |
| 429 | Rate limit exceeded |
| 502 | Payment provider failed |
| 503 | Payments or webhook are not configured |
| 500 | Unexpected error. In production the message is always `Something Went Wrong` |

Unknown routes return `404` with `{ "message": "Route not found: /api/..." }`.

### Pagination

List endpoints accept `page` (default 1) and `limit` (default 10, maximum 50) and return:

```json
{ "pagination": { "page": 1, "limit": 10, "total": 25, "totalPages": 3 } }
```

### Rate limits

Limits are counted per client IP and stored in Redis. Responses include the standard `RateLimit-*` headers. A blocked request gets `429`.

| Endpoint | Limit |
| --- | --- |
| `POST /auth/register` | 5 per hour |
| `POST /auth/login` | 10 per 15 minutes |
| `POST /uploads/images` | 30 per 15 minutes |

### Objects

**User**

```json
{ "id": "6650...", "name": "Asha", "email": "asha@example.com", "role": "customer" }
```

**Product**

```json
{
  "_id": "6651...",
  "name": "Running Shoes",
  "description": "Light shoes for daily runs",
  "price": 2499,
  "stock": 12,
  "images": ["https://res.cloudinary.com/.../shoe.jpg"],
  "category": { "_id": "6652...", "name": "Footwear", "slug": "footwear" },
  "vendor": { "_id": "6653...", "name": "Vendor One" },
  "createdAt": "2026-11-10T08:00:00.000Z",
  "updatedAt": "2026-11-10T08:00:00.000Z"
}
```

`category` and `vendor` are populated (name only for vendor) in all product responses.

**Order**

```json
{
  "_id": "6654...",
  "user": "6650...",
  "items": [
    { "product": "6651...", "vendor": "6653...", "name": "Running Shoes", "price": 2499, "quantity": 2 }
  ],
  "totalAmount": 4998,
  "status": "pending",
  "paymentStatus": "unpaid",
  "createdAt": "2026-11-11T09:00:00.000Z",
  "updatedAt": "2026-11-11T09:00:00.000Z"
}
```

Item `name` and `price` are copied at order time, so later product edits do not change old orders. After `POST /orders/:id/pay` the order also has `payment.provider` and `payment.providerOrderId`, and after payment `payment.providerPaymentId` and `payment.paidAt`.

Order `status`: `pending`, `confirmed`, `shipped`, `delivered`, `cancelled`. Order `paymentStatus`: `unpaid`, `paid`, `failed`.

## Endpoint summary

| Method | Path | Access |
| --- | --- | --- |
| GET | `/health` | Public |
| POST | `/auth/register` | Public |
| POST | `/auth/login` | Public |
| GET | `/auth/me` | Logged in |
| POST | `/users/become-vendor` | Customer |
| GET | `/categories` | Public |
| POST | `/categories` | Admin |
| GET | `/products` | Public |
| GET | `/products/mine` | Vendor, admin |
| GET | `/products/:id` | Public |
| POST | `/products` | Vendor, admin |
| PATCH | `/products/:id` | Owner vendor, admin |
| DELETE | `/products/:id` | Owner vendor, admin |
| GET | `/cart` | Logged in |
| POST | `/cart/items` | Logged in |
| PATCH | `/cart/items/:productId` | Logged in |
| DELETE | `/cart/items/:productId` | Logged in |
| POST | `/orders` | Logged in |
| GET | `/orders` | Logged in |
| GET | `/orders/vendor` | Vendor |
| GET | `/orders/vendor/stats` | Vendor |
| GET | `/orders/:id` | Order owner |
| PATCH | `/orders/:id/status` | Order customer or order vendor |
| POST | `/orders/:id/pay` | Order owner |
| POST | `/orders/:id/pay/confirm` | Order owner |
| POST | `/payments/webhook` | Razorpay (signed) |
| POST | `/uploads/images` | Vendor, admin |

---

## Health

### `GET /health`

Public. Used by Render as the health check.

**200**

```json
{ "status": "ok", "uptime": 1234.56 }
```

---

## Auth

### `POST /auth/register`

Public. Rate limit: 5 per hour. Creates a `customer` account.

**Body**

| Field | Rules |
| --- | --- |
| `name` | string, 1 to 50 characters, trimmed |
| `email` | valid email, saved in lowercase |
| `password` | string, 8 to 72 characters |

**201**

```json
{ "user": { "id": "6650...", "name": "Asha", "email": "asha@example.com", "role": "customer" }, "token": "eyJhbGciOi..." }
```

**Errors:** 400 validation, 409 `Email is already registered`, 429.

### `POST /auth/login`

Public. Rate limit: 10 per 15 minutes.

**Body:** `email` (valid email), `password` (non-empty).

**200:** same shape as register (`user` and `token`).

**Errors:** 400 validation, 401 `Invalid email or password` (same message for unknown email and wrong password), 429.

### `GET /auth/me`

Logged in. Returns the current user.

**200**

```json
{ "user": { "id": "6650...", "name": "Asha", "email": "asha@example.com", "role": "customer" } }
```

**Errors:** 401.

---

## Users

### `POST /users/become-vendor`

Logged in, no body. Changes the role from `customer` to `vendor` immediately (there is no approval step).

**200:** `{ "user": { ..., "role": "vendor" } }`. Use the same token; the role is read from the database on every request.

**Errors:** 401, 409 `You are already a vendor`, 400 `Admins cannot become vendors`, 409 `Your role was changed, please retry`.

---

## Categories

### `GET /categories`

Public. Sorted by name. Cached for 5 minutes (the cache is cleared when a category is created).

**200**

```json
{ "categories": [ { "_id": "6652...", "name": "Footwear", "slug": "footwear" } ] }
```

### `POST /categories`

Admin only.

**Body:** `name` (string, 1 to 50 characters). The slug is generated from the name.

**201:** `{ "category": { "_id": "...", "name": "Footwear", "slug": "footwear" } }`

**Errors:** 400 validation, 401, 403, 409 `Category already exists` (case-insensitive check).

---

## Products

### `GET /products`

Public. Returns a page of products.

**Query**

| Param | Rules | Default |
| --- | --- | --- |
| `page` | integer, 1 or more | 1 |
| `limit` | integer, 1 to 50 | 10 |
| `search` | non-empty string | none |
| `category` | category id | none |
| `minPrice`, `maxPrice` | number, 0 or more; `minPrice` cannot be greater than `maxPrice` | none |
| `sort` | `newest`, `oldest`, `price_asc`, `price_desc` | `newest` |

**200:** `{ "products": [Product], "pagination": {...} }`

Notes:
- With `search`, results come from Elasticsearch (typo tolerant, for example `runing` finds Running Shoes). If Elasticsearch is down or fails, the API silently falls back to MongoDB text search (no typo tolerance).
- Search results follow `sort`, not relevance score.
- Responses are cached for up to 60 seconds. The cache is cleared when a product is created, updated, deleted or its stock changes.

**Errors:** 400 validation.

### `GET /products/mine`

Vendor or admin. Same query and response as `GET /products`, but only products owned by the caller. This list always uses MongoDB (no cache, no Elasticsearch).

**Errors:** 401, 403.

### `GET /products/:id`

Public.

**200:** `{ "product": Product }`

**Errors:** 400 `Invalid id`, 404 `Product not found`.

### `POST /products`

Vendor or admin. The caller becomes the product's vendor.

**Body**

| Field | Rules |
| --- | --- |
| `name` | required, 1 to 120 characters |
| `description` | optional, up to 2000 characters |
| `price` | required number, 0 or more |
| `stock` | optional integer, 0 or more (default 0) |
| `images` | optional array of up to 5 valid URLs (use `POST /uploads/images` to get URLs) |
| `category` | required category id |

**201:** `{ "product": Product }`

**Errors:** 400 validation, 401, 403, 404 `Category not found`.

### `PATCH /products/:id`

Vendor (own products only) or admin (any product). Partial update: send any of the fields above, at least one.

**200:** `{ "product": Product }`

**Errors:** 400 validation (including `At least one field is required to update`), 401, 403 `You can only modify your own products`, 404 `Product not found` or `Category not found`.

### `DELETE /products/:id`

Same access as update.

**204:** empty body.

**Errors:** 401, 403, 404.

---

## Cart

All cart endpoints need login. Every response returns the full cart:

```json
{
  "cart": {
    "items": [
      {
        "product": { "_id": "6651...", "name": "Running Shoes", "price": 2499, "stock": 12, "images": [] },
        "quantity": 2,
        "lineTotal": 4998
      }
    ],
    "total": 4998
  }
}
```

Prices come from the current product price. Items whose product was deleted are left out of the response.

### `GET /cart`

**200:** the cart (empty cart: `{ "cart": { "items": [], "total": 0 } }`).

### `POST /cart/items`

Adds a product. If it is already in the cart, the quantity is added to the existing one.

**Body:** `productId` (id), `quantity` (integer 1 to 99, default 1).

**200:** the cart.

**Errors:** 400 validation, 400 `Only N item(s) in stock` (checks the combined quantity), 404 `Product not found`.

### `PATCH /cart/items/:productId`

Sets the quantity of an item (does not add).

**Body:** `quantity` (integer 1 to 99).

**200:** the cart.

**Errors:** 400 validation or `Only N item(s) in stock`, 404 `Product not found` or `Item not found in cart`.

### `DELETE /cart/items/:productId`

Removes an item. Removing an item that is not in the cart is not an error.

**200:** the cart.

---

## Orders

All order endpoints need login.

### `POST /orders`

Places an order from the current cart, no body. Stock is reserved with atomic conditional updates; if any item fails, the reserved stock is given back. On success the cart is emptied. The total is calculated on the server from current product prices.

**201:** `{ "order": Order }` (status `pending`, paymentStatus `unpaid`).

**Errors:** 400 `Cart is empty`, 400 `Some items in your cart are no longer available`, 400 `You cannot buy your own product`, 409 `Insufficient stock for <product name>`.

### `GET /orders`

Orders of the caller, newest first.

**Query:** `page`, `limit` (as above), `status` (optional, one of the order statuses).

**200:** `{ "orders": [Order], "pagination": {...} }`

### `GET /orders/vendor`

Vendor only. Orders that contain at least one of the vendor's products, newest first. Same query as above.

Each order is a vendor view: only this vendor's items, and the customer's name. Payment details are not included.

**200**

```json
{
  "orders": [
    {
      "_id": "6654...",
      "customer": { "_id": "6650...", "name": "Asha" },
      "status": "pending",
      "createdAt": "2026-11-11T09:00:00.000Z",
      "items": [ { "product": "6651...", "vendor": "6653...", "name": "Running Shoes", "price": 2499, "quantity": 2 } ],
      "subtotal": 4998
    }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 1, "totalPages": 1 }
}
```

**Errors:** 401, 403.

### `GET /orders/vendor/stats`

Vendor only. Dashboard numbers for the vendor's own products. Not cached.

**200**

```json
{
  "stats": {
    "totalOrders": 6,
    "revenue": 15000,
    "unitsSold": 9,
    "statusCounts": { "pending": 1, "confirmed": 2, "shipped": 1, "delivered": 2, "cancelled": 0 },
    "productCount": 4,
    "lowStock": [ { "_id": "6651...", "name": "Running Shoes", "stock": 2 } ]
  }
}
```

- `revenue` and `unitsSold` count only `confirmed`, `shipped` and `delivered` orders, and only this vendor's items.
- `lowStock` lists up to 5 products with stock 5 or less, lowest first.

**Errors:** 401, 403.

### `GET /orders/:id`

Returns one order of the caller.

**200:** `{ "order": Order }`

**Errors:** 400 `Invalid id`, 404 `Order not found` (also when the order belongs to someone else).

### `PATCH /orders/:id/status`

Changes the order status. The route only needs login; the rules below are checked in the service.

**Body:** `status` (one of the order statuses).

Who can set what:

| Caller | Allowed target statuses |
| --- | --- |
| Customer who placed the order | `cancelled` |
| Vendor who has items in the order | `confirmed`, `shipped`, `delivered`, `cancelled` |

Allowed transitions:

| From | To |
| --- | --- |
| `pending` | `confirmed`, `cancelled` |
| `confirmed` | `shipped`, `cancelled` |
| `shipped` | `delivered` |
| `delivered` | none (final) |
| `cancelled` | none (final) |

Cancelling gives the stock back to the products. The status change is atomic: if two people change the same order at the same time, one of them gets 409.

**200:** a customer gets `{ "order": Order }`. A vendor gets `{ "order": <vendor view> }` (same shape as an item of `GET /orders/vendor`).

**Errors:** 400 validation, 403 `You cannot set status to <status>`, 404 `Order not found` (also for users who are not part of the order), 409 `Cannot change status from <from> to <to>`, 409 `Order was changed by someone else, please retry`.

### `POST /orders/:id/pay`

Order owner. Creates a Razorpay order (test mode) and returns what the browser needs to open Razorpay Checkout. The amount is read from the order on the server; the client never sends it. Calling it again creates a fresh Razorpay order.

**201**

```json
{
  "payment": {
    "orderId": "6654...",
    "providerOrderId": "order_Qx...",
    "amount": 499800,
    "currency": "INR",
    "keyId": "rzp_test_..."
  }
}
```

`amount` is in paise (rupees x 100). `keyId` is the public Razorpay key id.

**Errors:** 404 `Order not found`, 409 `A cancelled order cannot be paid`, 409 `Order is already paid`, 502 `Payment provider could not create the order`, 503 `Payments are not configured`.

### `POST /orders/:id/pay/confirm`

Order owner. Call it after Checkout succeeds. The server recomputes the HMAC SHA256 signature of `razorpayOrderId|razorpayPaymentId` with the Razorpay secret and compares it in constant time.

**Body:** `razorpayOrderId`, `razorpayPaymentId`, `razorpaySignature` (non-empty strings, as returned by Checkout).

**200:** `{ "order": Order }` with `paymentStatus: "paid"`. If the order is already paid (for example the webhook arrived first), the paid order is returned with 200.

**Errors:** 400 validation, 400 `Payment does not belong to this order`, 400 `Invalid payment signature`, 404 `Order not found`, 503 `Payments are not configured`.

---

## Payments webhook

### `POST /payments/webhook`

Called by Razorpay, not by the client. It is a backup path in case the browser closes after paying. The route reads the raw body (the signature is computed over the exact bytes), so it is mounted before the JSON parser.

**Headers:** `x-razorpay-signature` = HMAC SHA256 of the raw body with `RAZORPAY_WEBHOOK_SECRET`.

**Events handled**

| Event | Effect |
| --- | --- |
| `payment.captured` | Order with that Razorpay order id becomes `paid`, only if it is not paid yet |
| `payment.failed` | `paymentStatus` becomes `failed`, only if it is still `unpaid` |
| any other event | Ignored |

**200:** `{ "received": true }` (also for ignored events and unknown orders, so Razorpay does not retry).

**Errors:** 400 `Invalid webhook signature` (missing or wrong signature), 400 `Invalid webhook body`, 503 `Payment webhook is not configured`.

---

## Uploads

### `POST /uploads/images`

Vendor or admin. Rate limit: 30 per 15 minutes. Send `multipart/form-data` with one file in the field `image`.

| Rule | Value |
| --- | --- |
| Types | JPEG, PNG, WebP |
| Maximum size | 5 MB |
| Files per request | 1 |

The file is saved by the storage driver chosen with `STORAGE_DRIVER` (`local`, `cloudinary` or `s3`). The deployed API uses Cloudinary.

**201:** `{ "url": "https://res.cloudinary.com/.../image.png" }`. Put this URL in a product's `images` array.

**Errors:** 400 `Image file is required`, 400 `Only JPEG, PNG or WebP images are allowed`, 401, 403, 413 `Image is too large, maximum size is 5 MB`, 429.

---

## Example calls (curl)

```bash
API=https://shopsphere-api-8ab5.onrender.com/api

# health
curl -s $API/health

# list products with search and filters
curl -s "$API/products?search=shoes&sort=price_asc&limit=5"

# login, then call a protected endpoint
curl -s -X POST $API/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"asha@example.com","password":"your-password"}'
curl -s $API/auth/me -H "Authorization: Bearer <token>"

# upload an image (vendor token)
curl -s -X POST $API/uploads/images \
  -H "Authorization: Bearer <token>" \
  -F "image=@photo.png"
```
