# IFFG EDB - Project Structure

## Production project

Directory: `production/`

This is the current Production Apps Script clone.

Current source files:

- `01_EDB_CORE.gs.js`
- `02_EDB_ADMIN_UI.js`
- `03_EDB_BOOKING_AUDIT.js`
- `04_EDB_LIFECYCLE_AUDIT.js`
- `05_EDB_SHEET_CLEANUP.js`
- `06_EDB_DEPENDENCY_SCANNER.js`
- `07_EDB_SCENARIO_SANDBOX.js`
- `appsscript.json`
- `.clasp.json`

Production Apps Script project ID:

`1yQKqTJREToNQuuNR_aQ0fvreXWMrlbcyOd192QAH_L44_eCIIGWYB2tf`

## Development & Audit project

Directory: `development-audit/`

This is the current Development & Audit Apps Script clone.

It contains the current audit, diagnostic, regression, scenario and operational test files, plus its Apps Script configuration.

Development & Audit Apps Script project ID:

`1mQEnQrnIjqOxkCQd2lU6ZeXCp4xT8yDvTS5p-bpIKZixLGHwo4rY_dbr`

## Important distinction

The Production and Development & Audit projects are separate Apps Script projects.

Do not assume that a file existing in Development & Audit is deployed to Production.

Do not copy the entire Development & Audit project into Production merely because a diagnostic/test file appears useful.

Changes to Production should be deliberate and regression-tested.

## Live data boundary

The live Google Form and Google Sheets are outside this repository.

The repository contains source and technical documentation; Google Workspace contains live operational data.

## Testing boundary

Use the Test Lab spreadsheet for controlled dummy-booking tests.

Known valid Test Lab Booking IDs:

- `IFFG-EDB-00003`
- `IFFG-EDB-00005`
- `IFFG-EDB-00006`
- `IFFG-EDB-00007`

Do not treat `0` or a fabricated Booking ID as a valid Test Lab booking identifier.

## Source-control baseline

Initial baseline commit:

`4f3a9cc`

Message:

`IFFG EDB baseline - Production and Development Audit`
