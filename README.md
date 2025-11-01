# Low-Code CRUD + RBAC Platform

A mini internal developer platform that lets admins define data models via a web UI, writes the model as a versionable JSON file, auto-registers CRUD REST APIs, and enforces RBAC. Includes an admin UI to publish models and manage records.

## Features

- Model definition via UI: name, fields, optional owner field, and per-role permissions
- File-based persistence: saves to `backend/src/models-definitions/<Model>.json`
- Dynamic CRUD API generation with Express
- Role-Based Access Control (RBAC) middleware per model
- Ownership enforcement for update/delete when `ownerField` is set
- Optional Prisma scaffold/migration updated on publish
- Admin UI: list models, create/read/update/delete records

## Tech Stack

- Backend: Node.js + TypeScript + Express
- DB: MySQL (via `mysql2/promise`) for CRUD and sessions (optional)
- ORM scaffold: Prisma (optional, for schema + migrations)
- Frontend: React + Vite + Tailwind
- Auth: Session-based (express-session). Simple login endpoint for demo.

## Quick Start

### 1) Prereqs

- Node.js 18+
- MySQL running locally (or in Docker) with a database you can use, e.g. `lowcode_dev`.

Example Docker (optional):

```bash
# optional: launch mysql 8 docker
docker run --name lowcode-mysql -e MYSQL_ROOT_PASSWORD=pass -e MYSQL_DATABASE=lowcode_dev -p 3306:3306 -d mysql:8
```

### 2) Environment

Create a `.env` at repo root or define env vars before running the backend:

```
DATABASE_URL="mysql://root:pass@localhost:3306/lowcode_dev"
SESSION_SECRET="dev_session_secret"
# set to true to store sessions in MySQL instead of in-memory (dev default is false)
ENABLE_MYSQL_SESSION_STORE=false
```

Note: If enabling the DB session store, ensure your MySQL auth plugin is compatible with the `mysql2` client.

### 3) Install and Run

```bash
# In backend
cd backend
npm install
npm run dev
# Backend starts on http://localhost:4000

# In another terminal, run the frontend
cd ../frontend
npm install
npm run dev
# Frontend on http://localhost:5173
```

Vite is configured to proxy `/api` and `/admin` to the backend.

## Using the Admin UI

1. Open http://localhost:5173
2. In "Publish Model":
   - Set a `userId` and select a `role` (Admin/Manager/Viewer)
   - Click "Set Session" to create a session (stored server-side)
   - Enter Model name (e.g., `Product`)
   - Edit fields JSON, e.g.:
     ```json
     [
       { "name": "name", "type": "string", "required": true },
       { "name": "price", "type": "number" },
       { "name": "ownerId", "type": "string" }
     ]
     ```
   - Optionally set `ownerField` (e.g., `ownerId`)
   - Click "Publish"
3. The backend writes `backend/src/models-definitions/Product.json`, registers routes, and (optionally) appends a Prisma model and runs `prisma migrate dev`.
4. Select your model in the list to view records. Use the Create form and inline Edit/Delete controls. RBAC is enforced server-side.

## API Overview

- POST `/api/<Model>`
- GET `/api/<Model>`
- GET `/api/<Model>/:id`
- PUT `/api/<Model>/:id`
- DELETE `/api/<Model>/:id`

All endpoints require an authenticated session (`/admin/login`) and pass through RBAC middleware. If `ownerField` is defined, only the owner or an Admin can update/delete.

## How it Works

- Publish flow writes a model file to `backend/src/models-definitions`. The server loads all model files on boot and watches for new ones to auto-register CRUD routers.
- RBAC middleware reads the model file to evaluate allowed operations for the current user role.
- Ownership checks in update/delete ensure the session user matches the row's owner field (or has Admin role).
- Prisma scaffold: publishing appends a model to `prisma/schema.prisma` at repo root and runs `prisma migrate dev` and `prisma generate`.

## Tests

Backend includes minimal unit tests:

- RBAC middleware behavior
- Dynamic route mounting path

Run tests:

```bash
cd backend
npm run test
```

Note: Tests don’t require a running DB. CRUD integration tests are not included to keep setup light, but can be added with a test DB.

## Notes and Next Steps

- Relations and advanced types can be added to both the UI and runtime mapping.
- "Table name" override is not yet exposed; tables default to the Model name. This can be added to the model and SQL builder.
- The server uses direct SQL for CRUD. Prisma is used only for schema scaffolding/migrations.
- Hot route removal on model deletion is not implemented; a server restart cleans up removed models.
- Add authentication integration (JWT/OIDC) for production usage.
