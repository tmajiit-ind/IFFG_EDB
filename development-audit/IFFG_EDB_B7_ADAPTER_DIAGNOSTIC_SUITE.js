/**
 * IFFG EDB - B7 / Adapter Diagnostic Test Suite
 *
 * PURPOSE
 * -------
 * Diagnose why a Booking ID that exists in "Form Responses 1"
 * is not being found by:
 *
 *   getB7BookingDataContext()
 *   getB7SelectedBooking()
 *   getEDBBookingForNewUI()
 *
 * SAFETY
 * ------
 * READ ONLY.
 * This suite does NOT:
 *   - approve
 *   - reject
 *   - request payment
 *   - send WhatsApp
 *   - schedule
 *   - alter booking rows
 *   - call showEDBBookingDetailLive()
 *
 * RUN
 * ---
 *   runEDBB7AdapterDiagnosticSuite()
 *
 * RESULT
 * ------
 * Creates/refreshes:
 *   EDB_B7_ADAPTER_DIAGNOSTIC
 *
 * The suite deliberately performs several independent tests so that
 * one failure does not hide the next diagnostic.
 */

function runEDBB7AdapterDiagnosticSuite() {

  const ss = SpreadsheetApp.openById(
    '1hHdFRgj1YnBqQATLd94iEGuRDqxOIsQEd8w1DKmYQfQ'
  );

  const reportSheet =
    getEDBB7DiagnosticSheet_(ss);

  const started = new Date();

  const rows = [
    ['TEST', 'RESULT', 'DETAIL']
  ];

  // ============================================================
  // TEST GROUP 1 - FUNCTION AVAILABILITY
  // ============================================================

  const functions = [
    'getB7BookingDataContext',
    'getB7SelectedBooking',
    'getEDBBookingForNewUI',
    'showEDBBookingDetailLive'
  ];

  functions.forEach(function(name) {

    let available = false;

    try {
      available =
        typeof globalThis[name] === 'function';
    } catch (err) {
      available = false;
    }

    rows.push([
      'Function exists: ' + name,
      available ? 'PASS' : 'FAIL',
      available ? 'Available' : 'Missing'
    ]);
  });


  // ============================================================
  // TEST GROUP 2 - RESPONSE SHEET DISCOVERY
  // ============================================================

  const responseSheet =
    findEDBResponseSheetDiagnostic_(ss);

  rows.push([
    'Response Sheet discovery',
    responseSheet ? 'PASS' : 'FAIL',
    responseSheet
      ? responseSheet.getName()
      : 'Could not identify Response Sheet'
  ]);

  if (!responseSheet) {

    rows.push([
      'OVERALL',
      'STOP',
      'Cannot continue without Response Sheet'
    ]);

    writeEDBB7DiagnosticReport_(
      reportSheet,
      rows,
      started
    );

    return;
  }


  // ============================================================
  // TEST GROUP 3 - RAW RESPONSE SHEET STRUCTURE
  // ============================================================

  const lastRow =
    responseSheet.getLastRow();

  const lastColumn =
    responseSheet.getLastColumn();

  rows.push([
    'Response Sheet dimensions',
    lastRow > 1 && lastColumn > 0
      ? 'PASS'
      : 'FAIL',
    lastRow + ' rows x ' +
    lastColumn + ' columns'
  ]);

  if (!lastRow || !lastColumn) {

    rows.push([
      'OVERALL',
      'STOP',
      'Response Sheet contains no usable data'
    ]);

    writeEDBB7DiagnosticReport_(
      reportSheet,
      rows,
      started
    );

    return;
  }

  const allValues =
    responseSheet
      .getRange(
        1,
        1,
        lastRow,
        lastColumn
      )
      .getDisplayValues();

  const headers = allValues[0];


  // ============================================================
  // TEST GROUP 4 - FIND BOOKING ID COLUMN
  // ============================================================

  const bookingIdColumns = [];

  headers.forEach(function(header, index) {

    const normalized =
      String(header || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');

    if (
      normalized === 'booking id' ||
      normalized === 'bookingid'
    ) {
      bookingIdColumns.push(index);
    }
  });

  rows.push([
    'Booking ID column',
    bookingIdColumns.length === 1
      ? 'PASS'
      : bookingIdColumns.length > 1
        ? 'CHECK'
        : 'FAIL',
    bookingIdColumns.length
      ? bookingIdColumns.map(function(i) {
          return columnLetter_(i + 1);
        }).join(', ')
      : 'Not found'
  ]);


  // ============================================================
  // TEST GROUP 5 - RAW BOOKING ID INVENTORY
  // ============================================================

  let rawBookingIds = [];

  if (bookingIdColumns.length) {

    const idCol =
      bookingIdColumns[0];

    for (let r = 1; r < allValues.length; r++) {

      const value =
        String(allValues[r][idCol] || '').trim();

      if (value) {
        rawBookingIds.push({
          id: value,
          row: r + 1
        });
      }
    }
  }

  rows.push([
    'Non-empty Booking IDs',
    rawBookingIds.length
      ? 'PASS'
      : 'FAIL',
    String(rawBookingIds.length)
  ]);

  if (rawBookingIds.length) {

    rows.push([
      'First real Booking ID',
      'PASS',
      rawBookingIds[0].id +
      ' at row ' +
      rawBookingIds[0].row
    ]);

    rows.push([
      'Booking ID sample',
      'PASS',
      rawBookingIds
        .slice(0, 10)
        .map(function(x) {
          return x.id;
        })
        .join(' | ')
    ]);
  }


  // ============================================================
  // TEST GROUP 6 - EXACT MATCH DIAGNOSTICS
  // ============================================================

  const testId =
    rawBookingIds.length
      ? rawBookingIds[0].id
      : '';

  if (testId && bookingIdColumns.length) {

    const idCol =
      bookingIdColumns[0];

    const matches = [];

    for (let r = 1; r < allValues.length; r++) {

      const raw =
        String(allValues[r][idCol] || '');

      if (raw === testId) {
        matches.push(r + 1);
      }

      if (raw.trim() === testId.trim() &&
          raw !== testId) {

        rows.push([
          'Booking ID whitespace/format',
          'CHECK',
          'Raw=[' + raw +
          '] vs Trimmed=[' +
          raw.trim() + ']'
        ]);
      }
    }

    rows.push([
      'Exact raw Booking ID match',
      matches.length === 1
        ? 'PASS'
        : matches.length > 1
          ? 'CHECK'
          : 'FAIL',
      matches.length
        ? 'Rows: ' + matches.join(', ')
        : 'No exact match'
    ]);
  }


  // ============================================================
  // TEST GROUP 7 - B7 DATA CONTEXT
  // ============================================================

  let context = null;

  if (typeof getB7BookingDataContext === 'function') {

    try {

      context =
        getB7BookingDataContext();

      rows.push([
        'getB7BookingDataContext()',
        context ? 'PASS' : 'FAIL',
        describeEDBB7Context_(context)
      ]);

      if (context) {

        rows.push([
          'B7 context type',
          'PASS',
          Object.prototype.toString
            .call(context)
        ]);

        rows.push([
          'B7 context keys',
          'PASS',
          Object.keys(context)
            .slice(0, 40)
            .join(', ')
        ]);
      }

    } catch (err) {

      rows.push([
        'getB7BookingDataContext()',
        'FAIL',
        String(
          err && err.message || err
        )
      ]);
    }

  } else {

    rows.push([
      'getB7BookingDataContext()',
      'NOT RUN',
      'Function unavailable'
    ]);
  }


  // ============================================================
  // TEST GROUP 8 - B7 SELECTED BOOKING
  // ============================================================

  if (testId &&
      typeof getB7SelectedBooking === 'function') {

    let selected = null;

    try {

      selected =
        getB7SelectedBooking(
          context,
          testId
        );

      rows.push([
        'getB7SelectedBooking(real ID)',
        selected ? 'PASS' : 'FAIL',
        selected
          ? describeEDBSelectedBooking_(selected)
          : 'No booking returned'
      ]);

      if (selected) {

        rows.push([
          'Selected booking keys',
          'PASS',
          Object.keys(selected)
            .slice(0, 40)
            .join(', ')
        ]);
      }

    } catch (err) {

      rows.push([
        'getB7SelectedBooking(real ID)',
        'FAIL',
        String(
          err && err.message || err
        )
      ]);
    }

  } else {

    rows.push([
      'getB7SelectedBooking(real ID)',
      'NOT RUN',
      testId
        ? 'Function unavailable'
        : 'No real Booking ID'
    ]);
  }


  // ============================================================
  // TEST GROUP 9 - ADAPTER WITH REAL ID
  // ============================================================

  if (testId &&
      typeof getEDBBookingForNewUI === 'function') {

    try {

      const booking =
        getEDBBookingForNewUI(testId);

      rows.push([
        'getEDBBookingForNewUI(real ID)',
        booking ? 'PASS' : 'FAIL',
        booking
          ? 'Returned booking object'
          : 'No object'
      ]);

      if (booking) {

        rows.push([
          'Adapter Booking ID',
          String(
            booking.bookingId || ''
          ) === testId
            ? 'PASS'
            : 'FAIL',
          String(
            booking.bookingId || ''
          )
        ]);

        rows.push([
          'Adapter row number',
          booking.rowNumber
            ? 'PASS'
            : 'CHECK',
          String(
            booking.rowNumber || ''
          )
        ]);

        rows.push([
          'Adapter headers',
          Array.isArray(booking.headers) &&
          booking.headers.length
            ? 'PASS'
            : 'FAIL',
          String(
            Array.isArray(booking.headers)
              ? booking.headers.length
              : 0
          )
        ]);

        rows.push([
          'Adapter values',
          Array.isArray(booking.values) &&
          booking.values.length
            ? 'PASS'
            : 'FAIL',
          String(
            Array.isArray(booking.values)
              ? booking.values.length
              : 0
          )
        ]);
      }

    } catch (err) {

      rows.push([
        'getEDBBookingForNewUI(real ID)',
        'FAIL',
        String(
          err && err.message || err
        )
      ]);
    }

  } else {

    rows.push([
      'getEDBBookingForNewUI(real ID)',
      'NOT RUN',
      testId
        ? 'Adapter unavailable'
        : 'No real Booking ID'
    ]);
  }


  // ============================================================
  // TEST GROUP 10 - MULTIPLE REAL IDS
  //
  // This is the important "extensive" part:
  // test several actual Booking IDs, not just one.
  // ============================================================

  if (
    typeof getEDBBookingForNewUI === 'function' &&
    rawBookingIds.length
  ) {

    const sample =
      rawBookingIds.slice(0, 10);

    let passed = 0;
    let failed = 0;

    sample.forEach(function(item) {

      try {

        const result =
          getEDBBookingForNewUI(item.id);

        if (
          result &&
          String(result.bookingId || '') === item.id
        ) {
          passed++;
        } else {
          failed++;
        }

      } catch (err) {

        failed++;
      }
    });

    rows.push([
      'Adapter multi-ID test',
      failed === 0
        ? 'PASS'
        : passed > 0
          ? 'CHECK'
          : 'FAIL',
      'Tested ' + sample.length +
      ' real IDs; passed=' +
      passed +
      ', failed=' +
      failed
    ]);

  } else {

    rows.push([
      'Adapter multi-ID test',
      'NOT RUN',
      'No usable real Booking IDs'
    ]);
  }


  // ============================================================
  // TEST GROUP 11 - INVALID IDS
  // ============================================================

  if (typeof getB7SelectedBooking === 'function') {

    try {

      getB7SelectedBooking(
        context,
        '__EDB_INVALID_TEST_ID__'
      );

      rows.push([
        'B7 invalid ID rejection',
        'FAIL',
        'Unexpected booking returned'
      ]);

    } catch (err) {

      rows.push([
        'B7 invalid ID rejection',
        'PASS',
        String(
          err && err.message || err
        )
      ]);
    }
  }


  if (typeof getEDBBookingForNewUI === 'function') {

    try {

      getEDBBookingForNewUI(
        '__EDB_INVALID_TEST_ID__'
      );

      rows.push([
        'Adapter invalid ID rejection',
        'FAIL',
        'Unexpected booking returned'
      ]);

    } catch (err) {

      rows.push([
        'Adapter invalid ID rejection',
        'PASS',
        String(
          err && err.message || err
        )
      ]);
    }
  }


  // ============================================================
  // TEST GROUP 12 - WRITE SAFETY
  // ============================================================

  rows.push([
    'Booking writes',
    'NOT RUN',
    'Suite is read-only'
  ]);

  rows.push([
    'Approval / rejection',
    'NOT RUN',
    'Suite does not invoke actions'
  ]);

  rows.push([
    'Payment / WhatsApp',
    'NOT RUN',
    'Suite does not invoke actions'
  ]);

  rows.push([
    'Scheduling',
    'NOT RUN',
    'Suite does not invoke actions'
  ]);


  rows.push([
    'OVERALL',
    'SEE ABOVE',
    'Use this report to identify the failing layer'
  ]);


  writeEDBB7DiagnosticReport_(
    reportSheet,
    rows,
    started
  );
}


// ================================================================
// HELPERS
// ================================================================

function findEDBResponseSheetDiagnostic_(ss) {

  const preferred = [
    'Form Responses 1',
    'Response Sheet',
    'ResponseSheet',
    'EDB Response Sheet'
  ];

  for (let i = 0; i < preferred.length; i++) {

    const sheet =
      ss.getSheetByName(preferred[i]);

    if (sheet) return sheet;
  }

  const sheets = ss.getSheets();

  for (let i = 0; i < sheets.length; i++) {

    const sheet = sheets[i];

    const lastColumn =
      sheet.getLastColumn();

    if (!lastColumn) continue;

    const headers =
      sheet
        .getRange(
          1,
          1,
          1,
          lastColumn
        )
        .getDisplayValues()[0];

    const found =
      headers.some(function(header) {

        return String(header || '')
          .trim()
          .toLowerCase()
          .replace(/\s+/g, ' ') ===
          'booking id';
      });

    if (found) return sheet;
  }

  return null;
}


function describeEDBB7Context_(context) {

  if (!context) return 'null';

  if (Array.isArray(context)) {
    return 'Array length=' +
      context.length;
  }

  if (typeof context !== 'object') {
    return typeof context +
      ': ' +
      String(context);
  }

  const parts = [];

  [
    'sheetName',
    'responseSheetName',
    'rowCount',
    'lastRow',
    'lastColumn',
    'headers',
    'values',
    'rows',
    'data'
  ].forEach(function(key) {

    if (context[key] !== undefined) {

      let value = context[key];

      if (Array.isArray(value)) {
        value =
          'Array(' +
          value.length +
          ')';
      }

      parts.push(
        key + '=' + String(value)
      );
    }
  });

  return parts.length
    ? parts.join('; ')
    : 'Object returned';
}


function describeEDBSelectedBooking_(selected) {

  if (!selected) return 'null';

  if (typeof selected !== 'object') {
    return typeof selected +
      ': ' +
      String(selected);
  }

  const parts = [];

  [
    'bookingId',
    'rowNumber',
    'row',
    'flat',
    'resident',
    'payment',
    'lifecycle'
  ].forEach(function(key) {

    if (selected[key] !== undefined) {

      parts.push(
        key + '=' +
        String(selected[key])
      );
    }
  });

  return parts.length
    ? parts.join('; ')
    : 'Object returned';
}


function columnLetter_(column) {

  let result = '';
  let n = column;

  while (n > 0) {

    const remainder =
      (n - 1) % 26;

    result =
      String.fromCharCode(
        65 + remainder
      ) + result;

    n =
      Math.floor(
        (n - 1) / 26
      );
  }

  return result;
}


function getEDBB7DiagnosticSheet_(ss) {

  const name =
    'EDB_B7_ADAPTER_DIAGNOSTIC';

  let sheet =
    ss.getSheetByName(name);

  if (!sheet) {
    sheet = ss.insertSheet(name);
  }

  return sheet;
}


function writeEDBB7DiagnosticReport_(
  sheet,
  rows,
  started
) {

  sheet.clearContents();

  sheet
    .getRange(
      1,
      1,
      rows.length,
      3
    )
    .setValues(rows);

  sheet
    .getRange(
      1,
      1,
      1,
      3
    )
    .setFontWeight('bold');

  sheet
    .getRange(
      rows.length + 2,
      1,
      2,
      2
    )
    .setValues([
      ['Started', started],
      ['Completed', new Date()]
    ]);

  sheet.autoResizeColumns(1, 3);
}
function testLIVEGetB7SelectedBookingDirect() {

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const context =
    getB7BookingDataContext();

  const ids = [
    'IFFG-EDB-00009',
    'IFFG-EDB-00011',
    '__EDB_INVALID_TEST_ID__',
    ''
  ];

  const output = [];

  ids.forEach(function(id) {

    try {

      const result =
        getB7SelectedBooking(
          context,
          id
        );

      output.push([
        id || '(blank)',
        result ? 'RETURNED' : 'NULL',
        result
          ? 'row=' + result.rowNumber +
            '; headers=' +
            result.headers.length +
            '; BookingID=' +
            String(
              result.values[
                result.headers.findIndex(
                  h =>
                    String(h || '')
                      .trim()
                      .toLowerCase() === 'booking id'
                )
              ] || ''
            )
          : ''
      ]);

    } catch (err) {

      output.push([
        id || '(blank)',
        'THREW',
        String(
          err && err.message || err
        )
      ]);
    }
  });

  const name =
    'EDB_LIVE_B7_DIRECT_TEST';

  let sheet =
    ss.getSheetByName(name);

  if (!sheet) {
    sheet = ss.insertSheet(name);
  }

  sheet.clearContents();

  sheet
    .getRange(1, 1, 1, 3)
    .setValues([
      [
        'BOOKING ID',
        'RESULT',
        'DETAIL'
      ]
    ]);

  sheet
    .getRange(
      2,
      1,
      output.length,
      3
    )
    .setValues(output);

  sheet
    .getRange(1, 1, 1, 3)
    .setFontWeight('bold');

  sheet.autoResizeColumns(1, 3);
}