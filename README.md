# ShopSphere

A multi-vendor marketplace built with the MERN stack (MongoDB, Express, React, Node.js).

> Status: in development. Step 1 (project setup) is complete.

## Tech Stack

- **Frontend:** React (Vite), JavaScript
- **Backend:** Node.js, Express
- **Database:** MongoDB with Mongoose

## Folder Structure

```
fs-01-shopsphere/
├── client/                 # React app (Vite)
│   └── src/
└── server/                 # Express API
    └── src/
        ├── config/         # env and database setup
        ├── features/       # one folder per feature (health, auth, products...)
        ├── middlewares/    # notFound, errorHandler
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

3. Run the backend and the frontend in two terminals:

```bash
cd server && npm run dev
cd client && npm run dev
```

- API: http://localhost:5000/api/health
- App: http://localhost:5173

## Commit Convention

This project follows Conventional Commits: `feat`, `fix`, `chore`, `docs`, `style`, `refactor`, `test`.

## Roadmap

- [x] Step 1: Project setup, Express server, MongoDB connection, health route, React client
- [ ] Step 2: Authentication and user roles
