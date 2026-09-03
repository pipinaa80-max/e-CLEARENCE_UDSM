# Superuser Area

This top-level area contains an isolated superuser control plane for the clearance project. All superuser backend and frontend code/configuration is contained here.

## Boundary

- `backend/` contains the standalone control-plane API.
- `frontend/` contains the standalone administration console.
- The existing application in `BACKEND/` and `FRONTEND/` is intentionally unchanged.
- Project branding, dashboard configuration, and sub-admin permissions are stored as server-owned runtime data, not source-code edits.

## Capabilities

- Superuser sign-in and protected dashboard
- Create, update, suspend, and remove sub-admin accounts
- View sub-admin email, role, permissions, and status
- Generate one-time temporary passwords for sub-admin recovery
- Delegate one `PROJECT_ADMIN` sub-admin for the existing project administrator workflow
- The delegated project admin owns dashboard creation, editing, and deletion
- Manage university name, logo, contact details, and enabled dashboards
- Audit privileged changes

## Run locally

Terminal 1:

```powershell
cd SUPERUSER/backend
$env:SUPERUSER_EMAIL="superuser@admin.local"
$env:SUPERUSER_PASSWORD="ChangeMeImmediately!2026"
npm start
```

Terminal 2:

```powershell
cd SUPERUSER/frontend
npm install
npm start
```

Open `http://localhost:8091`. The backend listens on `http://localhost:8090`.

The first backend start creates `backend/data/control-plane.json`. That file contains the hashed superuser password and runtime configuration; keep it out of source control for production deployments. The default password is for local development only and must be replaced.

## Integration

The existing Angular application now accepts project-admin accounts from this control plane and routes them to its administrator dashboard. Each project admin receives a unique project configuration, so branding and dashboards are isolated between companies.

Open the real project admin experience at `http://localhost:4200/dashboard/admin`. The `Project Dashboards` and `Project Theme` tabs are available to a sub-admin created with the `PROJECT_ADMIN` permission. The superuser console at `http://localhost:8091` does not expose dashboard editing.

Passwords are never returned or displayed after they are stored. The reset action replaces the hash and returns a new temporary password once in the response; share it securely and require the administrator to change it in a production implementation.
