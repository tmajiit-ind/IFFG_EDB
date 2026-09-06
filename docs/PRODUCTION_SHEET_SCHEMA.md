# IFFG EDB - Production Response Sheet Schema

## Sheet identity

- Spreadsheet ID: `1hHdFRgj1YnBqQATLd94iEGuRDqxOIsQEd8w1DKmYQfQ`
- Sheet: `Form Responses 1`
- GID: `1024710807`
- Total columns currently established: 39 (`A:AM`)

## Important caution

This document deliberately does **not** invent the complete 39-header list.

The following positions are independently established in the current project baseline:

| Column | Header |
|---|---|
| N | Email Address |
| O | Booking ID |
| P | Media File Name |
| AM | WhatsApp - FM/Accounts Notification |

The remaining original Google Form response headers should be documented from the live header row when that row is available. Production response data is not required for this documentation.

## Production/admin columns established by the current core code

The Production Apps Script contains an `ensureAdminColumns()` definition with these required administrative fields:

1. Booking ID
2. Media File Name
3. Media Size (MB)
4. Media MIME Type
5. Media Drive Link
6. Media Validation
7. Validation Remarks
8. Base Charge
9. GST
10. Total Payable
11. Payment Status
12. Payment UTR / Reference
13. Payment Date
14. Approval Status
15. Requested Start Date
16. Requested End Date

These names are code-defined administrative requirements. Their exact physical column positions should be taken from the live sheet rather than inferred.

## Resolver rule

The Production core identifies the response sheet by locating a sheet whose header row contains a normalized `Timestamp` header. It does not rely solely on a hardcoded sheet name.

## Booking ID

Booking ID is a key operational field used throughout the EDB booking-selection, audit and display workflows.

Examples of valid Test Lab Booking IDs are documented in `GOOGLE_WORKSPACE_ARCHITECTURE.md`.

## Data protection

Do not place response rows, resident details, payment information, media files or other operational data in GitHub. This file is a schema/reference document only.
