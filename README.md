# Breathe ESG Data Platform

Multi-tenant carbon accounting system for automated data ingestion, normalization, validation, and change audit logging.

## Problem Statement

Enterprise environmental accounting teams face significant challenges collecting and preparing greenhouse gas emissions data for compliance audits. Key issues include:
* Heterogeneous Data Sources: Procurement and utility systems export data in varying formats (SAP logs, power utility bills, and travel receipts) with distinct schemas.
* Manual Conversion Overhead: Analysts manually convert raw units (e.g., gallons to liters, miles to kilometers) and calculate emissions factors, introducing human error risks.
* Data Quality Validation: Detecting anomalies, negative consumption values, future dates, or significant usage spikes requires automated validation rules.
* Strict Audit Readiness: Regulatory standards (e.g., GHG Protocol) mandate that once data is finalized, it must be locked, and all subsequent adjustments must preserve preceding states with justification notes.

This platform automates data ingestion, standardizes calculations, detects spikes, and enforces an immutable audit trail.

## Architecture Overview

* Frontend: React (Vite) single-page application.
* Backend: Django REST Framework (DRF) supplying stateless REST APIs.
* Database: PostgreSQL for persistent multi-tenant data storage.
* Local Runtime: Local development servers and containerized PostgreSQL database.

## Features

* Multi-Tenant Isolation: Logical data separation at the database layer using tenant foreign keys, filtering all views and API querysets.
* SAP Ingestion: Direct parsing of transaction ledger records (TransactionID, PostingDate, GLAccount, Quantity, Unit).
* Utility Ingestion: Direct parsing of power consumption records (AccountNumber, BillingPeriodStart, Usage_kWh).
* Travel Ingestion: Direct parsing of business travel records (BookingID, TravelDate, Mode, Distance_miles, SupplierName).
* Data Normalization: Automated conversion of heterogeneous input units to standard target reporting units (e.g., miles to kilometers).
* Validation Engine: Algorithmic checks for negative values, future dates, and consumption spikes (exceeding 10x historical median).
* Carbon Calculation: Rule-based calculations converting normalized usage counts directly into carbon footprint values (kg CO2e).
* Review Dashboard: Unified console to filter records by status, scope, and category, supporting search and bulk quick approval.
* Audit Trail: Immutable chronological history of all updates containing change diff snapshots and mandatory analyst justifications.
* Approval Workflow: State transition flow locking records to an approved state and preventing further database overrides.

## Demo Flow

1. Upload: User uploads raw CSV exports (SAP, Utility, or Travel).
2. Normalize: System parses rows, converts units, and calculates carbon equivalent emissions.
3. Review: System checks validation rules; analysts inspect flagged records on the Review Dashboard.
4. Approve: Analyst clicks "Approve & Lock" or submits corrections with a justification comment.
5. Lock: System moves status to APPROVED, lock-securing the record to prevent future database edits.
6. Audit: The changes are recorded in the global chronological Audit Ledger showing the full diff.

## Screens

* Upload Page: Guided steps indicator, file drop selector, loading indicator, and batch summary dashboard cards (Total, Normalized, Flagged).
* Review Dashboard: Filter controls, keyword search, interactive data table with sticky headers, and skeleton loaders.
* Record Details: Split layout showing record attributes on the left (topped by a calculated carbon card) and validation issues/audit trails on the right.
* Audit Ledger: Global chronological timeline showing changed by, timestamp, action type (Approved vs Edited), justification reason, and before/after field differences.

## Data Model Summary

The database consists of:
* Tenant: Root organizational unit.
* UserProfile: Associates django.contrib.auth.User with roles (ANALYST, ADMIN) and a Tenant.
* IngestionBatch: Tracks upload metadata and preserves raw file content.
* IngestionRow: Individual lines parsed from batches, preserved as raw JSON.
* NormalizedRecord: Standardized ESG record holding calculated emissions (kg CO2e) and scopes.
* ValidationIssue: Temporary entries logging warnings and errors raised during normalization.
* AuditLog: Immutable records of changes showing old/new JSON values and reasons.

For detailed table definitions, refer to docs/MODEL.md.

## Project Structure

```text
.
├── backend/
│   ├── api/
│   │   ├── migrations/
│   │   ├── services/
│   │   │   ├── audit.py
│   │   │   ├── ingestion.py
│   │   │   └── normalization.py
│   │   ├── models.py
│   │   ├── serializers.py
│   │   └── views.py
│   ├── core/
│   │   ├── settings.py
│   │   └── urls.py
│   ├── requirements.txt
│   └── manage.py
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── Sidebar.jsx
│   │   ├── pages/
│   │   │   ├── AuditLogs.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── RecordDetails.jsx
│   │   │   └── ReviewDashboard.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   └── index.css
│   └── package.json
├── docs/
│   ├── MODEL.md
│   ├── PROJECT_SPEC.md
│   └── PROJECT_UNDERSTANDING.md
└── samples/
    ├── sap_test.csv
    ├── travel_test.csv
    └── utility_test.csv
```

## API Overview

* POST /api/v1/auth/login/ - Authenticate credentials and return token.
* GET /api/v1/tenants/ - List registered tenants (Admin only).
* POST /api/v1/ingestion/upload/ - Upload CSV and run ingestion pipeline.
* GET /api/v1/records/ - Fetch filtered list of normalized records.
* GET /api/v1/records/<uuid>/ - Retrieve details of a single record.
* PATCH /api/v1/records/<uuid>/ - Apply field modifications (requires justification).
* POST /api/v1/records/<uuid>/approve/ - Change status to APPROVED and lock record.
* POST /api/v1/records/<uuid>/reject/ - Revert status to FLAGGED.
* GET /api/v1/records/<uuid>/audit-history/ - Get audit trail of a specific record.
* GET /api/v1/audit-logs/ - Get global, tenant-scoped audit timeline.

## Local Setup

### 1. Database Setup
Ensure Docker is installed and running locally, then initialize the database container:
```bash
docker run --name esg-postgres -e POSTGRES_DB=esg_db -e POSTGRES_USER=esg_user -e POSTGRES_PASSWORD=esg_password -p 5432:5432 -d postgres:15
```

### 2. Backend Installation
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py loaddata seed_data.json
python manage.py runserver
```

### 3. Frontend Installation
```bash
cd ../frontend
npm install
npm run dev
```

## Environment Variables

The backend uses the following variables (with fallback values defined in core/settings.py):
* POSTGRES_DB: Database name (default: esg_db)
* POSTGRES_USER: Database username (default: esg_user)
* POSTGRES_PASSWORD: Database password (default: esg_password)
* POSTGRES_HOST: Database host (default: localhost)
* POSTGRES_PORT: Database port (default: 5432)

## Sample Test Files

Sample data templates are located in the samples/ directory:
* samples/sap_test.csv - Example procurement and diesel usage rows.
* samples/utility_test.csv - Example electrical utility kilowatt-hour bills.
* samples/travel_test.csv - Example business flight bookings and hotel stays.

## Decisions

Refer to docs/PROJECT_SPEC.md for architectural decisions on logical multi-tenancy, data lifecycle states, and conversion standards.

## Tradeoffs

Refer to docs/PROJECT_UNDERSTANDING.md (Level 10) for discussions on logical isolation vs. physical database split, Django REST Framework, and validation trigger thresholds.

## Research Sources

Refer to docs/PROJECT_UNDERSTANDING.md for reference methodologies, including Greenhouse Gas Protocol guidelines and regulatory compliance requirements.

## Known Limitations

* Synchronous Ingestion: Processing uploaded CSV files is done synchronously in the request-response loop; uploading files with thousands of rows may cause request timeouts.
* Minimal Data Types: Only supports SAP, Utility, and Travel formats; other procurement systems require code updates.
* Lack of Bulk Approval: Approving multiple records must be done row-by-row; there is no bulk checkbox option in the current iteration.

## Future Improvements

* Async Processing: Integrate Celery and Redis to handle file ingestion as background jobs.
* Custom Mapping UI: Allow users to map raw CSV columns to target models directly in the web UI.
* Aggregate Analytics: Add dashboard metrics showing carbon footprint trends and reductions over time.

## Credentials

Authenticate using the following accounts (Password: Password123!):
* Analyst 1 (Aerohi Tenant): analyst_aerohi
* Admin (Aerohi Tenant): admin_aerohi
* Analyst 2 (Alpha Tenant): analyst_alpha

## Deployment

This application is currently configured for local runtime execution.
* Frontend Access: http://localhost:5173
* Backend REST API: http://localhost:8000/api/v1/

## Assignment Mapping

| Requirement | Implemented |
| :--- | :--- |
| Multi-tenant isolation | Tenant scoping on UserProfile, IngestionBatch, and NormalizedRecord database views. |
| Ingest multiple formats | Parsers implemented for SAP ERP, Utility Bills, and Travel receipts. |
| Automatic Normalization | Units parsed and standardized; flight miles converted to kilometers. |
| Emissions Calculation | CO2e calculated automatically based on activity type multipliers. |
| Validation Alerts | Checks for negative values, future dates, and abnormal usage spikes. |
| Interactive Review | Details panel allowing field modifications and status transitions. |
| Change Accountability | Mandatory justification comments with JSON old/new value snapshots. |
| Immutable Ledger | APPROVED state blocks edits via database hooks and services. |
| User Interface | Clean dark mode layout, sticky table headers, and collapsible sidebar. |

## Author

* Name: Depavath Naresh
* GitHub: depavathnareshnaik
