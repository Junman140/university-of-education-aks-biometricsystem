# University biometric exam verification (MVP)

Multi-tenant **enrollment + 1:1 exam verification** with **offline hall nodes**, **SourceAFIS** matching (Java microservice), **encrypted templates** in **MongoDB**, and an **admin UI**.

## Architecture

- **`apps/api`** — Fastify + Mongoose + JWT (staff) + device keys (hall nodes).
- **`services/matching-java`** — SourceAFIS extract/match + heuristic quality score.
- **`apps/hall-node`** — Local cache + offline queue + kiosk UI.
- **`apps/admin`** — React admin dashboard.

See also [docs/hardware-and-capture.md](docs/hardware-and-capture.md) and [docs/PILOT_PLAYBOOK.md](docs/PILOT_PLAYBOOK.md).

## Prerequisites

- **Node 20+** and **pnpm 9+**
- **MongoDB 6+** running locally (e.g. [MongoDB Community](https://www.mongodb.com/try/download/community) as a Windows/macOS service on **`localhost:27017`**) — or use **Atlas** and put that URI in `.env`
- **JDK 17+** and **Maven 3.9+** on your `PATH` — required for the fingerprint **matching** service (first `pnpm dev` will run `mvn package` once if the JAR is missing)

---

## One-time setup

### 1. MongoDB

Install and start MongoDB so it accepts connections (typical: **`mongodb://127.0.0.1:27017`**). No Docker required. Optionally you can still use `docker compose up -d` from this repo if you prefer a container.

### 2. API environment file (required before `db:seed`)

The API and seed script **will fail** if `MONGODB_URI` / `DATABASE_URL` is not set.

1. Copy the example file:
   - **Windows (PowerShell):** `copy apps\api\.env.example apps\api\.env`
   - **macOS / Linux:** `cp apps/api/.env.example apps/api/.env`
2. Edit **`apps/api/.env`** and set at least:
   - **`MONGODB_URI`** — e.g. `mongodb://127.0.0.1:27017/bio_mvp` (matches Docker Compose) or your Atlas URI.
   - **`TEMPLATE_ENCRYPTION_KEY`** — 64 hex characters (see `.env.example`); use the same value on the hall node later.

### 3. Install dependencies

From the **repository root**:

```bash
pnpm install
```

### 4. Seed the super admin user

Still from the **repository root** (reads `apps/api/.env` when run via the filter):

```bash
pnpm db:seed
```

Default login after seed: **`super@example.edu`** / **`ChangeMe123!`** (override with `SEED_SUPER_EMAIL` and `SEED_SUPER_PASSWORD` in `apps/api/.env` if you want).

---

## Starting everything (one command)

1. **Start MongoDB** on your machine (service / local install — not started by this repo).
2. From the **repository root**:

```bash
pnpm dev
```

This runs **three processes** in one terminal (via [concurrently](https://www.npmjs.com/package/concurrently)):

| Process | What it is | URL |
|--------|------------|-----|
| `api` | Fastify API | **http://127.0.0.1:4000** · health **http://127.0.0.1:4000/health** |
| `admin` | Vite admin UI | **http://localhost:5173** |
| `match` | SourceAFIS matching (Java) | **http://127.0.0.1:5050** · health **http://127.0.0.1:5050/health** |

The first time you run `pnpm dev`, the matching JAR may be built automatically (`mvn package` in `services/matching-java`). You need **Java + Maven** installed.

**Without Java/Maven** (API + admin only, no live fingerprint extract/match):

```bash
pnpm dev:web
```

**Individual processes** (if you prefer separate terminals):

```bash
pnpm dev:api
pnpm dev:admin
node scripts/start-matching.mjs
```

**Hall node** (optional — exam-hall kiosk / offline sync) is a **fourth** process; start it only when needed:

```bash
pnpm dev:hall
```

### Hall node environment

On Windows PowerShell:

```powershell
$env:API_URL="http://127.0.0.1:4000"
$env:DEVICE_ID="<from POST /devices>"
$env:DEVICE_SECRET="<shown once at device creation>"
$env:TEMPLATE_ENCRYPTION_KEY="<same 64 hex chars as in apps/api/.env>"
pnpm dev:hall
```

On macOS / Linux:

```bash
export API_URL=http://127.0.0.1:4000
export DEVICE_ID=<from POST /devices>
export DEVICE_SECRET=<shown once at device creation>
export TEMPLATE_ENCRYPTION_KEY=<same as apps/api/.env>
pnpm dev:hall
```

---

## After login: create a tenant (super admin)

Log in as the super admin, then create a tenant (example uses `curl` on Windows; adjust the JWT):

```bash
curl -s -X POST http://127.0.0.1:4000/tenants ^
  -H "Authorization: Bearer <SUPER_JWT>" ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Demo University\",\"slug\":\"demo\",\"adminEmail\":\"admin@demo.edu\",\"adminPassword\":\"ChangeMe123!\"}"
```

Obtain `<SUPER_JWT>` via `POST http://127.0.0.1:4000/auth/login` with `email` / `password`. Then log in to the **admin UI** as **`admin@demo.edu`** to manage students for that tenant.

---

## Environment variables

| Variable | Where | Purpose |
|----------|--------|---------|
| `MONGODB_URI` | `apps/api/.env` | MongoDB connection string (**required** for API and `pnpm db:seed`) |
| `DATABASE_URL` | `apps/api/.env` | Alias for `MONGODB_URI` if you prefer one name |
| `JWT_SECRET` | `apps/api/.env` | JWT signing secret |
| `TEMPLATE_ENCRYPTION_KEY` | API + hall node | 64 hex chars (32 bytes); **must match** on every hall node |
| `MATCHING_SERVICE_URL` | `apps/api/.env` | Java matcher base URL (default `http://127.0.0.1:5050`) |
| `DEVICE_ID` / `DEVICE_SECRET` | Hall node | From `POST /devices` while logged in as tenant admin |

---

## License

Apache-2.0 (align with SourceAFIS; verify third-party licenses for production).
