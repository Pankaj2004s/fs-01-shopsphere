# ShopSphere Architecture

ShopSphere is a feature-based monolith: one Express API with one folder per feature, a React client, and managed services for data, cache, search, images and payments.

## 1. System overview

```mermaid
flowchart LR
    User(["User's browser"])

    subgraph Vercel["Vercel"]
        Client["React 19 client (Vite)"]
    end

    subgraph Render["Render"]
        API["Express 5 API (feature-based monolith)"]
        Redis[("Key Value (Redis)")]
    end

    Mongo[("MongoDB Atlas")]
    ES[("Elastic Cloud (Elasticsearch)")]
    Cloud["Cloudinary (images)"]
    S3["AWS S3 (adapter, tested with a mock)"]
    Razorpay["Razorpay (test mode)"]

    User -->|"loads the app"| Client
    User -->|"REST calls with Bearer JWT"| API
    User -->|"Checkout popup"| Razorpay
    API -->|"orders, products, users (source of truth)"| Mongo
    API -->|"cache and rate limit counters"| Redis
    API -->|"product search"| ES
    API -->|"signed image upload"| Cloud
    API -.->|"alternative storage driver"| S3
    API -->|"create payment order"| Razorpay
    Razorpay -->|"signed webhook"| API
```

## 2. Inside the API

Every request passes through the same pipeline. A route adds only the steps it needs.

```mermaid
flowchart TD
    Req["HTTP request"] --> Sec["helmet, cors, morgan"]
    Sec --> Pay{"Path is /api/payments?"}
    Pay -->|"yes"| Raw["express.raw (webhook needs the raw body)"]
    Pay -->|"no"| Json["express.json"]
    Json --> Route["Feature route"]
    Raw --> Route
    Route --> RL["rateLimit (Redis store)"]
    RL --> Auth["protect and authorize (JWT and role)"]
    Auth --> Val["validate (zod)"]
    Val --> Ctrl["Controller"]
    Ctrl --> Svc["Service (business rules)"]
    Svc --> Model["Mongoose model"]
    Svc --> Ext["Redis cache, Elasticsearch, storage adapter, Razorpay"]
    Model --> Res["JSON response"]
    Ext --> Res
    Res -.->|"errors"| Err["notFound and errorHandler (ApiError)"]
```

## 3. Placing and paying for an order

```mermaid
sequenceDiagram
    participant B as Browser
    participant A as API
    participant M as MongoDB
    participant R as Razorpay

    B->>A: POST /api/orders (from the cart)
    A->>M: reserve stock with atomic conditional updates
    A-->>B: order (unpaid)
    B->>A: POST /api/orders/:id/pay
    A->>M: find the order of this user
    A->>R: create order (amount in paise, read from the server)
    R-->>A: Razorpay order id
    A->>M: save the Razorpay order id
    A-->>B: checkout data (key id, order id, amount)
    B->>R: pay in the Checkout popup
    R-->>B: order id, payment id, signature
    B->>A: POST /api/orders/:id/pay/confirm
    A->>A: recompute HMAC SHA256 and compare
    A->>M: atomic update, paymentStatus paid
    A-->>B: paid order
    R->>A: webhook payment.captured (backup path)
    A->>M: mark paid only if not paid yet
```

## 4. Search and image upload

```mermaid
flowchart LR
    subgraph Search["GET /api/products?search="]
        S1["API"] -->|"query"| S2[("Elasticsearch")]
        S2 -->|"product ids"| S1
        S1 -->|"load full products"| S3[("MongoDB")]
        S2 -.->|"if it fails"| S4["MongoDB text search"]
    end

    subgraph Upload["POST /api/uploads/images"]
        U1["upload middleware (multer, type and size check)"] --> U2["storage selector (STORAGE_DRIVER)"]
        U2 --> U3["local disk"]
        U2 --> U4["Cloudinary"]
        U2 --> U5["AWS S3"]
    end
```

## Design decisions

- **One deployable API, one folder per feature.** Features stay separated (routes, controller, service, model), so a feature can be moved out later, but there is no network hop between them.
- **MongoDB is the source of truth.** Elasticsearch holds a copy used only to find product ids. `npm run reindex` rebuilds the copy.
- **Services fail soft.** If Redis is down, requests go straight to MongoDB and rate limit counters are skipped. If Elasticsearch is down, search falls back to MongoDB text search.
- **The server decides money.** The client never sends an amount. The payment signature is verified on the server, and the webhook is a backup if the browser closes after paying.
- **Storage is pluggable.** The upload controller calls one `saveImage` function, and `STORAGE_DRIVER` picks local disk, Cloudinary or S3.
- **Stock safety without transactions.** Stock is reserved with atomic conditional updates and rolled back by hand if any item fails.
