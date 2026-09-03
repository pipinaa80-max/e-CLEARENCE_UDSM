# Superuser Area

This top-level area contains an isolated superuser control plane for the clearance project. All superuser backend and frontend code/configuration is contained here.

## Boundary

- `backend/` contains the standalone control-plane API.
- `frontend/` contains the standalone administration console.
- The existing application in `BACKEND/` and `FRONTEND/` is intentionally unchanged.
- Project branding, dashboard configuration, and sub-admin permissions are stored as server-owned runtime data, not source-code edits.

## Planned capabilities

- Superuser sign-in and protected dashboard
- Create, update, suspend, and remove sub-admin accounts
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

## Integration boundary

This control plane is intentionally separate from the existing application. It can manage its own project configuration now. To apply branding, dashboard availability, or delegated permissions to the existing application, the existing backend must later expose authenticated integration endpoints that consume this control plane's data.

The superuser console does not expose dashboard editing. Dashboard management is reserved for the sub-admin created with the `PROJECT_ADMIN` permission, which maps to the existing administrator workflow in the main project.
