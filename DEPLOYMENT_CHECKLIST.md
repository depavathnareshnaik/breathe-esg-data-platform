# Deployment Readiness Audit Checklist

This audit evaluates the codebase configuration for production deployment using Railway (backend + database) and Vercel (frontend).

## Audit Summary

| Component | Check Item | Status | Action Required |
| :--- | :--- | :--- | :--- |
| **Backend** | `DEBUG` configuration | NEEDS_FIX | Currently hardcoded to `True`. Must load from environment variable. |
| **Backend** | `ALLOWED_HOSTS` | NEEDS_FIX | Currently empty `[]`. Must load from environment variable. |
| **Backend** | Database settings | NEEDS_FIX | Currently expects separate settings. Must support `DATABASE_URL` via `dj-database-url`. |
| **Backend** | CORS origins | NEEDS_FIX | Currently hardcoded to `CORS_ALLOW_ALL_ORIGINS = True`. Must limit in production. |
| **Backend** | Static assets serving | NEEDS_FIX | No production static server. Must add `whitenoise` and configure `STATIC_ROOT`. |
| **Backend** | WSGI Server | NEEDS_FIX | Missing `gunicorn` in `requirements.txt`. |
| **Backend** | Procfile | NEEDS_FIX | No Procfile for Railway service container. |
| **Backend** | Env example file | NEEDS_FIX | Missing `backend/.env.example`. |
| **Frontend** | API base URL | NEEDS_FIX | Currently hardcoded to `http://localhost:8000/api/v1`. Must use `import.meta.env.VITE_API_BASE_URL`. |
| **Frontend** | Env example file | NEEDS_FIX | Missing `frontend/.env.example`. |

---

## Detailed Check Items

### 1. Backend Settings (Django)

* `DEBUG`: `NEEDS_FIX` -> Make configurable with `DJANGO_DEBUG` defaulting to `False`.
* `ALLOWED_HOSTS`: `NEEDS_FIX` -> Parse comma-separated list from `ALLOWED_HOSTS` environment variable.
* Database URL Parsing: `NEEDS_FIX` -> Add `dj-database-url` dependency and parse `DATABASE_URL`.
* CORS settings: `NEEDS_FIX` -> Add support for `CORS_ALLOWED_ORIGINS` env variable.
* Static files: `NEEDS_FIX` -> Install `whitenoise`, add it to middleware, and set `STATIC_ROOT`.
* Gunicorn: `NEEDS_FIX` -> Include `gunicorn` in `requirements.txt`.
* Procfile: `NEEDS_FIX` -> Create `Procfile` specifying web runtime command `gunicorn core.wsgi`.

### 2. Frontend Settings (React + Vite)

* API URL configuration: `NEEDS_FIX` -> Switch to dynamic variable `import.meta.env.VITE_API_BASE_URL` with local fallback.
* Environment mapping: `NEEDS_FIX` -> Create `frontend/.env.example` defining `VITE_API_BASE_URL`.
* SPA Routing on Vercel: `READY` -> Verify routing handles client-side fallbacks via React Router redirect behavior (or configure `vercel.json` rewrite rule to redirect all routes to `index.html`).
