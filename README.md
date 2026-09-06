# IFFG EDB

Electronic Display Board (EDB) system for the IFFG environment.

## Repository structure

- `production/` - current Production Apps Script project source.
- `development-audit/` - current Development & Audit Apps Script project source, including diagnostics, audits, regression tests and scenario/sandbox code.
- `docs/` - technical documentation describing the relationship between the Apps Script projects and the live Google Workspace assets.

## Important system boundary

The live Google Form, Production Response Spreadsheet, Test Lab Spreadsheet, response rows, resident information, payment records and uploaded media are Google Workspace assets. They are **not stored in this GitHub repository**.

GitHub is the source-control location for Apps Script source code and non-sensitive technical documentation.

## Current Google Workspace assets

See `docs/GOOGLE_WORKSPACE_ARCHITECTURE.md`.

See `docs/PRODUCTION_SHEET_SCHEMA.md` for the currently verified sheet structure and the distinction between confirmed and not-yet-confirmed header details.

## Working rule

Do not use Production data for development testing. Use the controlled Test Lab environment and dummy bookings for regression work.

## Branch baseline

The initial repository baseline was committed as:

`4f3a9cc` - `IFFG EDB baseline - Production and Development Audit`

The baseline was initially pushed to the `master` branch. GitHub's default branch is `main`; branch normalization is a separate repository housekeeping step.
