# IFFG EDB - Authoritative Response Sheet Schema

## Purpose

This document is the structural reference for the IFFG Electronic Display Board response sheet.

**Critical rule:** physical column letters are reference information only. Application code must resolve fields by their header names from the live header row. Code must not assume that `N` means Booking ID.

## Sheet identity

- Production spreadsheet: `1hHdFRgj1YnBqQATLd94iEGuRDqxOIsQEd8w1DKmYQfQ`
- Production response sheet: `Form Responses 1`
- Production response sheet GID: `1024710807`
- Current established width: 39 columns (`A:AM`)

## Confirmed physical mapping

The following physical positions are independently established in the project baseline:

| Column | Sheet column number | Header | Structural role |
|---|---:|---|---|
| N | 14 | Email Address | Form response field |
| **O** | **15** | **Booking ID** | **Primary EDB booking key** |
| P | 16 | Media File Name | Media/admin field |
| AM | 39 | WhatsApp - FM/Accounts Notification | Notification field |

The N/O distinction is intentional and must not be reversed:

> **N = Email Address. O = Booking ID.**

The physical positions of other administrative fields must be taken from the live header row. They must not be inferred from a list order or from an earlier version of the sheet.

## Logical administrative schema

These are the EDB logical field names. They are identifiers, not a declaration of their physical column positions:

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
17. Final Start Date
18. Final End Date
19. Display Status

## Authoritative lookup rule

For every booking lookup:

1. Resolve the authoritative Response Sheet using the EDB response-sheet resolver.
2. Read the complete header row from that same sheet.
3. Locate `Booking ID` by normalized header name.
4. Use that resolved zero-based index against row values read from the same sheet/range.
5. Never use `13`, `14`, `15`, `N`, `O`, or any other physical position as the Booking ID lookup key in application logic.

The same header-driven rule applies to Payment Status, Approval Status, dates, media fields, resident fields and all other operational fields.

## Response-sheet resolver

The production core identifies the response sheet by locating a sheet whose header row contains a normalized `Timestamp` header. It does not rely solely on a hardcoded sheet name.

## Test and development rule

Development, audit and regression code must follow the same header-driven lookup contract as production code. Tests must not introduce a second schema by hardcoding a physical Booking ID position or by opening a different hardcoded Production spreadsheet.

The Test Lab is a separate controlled environment and must be resolved through its own configured/test context.

## Data protection

Do not place response rows, resident details, payment information or uploaded media in GitHub. This file contains schema metadata only.
