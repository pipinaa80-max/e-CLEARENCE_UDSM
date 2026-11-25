# UDSM e-Clearance — TanzaniaServers (DirectAdmin) Production Deployment Guide

## Production Architecture

| Layer | Subdomain | DirectAdmin Setup |
| :--- | :--- | :--- |
| **Frontend (Angular SPA)** | `https://clearance.jmsolutions.co.tz` | Static files in subdomain `public_html/` (with `.htaccess` SPA fallback + `config.js`) |
| **Backend (Node.js / Express)** | `https://api-clearance.jmsolutions.co.tz` | DirectAdmin → **Setup Node.js App** (Startup file: `index.js`, Node.js 20+ / 22+) |
| **Database (MySQL / MariaDB)** | Local DirectAdmin MySQL (`127.0.0.1:3306`) | Created in DirectAdmin → **MySQL Management**, schema imported via **phpMyAdmin** |

> [!IMPORTANT]
> Notice the API domain configured in `config.js` and `environment.prod.ts` is `https://api-clearance.jmsolutions.co.tz/api/v1` (`.co.tz`). If your actual subdomain differs, simply edit `config.js` directly inside DirectAdmin File Manager — no Angular rebuild required.

---

## Step 1 — Create & Initialize the Production Database

1. Open DirectAdmin → **MySQL Management** → create your production database and database user (grant all privileges on that database).
2. Open **phpMyAdmin** → select the new database → **Import** `e-CLEARENCE_UDSM/backend/database_production_schema_and_reference.sql`.
3. Confirm all 26 tables, the `vw_student_profiles` view, and reference seed tables (`colleges`, `departments`, `sponsors`, `collection_stations`, `projects`, etc.) were created cleanly (zero demo/test user accounts are created by this file).

---

## Step 2 — Deploy the Backend (`backend-deploy.zip`)

1. Open DirectAdmin → **File Manager** → create or open your backend application directory (e.g. `/domains/api-clearance.jmsolutions.co.tz/backend` or `public_html` per your Setup Node.js App root).
2. Upload **`deploy/backend-deploy.zip`** and **Extract** it into the backend folder.
3. Delete `backend-deploy.zip` from the server after extraction.
4. Create a new file named **`.env`** inside the backend folder (copied from `.env.example`) and fill in your real production values:
   ```env
   NODE_ENV=production
   TRUST_PROXY=1

   DB_CLIENT=mysql2
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=jmsoluti_clearance_user
   DB_PASSWORD=GPTh7B3GgfucXPqgk2TT
   DB_NAME=jmsoluti_clearance_db
   DB_CHARSET=utf8mb4
   DB_POOL_MIN=2
   DB_POOL_MAX=20

   JWT_SECRET=833a08a873ee17aed9af0e462f3d13fb8bd73e16a98d9ad87641a1a88f4e34c316d7a9bcd84a2aa9064d69093a6860b0f72e21706a60d9773016f82383f2675c
   JWT_EXPIRES_IN=24h
   JWT_REFRESH_EXPIRES_IN=7d

   FRONTEND_URL=https://clearance.jmsolutions.co.tz
   CORS_ALLOWED_ORIGINS=https://clearance.jmsolutions.co.tz
   CERTIFICATE_VERIFY_BASE_URL=https://api-clearance.jmsolutions.co.tz/api/v1/clearance/certificate/verify

   MAX_FILE_SIZE_BYTES=10485760
   RATE_LIMIT_MAX_ATTEMPTS=10

   # Optional SMTP (leave SMTP_HOST empty to disable outbound emails safely)
   SMTP_HOST=
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=
   SMTP_PASS=
   SMTP_FROM=no-reply@jmsolutions.co.tz
   APP_NAME=SmartClearance UDSM
   ```
   *(Do **not** hardcode `PORT=` unless DirectAdmin requires one; LiteSpeed automatically injects `process.env.PORT`.)*
5. Open DirectAdmin → **Setup Node.js App** → **Create Application**:
   - **Node.js version**: `20.x` or `22.x`
   - **Application mode**: `Production`
   - **Application root**: your extracted backend path
   - **Application URL**: `api-clearance.jmsolutions.co.tz`
   - **Application startup file**: `index.js`
6. Click **Create**, then click **Run NPM Install** (`node_modules` will be installed natively for Linux).
7. Click **Start** (or **Restart**).
8. Smoke-test in a browser:
   - `https://api-clearance.jmsolutions.co.tz/` → HTTP 200 (`{"status":"ONLINE", ...}`)
   - `https://api-clearance.jmsolutions.co.tz/api/v1/auth/health` → HTTP 200
   - `https://api-clearance.jmsolutions.co.tz/api/v1/sponsors` → HTTP 200 (confirms MySQL connection + reference data!)

---

## Step 3 — Deploy the Frontend (`frontend-deploy.zip`)

1. Open DirectAdmin → **File Manager** → navigate to `/domains/clearance.jmsolutions.co.tz/public_html/`.
2. Remove old static files (preserve `.well-known/` if SSL auto-renewal uses it).
3. Upload **`deploy/frontend-deploy.zip`** and **Extract** directly into `public_html/`.
4. Verify `index.html`, `.htaccess`, and `config.js` sit directly at the root of `public_html/`.
5. Delete `frontend-deploy.zip` from the server.
6. Visit `https://clearance.jmsolutions.co.tz` and confirm:
   - Page loads with UDSM branding and zero console errors.
   - Refreshing a sub-route (e.g. `https://clearance.jmsolutions.co.tz/login`) returns HTTP 200 (confirms `.htaccess` SPA fallback works).
   - Network requests go cleanly to `https://api-clearance.jmsolutions.co.tz/api/v1/...` with zero CORS errors.
