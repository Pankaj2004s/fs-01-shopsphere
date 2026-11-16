# ShopSphere: 10-Minute Presentation Outline

Live demo: https://fs-01-shopsphere.vercel.app
API: https://shopsphere-api-8ab5.onrender.com/api/health

## Before the presentation

- Open the API health URL 5 minutes before starting. The free Render plan sleeps, and the first request can take about a minute.
- Keep three tabs ready: the live app, `docs/architecture.md` on GitHub, and `docs/TEST_RESULTS.md` on GitHub.
- Have two accounts ready: one customer and one vendor.
- Run the demo flow once beforehand. Do not skip this.

## Timing

| Time | Slide | Content |
| --- | --- | --- |
| 0:00 to 1:00 | 1. What it is | One sentence: a multi-vendor marketplace where vendors list products and customers search, order and pay. Stack in one line. Live URL. |
| 1:00 to 2:00 | 2. Requirements | Table below: each company requirement and where it lives in the project. |
| 2:00 to 3:30 | 3. Architecture | Show `docs/architecture.md`: system overview, then the request pipeline. Say "feature-based monolith". |
| 3:30 to 5:30 | 4. Three engineering decisions | Stock safety, payment trust, fail-soft services. Details below. |
| 5:30 to 8:00 | 5. Live demo | Script below. |
| 8:00 to 9:00 | 6. Testing and deployment | 25 test files, 315 tests, all passing. Deployed on Vercel, Render, Atlas, Elastic Cloud, Cloudinary. |
| 9:00 to 10:00 | 7. Honest limits and next steps | What is test mode or mocked, and what I would do next. |

## Slide 2: requirements and where they are

| Requirement | In the project |
| --- | --- |
| React | React 19 client with Vite, Tailwind, router, auth context |
| Node | Express 5 API, ES modules |
| MongoDB | Source of truth, Mongoose models, aggregation for vendor stats |
| Elasticsearch | Product search with typo tolerance, synced from MongoDB, `npm run reindex` |
| Redis | Rate limits and cache-aside cache |
| Razorpay | Test mode: order, Checkout, signature check, webhook. Not Connect, so no real vendor payout |
| AWS S3 | Storage adapter with the AWS SDK, tested with a mock. Not run on live AWS. Cloudinary adapter was run live |
| Feature-based monolith | One folder per feature under `server/src/features` |

## Slide 4: three engineering decisions

1. **Stock safety.** Two customers can buy the last item at the same time. Stock is reserved with an atomic conditional update (`stock >= quantity`), and rolled back by hand if any item fails. A test covers two buyers racing for the last item.
2. **The server decides money.** The client never sends an amount. The server reads the order total, converts it to paise, and verifies the payment signature with HMAC SHA256. The webhook is a backup if the browser closes. Confirming twice never changes a paid order again.
3. **Fail-soft services.** If Redis is down, requests go to MongoDB. If Elasticsearch is down, search falls back to MongoDB text search. The app stays up.

## Slide 5: demo script (about 2.5 minutes)

1. Open the home page, then the product list.
2. Search `runing` (typo). It finds Running Shoes. Say: this is Elasticsearch.
3. Log in as the customer, add a product to the cart, place the order.
4. Open Orders and click Pay now (Razorpay test mode popup). If the popup is not working on the day, show the order with the Pay now button and explain the flow with the sequence diagram instead.
5. Log in as the vendor: dashboard numbers, orders page, change the order status.
6. Open `docs/API.md` for one second to show the API reference exists.

## Slide 7: honest limits (say these yourself, before anyone asks)

- Payments are Razorpay test mode. There is no real vendor payout or split.
- The S3 adapter is tested with a mock, and not run on live AWS because I have no AWS account.
- The hosted Elasticsearch is a 14-day trial. After that, search falls back to MongoDB.
- The React client has no automated tests.
- Next steps: refunds, an idempotency key for orders, deleting old images, frontend tests, vendor charts.

## Questions to prepare for

- Why a monolith and not microservices? One team and one deployable app is simpler to run and test. Features are in separate folders, so one can be moved out later.
- How do you prevent overselling? Atomic conditional update on stock, with a rollback.
- Why verify the signature on the server? The browser is not trusted. Only the server holds the Razorpay secret.
- What happens if Elasticsearch and MongoDB disagree? MongoDB is the source of truth. `npm run reindex` rebuilds the search copy.
- What would you do first with more time? Refunds and an idempotency key for placing orders.
