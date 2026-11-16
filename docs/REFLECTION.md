# ShopSphere: Individual Reflection

Author: Pankaj Sharma
Project: FS-01 ShopSphere, a multi-vendor marketplace
Repository: https://github.com/Pankaj2004s/fs-01-shopsphere

## 1. What I built and how I worked

ShopSphere is a multi-vendor marketplace. Vendors list products with images, and customers search, order and pay (Razorpay test mode). I built it as a MERN project with Elasticsearch, Redis, a storage adapter layer and a feature-based monolith on the server.

I wrote every file myself by typing it, not by copy-pasting, with an AI assistant explaining each file and each line. I used AI for explanations, for planning the steps and for finding mistakes. I want to say this openly. I also used official documentation. I worked in 14 steps, from setup to documentation, in small Conventional commits (334 so far), and I ran tests at the end of each big step.

## 2. Technical challenges and how I solved them

**Stock safety when two customers buy the last item.** If stock is checked and updated in two separate steps, two customers can both succeed. I used one atomic conditional update (`stock >= quantity`) and a manual rollback if any item in the order fails. A test covers two buyers racing for the last item, so I can show that it works.

**Trusting the payment.** The browser cannot be trusted with money. The server reads the order total, converts it to paise and creates the Razorpay order. After payment, the server verifies the signature (HMAC SHA256). A webhook is a backup in case the browser closes, and confirming twice does not change a paid order again. I checked the webhook with curl: no signature gives 400, a signed test event gives 200.

**Deployment.** Many services had to work together: Vercel, Render, MongoDB Atlas, Render Key Value (Redis), Elastic Cloud and Cloudinary. I fixed CORS, trust proxy and environment variables, and kept secrets only in the Render dashboard. I verified the live API with curl (health, login, vendor upgrade, search, image upload).

## 3. Decisions and trade-offs

**Monolith instead of microservices.** One deployable app is simpler to run, test and deploy alone. I gave up independent scaling per feature. Features live in separate folders, so one can be moved out later.

**MongoDB as the source of truth, Elasticsearch as a search copy.** Search is fast and handles typos ("runing" finds Running Shoes). The cost is that the two can disagree, so I added `npm run reindex` to repair it, and search falls back to MongoDB if Elasticsearch is down.

**Cloudinary on live, with an S3 adapter.** I have no AWS account. So I wrote a real S3 adapter with the AWS SDK and tested it with a mock, and used Cloudinary on the live app. I gained a working deployment without spending money. I gave up proof that S3 works on real AWS.

## 4. Mistakes and things that did not go as planned

My personal target was 14 November, and I missed it. The project was bigger than I estimated, and deployment and documentation took extra time. I then switched to a faster way of working for the rest of the project (fewer files per message, combined checks) and kept the company requirements complete.

I also lost time to my terminal: copy-paste removed spaces and added junk characters, so some "typos" were not real. I learned to verify with `grep` or `git log` before calling something a typo.

The React client was only checked with lint and build, and I did not test the pages in a browser. That is a real gap, and I know it.

## 5. What I learned

I understand these much better now: middleware and the request pipeline, REST API design, validation with zod, error handling, atomic updates, caching with Redis, rate limiting, webhook and signature verification, and environment-based deployment.

Still weak: writing frontend tests, and writing backend code completely from scratch without help. For this I will rebuild small parts of this project without looking at the code, and add tests to the client.

## 6. Honest limits

- Payments are Razorpay test mode. There is no real vendor payout or split.
- The S3 adapter is tested with a mock, not on live AWS.
- Hosted Elasticsearch is a 14-day trial. After it ends, search falls back to MongoDB (no typo tolerance).
- The React client has no automated tests, and the Razorpay Checkout popup and a real Razorpay webhook after a payment were not verified.

I say this openly because a project should be judged on what it really does. Claiming more than I verified would be dishonest and would fall apart in the first question.

## 7. If I had more time

1. Refunds, because a payment system without refunds is incomplete.
2. An idempotency key for placing orders, so a double click cannot create two orders.
3. Frontend tests and a full browser check, because the client is my biggest unverified area.
