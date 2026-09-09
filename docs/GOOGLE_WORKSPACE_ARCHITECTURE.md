# IFFG EDB - Google Workspace Architecture

## Purpose

This document describes the live Google Workspace assets used by the IFFG Electronic Display Board (EDB) system.

The Google Form and Google Sheets remain live Workspace assets and are **not stored in GitHub**.

## Production

- Production Apps Script project ID: `1yQKqTJREToNQuuNR_aQ0fvreXWMrlbcyOd192QAH_L44_eCIIGWYB2tf`
- Production response spreadsheet ID: `1hHdFRgj1YnBqQATLd94iEGuRDqxOIsQEd8w1DKmYQfQ`
- Production response sheet: `Form Responses 1`
- Production response sheet GID: `1024710807`
- Production response schema: 39 columns (`A:AM`)

### Confirmed Production fields

| Column | Field |
|---|---|
| N | Email Address |
| **O** | **Booking ID** |
| P | Media File Name |
| AM | WhatsApp - FM/Accounts Notification |

**Structural rule: N is Email Address; O is Booking ID. They must never be treated as interchangeable.**

The Production spreadsheet contains live operational information. Do not copy Production rows or personal/payment data into GitHub.

## Response Sheet lookup contract

The physical mapping above is reference metadata, not an application lookup rule.

Application and test code must:

1. Resolve the authoritative Response Sheet.
2. Read the complete live header row from that sheet.
3. Find `Booking ID` by normalized header name.
4. Use that resolved index with row values from the same sheet/range.
5. Resolve all other operational fields by header name in the same way.

No application or regression code should assume a fixed Booking ID column such as N, O, index 13, index 14 or index 15.

The full logical administrative schema and confirmed physical mappings are maintained in `PRODUCTION_SHEET_SCHEMA.md`.

## Development & Audit

- Development & Audit Apps Script project ID: `1mQEnQrnIjqOxkCQd2lU6ZeXCp4xT8yDvTS5p-bpIKZixLGHwo4rY_dbr`
- This project contains diagnostic, audit, regression, sandbox and operational test code.

Development and audit code must use the same Response Sheet lookup contract as Production. A test must not introduce a second hardcoded schema or hardcoded Production spreadsheet reference.

## Test Lab

- Test Lab spreadsheet ID: `1ixlMDeAEUu2bpKL-Bnp9iNlniM_VxSNrRFi1CurcwuM`
- Test Lab sheet: `IFFG EDB - TEST LAB - DUMMY BOOKINGS`
- Test Lab sheet GID: `1645078452`
- Test Lab schema: 39 columns
- Purpose: controlled testing and dummy bookings; it is not Production.

Known valid Test Lab Booking IDs:
- `IFFG-EDB-00003`
- `IFFG-EDB-00005`
- `IFFG-EDB-00006`
- `IFFG-EDB-00007`

## System relationship

```text
Google Form
    |
    v
Production Response Spreadsheet
    |
    +--> Production Apps Script
    |       |
    |       +--> booking processing
    |       +--> display lifecycle
    |       +--> administration / audit
    |
    +--> live EDB operational data

Development & Audit Apps Script
    |
    +--> diagnostics
    +--> regression tests
    +--> lifecycle audits
    +--> dependency/scenario analysis

Test Lab Spreadsheet
    |
    +--> controlled dummy bookings
    +--> regression testing
    +--> adapter / Screen 2 testing
```

## GitHub boundary

GitHub stores source code and non-sensitive technical documentation.

GitHub does **not** store:
- the Google Form itself
- the live Production response spreadsheet
- Test Lab response data
- resident/personal information
- payment records
- uploaded media files
- operational response rows

Google Workspace remains the system of record for those live assets.
