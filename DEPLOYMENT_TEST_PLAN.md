# Deployment Verification Test Plan

This document outlines the validation procedures for verifying the production-deployed Breathe ESG Data Platform.

## 1. Environment & Setup Checklist

Verify that the deployed instances have their environment variables set correctly:
* **Backend (Railway)**: Check that the postgres database is connected and `DJANGO_DEBUG=False`.
* **Frontend (Vercel)**: Check that `VITE_API_BASE_URL` is pointed to the HTTPS production API address on Railway (e.g., `https://your-backend.railway.app/api/v1`).

---

## 2. Test Case Scenarios

### Test Case 1: User Login
* **Inputs**: Navigate to the Vercel app, type credentials for `analyst_aerohi` and `Password123!`. Click **Sign In**.
* **Expected Result**: 
  * API request `POST /api/v1/auth/login/` returns status `200` with authentication token.
  * Browser redirects to `/dashboard`.
  * Profile card in sidebar shows name "analyst_aerohi" and tenant "Aerohi Enterprise".

### Test Case 2: Ingestion & Normalization Flow
* **Inputs**: Navigate to `/upload`. Select **Utility Portal Export** and upload `samples/utility_test.csv`. Click **Start Ingest & Normalize**.
* **Expected Result**:
  * API request `POST /api/v1/ingestion/upload/` returns status `201`.
  * Upload screen displays guided step checkmarks completing down to "Approve".
  * Batch metric cards show parsed count matching total rows.
  * Records table updates with new entries in `PENDING` or `NORMALIZED` states.

### Test Case 3: Validation Alerts (Data Quality Checks)
* **Inputs**: Upload a CSV containing negative consumption quantities or future-dated records (e.g. `samples/utility_test.csv` containing a negative row).
* **Expected Result**:
  * Normalized record state registers as `FLAGGED` (highlighted in red status pill).
  * Record details sidebar displays validation rules: `NEGATIVE_CONSUMPTION` or `INVALID_DATE` with specific error details.

### Test Case 4: Record Modification with Justification
* **Inputs**: Select a `FLAGGED` record. Edit the value in the "Quantity" input to a positive number. Write "Correcting data entry typo" in the modification justification field. Click **Save Changes**.
* **Expected Result**:
  * API request `PATCH /api/v1/records/<uuid>/` returns status `200`.
  * Record status transitions to `NORMALIZED` (or `FLAGGED` if other issues remain).
  * Right column "Audit history timeline" appends a node showing the modified field diff and the typed justification.

### Test Case 5: Record Lock Approval
* **Inputs**: Navigate to details of a `NORMALIZED` record. Click **Approve & Lock**. Write approval comments and submit.
* **Expected Result**:
  * API request `POST /api/v1/records/<uuid>/approve/` returns status `200`.
  * Record status changes to `APPROVED` (highlighted in green).
  * Edit fields, save button, and action buttons are disabled (read-only state).
  * Attempting to perform inline patch checks on the API returns status `403 Permission Denied`.

### Test Case 6: Audit Ledger Timeline Search
* **Inputs**: Navigate to `/audit`. In the search input field, type `"typo"` or `"analyst_aerohi"`.
* **Expected Result**:
  * Query matches occur after a 300ms debounce.
  * View is updated to show only timeline nodes containing matching comments, username actors, or modified fields.
  * Clicking "✕" clears filters and returns to the default list.
