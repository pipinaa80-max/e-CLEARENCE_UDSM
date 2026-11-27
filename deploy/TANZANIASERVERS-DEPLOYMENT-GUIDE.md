# UDSM e-Clearance — TanzaniaServers (DirectAdmin) Production Deployment Guide

## Production Architecture

| Layer | Subdomain | DirectAdmin Setup |
| :--- | :--- | :--- |
| **Frontend (Angular SPA)** | `https://clearance.jmsolutions.co.tz` | Static files in subdomain `public_html/` (with `.htaccess` SPA fallback + `config.js`) |
| **Backend (Node.js / Express)** | `https://api-clearance.jmsolutions.co.tz` | DirectAdmin → **Setup Node.js App** (Startup file: `index.js`, Node.js 20+ / 22+) |
| **Database (MySQL 8.0+)** | Local DirectAdmin MySQL (`127.0.0.1:3306`) | Created in DirectAdmin → **MySQL Management**, imported via **phpMyAdmin** |

> [!IMPORTANT]
> The API domain configured in `config.js` and `environment.prod.ts` is `https://api-clearance.jmsolutions.co.tz/api/v1`. If your actual subdomain differs, edit `config.js` directly inside DirectAdmin File Manager — no Angular rebuild required.

---

## Step 1 — Run Production SQL Files (Safe on Both Fresh & Existing Live Databases)

Open **phpMyAdmin** → select your production database → **Import** in this exact order:

1. **`deploy/01_production_schema_and_missing_data_sync.sql`** *(Mandatory — 0 user rows, 100% idempotent)*
   - Creates any missing tables out of all **26 tables** (`CREATE TABLE IF NOT EXISTS`).
   - Adds any missing columns on existing live tables without data loss (`award`, `is_postgraduate`, `undergraduate_certificate_url`, `station_code`, `station_name`, `issued_by_director`, `issued_by_director_title`, `issued_at`).
   - Refreshes `vw_student_profiles`.
   - Syncs all missing reference data: **20 Colleges** (including `UDSE`, `MRI`), **61 Departments**, **35 canonical Postgraduate programmes** (`ref_programmes`), **11 Sponsors**, **6 Collection Stations**, **11 Halls**, and all **21 Institutional Office Dashboards** in `project_settings.dashboards_json`.
2. **`deploy/02_postgraduate_staff_seed.sql`** *(Recommended — 22 PG staff accounts, 0 fake students)*
   - Upserts **2 DPGS Directors** (`dpgs@udsm.ac.tz`, `dpgs.deputy@udsm.ac.tz`) and **20 College Research Supervisors** (covering all 20 UDSM colleges including `DUCE` and `MUCE`).
   - **Rotate the initial default password** (`Clearance@2026!`) immediately after first login.
3. **Real Students & Additional Staff (Excel Upload via Admin → Data Upload):**
   - Upload real Undergraduate or Postgraduate students via **Admin → Data Upload → Graduating Students** using the updated 12-column template (`clearance_registration_template.xlsx` with the `Award` column), or import `deploy/udsm_postgraduate_staff_upload.xlsx` / `deploy/udsm_staff_accounts_upload.xlsx` under **University Staff**.

---

## Step 2 — Deploy the Backend (`deploy/backend-deploy.zip`)

1. Open DirectAdmin → **File Manager** → open your backend application directory (e.g. `/domains/api-clearance.jmsolutions.co.tz/backend`).
2. **Preserve your existing `.env` and `uploads/` directory** if upgrading an existing installation.
3. Upload **`deploy/backend-deploy.zip`** and **Extract** it into the backend folder (overwriting `src/`, `index.js`, `package.json`, `package-lock.json`, `knexfile.js`, `.env.example`).
4. Delete `backend-deploy.zip` from the server after extraction.
5. Create or verify **`.env`** inside the backend folder:
   ```env
   NODE_ENV=production
   TRUST_PROXY=1

   DB_CLIENT=mysql2
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_USER=<your-directadmin-mysql-user>
   DB_PASSWORD=<strong-mysql-password>
   DB_NAME=<your-directadmin-mysql-database>
   DB_CHARSET=utf8mb4
   DB_POOL_MIN=2
   DB_POOL_MAX=20

   # Generate a fresh 64-byte secret on the server:
   # node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   JWT_SECRET=<64-byte-hex-secret-never-commit-to-git>
   JWT_EXPIRES_IN=30m
   JWT_REFRESH_EXPIRES_IN=7d
   SESSION_INACTIVITY_TIMEOUT=30m

   FRONTEND_URL=https://clearance.jmsolutions.co.tz
   CORS_ALLOWED_ORIGINS=https://clearance.jmsolutions.co.tz
   CERTIFICATE_VERIFY_BASE_URL=https://api-clearance.jmsolutions.co.tz/api/v1/clearance/certificate/verify

   # Recommended: store uploads outside the backend code folder so redeploys never wipe files
   # UPLOAD_DIR=/home/<directadmin-user>/domains/api-clearance.jmsolutions.co.tz/uploads
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
   *(Do **not** hardcode `PORT=` on DirectAdmin unless explicitly required; LiteSpeed injects `process.env.PORT` automatically.)*
6. Open DirectAdmin → **Setup Node.js App** → select your app (Node.js `20.x` or `22.x`, Mode: `Production`, Startup file: `index.js`) → click **Run NPM Install** (only needed if dependencies changed) → click **Restart**.
7. Smoke-test in a browser:
   - `https://api-clearance.jmsolutions.co.tz/` → HTTP 200 (`{"status":"ONLINE", ...}`)
   - `https://api-clearance.jmsolutions.co.tz/api/v1/auth/health` → HTTP 200
   - `https://api-clearance.jmsolutions.co.tz/api/v1/sponsors` → HTTP 200 (confirms MySQL connection + reference data)

---

## Step 3 — Deploy the Frontend (`deploy/frontend-deploy.zip`)

1. Open DirectAdmin → **File Manager** → navigate to `/domains/clearance.jmsolutions.co.tz/public_html/`.
2. Remove old static files (preserve `.well-known/` for SSL auto-renewal).
3. Upload **`deploy/frontend-deploy.zip`** and **Extract** directly into `public_html/`.
4. Verify `index.html`, `.htaccess`, `config.js`, and `clearance_registration_template.xlsx` sit directly at the root of `public_html/`.
5. Delete `frontend-deploy.zip` from the server.
6. Visit `https://clearance.jmsolutions.co.tz` and confirm:
   - Page loads with UDSM branding and zero console errors.
   - Refreshing a sub-route (e.g. `https://clearance.jmsolutions.co.tz/login`) returns HTTP 200 (confirms `.htaccess` SPA fallback works).
   - Network requests go cleanly to `https://api-clearance.jmsolutions.co.tz/api/v1/...` with zero CORS errors.
   - Logging in as `dpgs@udsm.ac.tz` or `supervisor.coict@udsm.ac.tz` routes cleanly to DPGS / Supervisor dashboards.
