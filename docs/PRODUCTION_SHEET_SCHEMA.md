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

| Column | Sheet column number | Header | Structural role |
|---|---:|---|---|
| N | 14 | Email Address | Form response field |
| **O** | **15** | **Booking ID** | **Primary EDB booking key** |
| P | 16 | Media File Name | Media/admin field |
| Q | 17 | Media Size (MB) | Media/admin field |
| R | 18 | Media MIME Type | Media/admin field |
| S | 19 | Media Drive Link | Media/admin field |
| T | 20 | Media Validation | Media/admin field |
| U | 21 | Validation Remarks | Media/admin field |
| V | 22 | Base Charge | Pricing/admin field |
| W | 23 | GST | Pricing/admin field |
| X | 24 | Total Payable | Pricing/admin field |
| Y | 25 | Payment Status | Payment/admin field |
| Z | 26 | Payment UTR / Reference | Payment/admin field |
| AA | 27 | Payment Date | Payment/admin field |
| AB | 28 | Approval Status | Approval/admin field |
| AC | 29 | Final Start Date | Lifecycle/admin field |
| AD | 30 | Final End Date | Lifecycle/admin field |
| AE | 31 | Display Status | Lifecycle/admin field |
| AM | 39 | WhatsApp - FM/Accounts Notification | Notification field |

The N/O distinction is intentional and must not be reversed:

> **N = Email Address. O = Booking ID.**

## Administrative field names

The EDB administrative layer uses these header names as the logical field identifiers:

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

Exact physical positions of any field not explicitly confirmed above must be obtained from the live header row. Do not infer positions from the order of this list.

## Authoritative lookup rule

For every booking lookup:

1. Resolve the authoritative Response Sheet using the EDB response-sheet resolver.
2. Read the complete header row from that same sheet.
3. Locate `Booking ID` by normalized header name.
4. Use that resolved zero-based index against the row values from the same sheet/range.
5. Never use `14`, `15`, `N`, `O`, or any other physical position as the Booking ID lookup key in application logic.

The same header-driven rule applies to Payment Status, Approval Status, dates, media fields, resident fields and all other operational fields.

## Response-sheet resolver

The production core identifies the response sheet by locating a sheet whose header row contains a normalized `Timestamp` header. It does not rely solely on a hardcoded sheet name.

## Test and development rule

Development, audit and regression code must follow the same header-driven lookup contract as production code. Tests must not introduce a second schema by hardcoding a physical Booking ID position or by opening a different hardcoded Production spreadsheet.

The Test Lab is a separate controlled environment and must be resolved through its own configured/test context.

## Data protection

Do not place response rows, resident details, payment information, media files or uploaded media in GitHub. This file contains schema metadata only.
