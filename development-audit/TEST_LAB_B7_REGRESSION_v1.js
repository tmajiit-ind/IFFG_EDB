/**
 * IFFG EDB - TEST LAB B7 REGRESSION SUITE v1
 *
 * PURPOSE
 * -------
 * Read-only verification of the B7 booking lookup against the
 * dedicated Test Lab spreadsheet.
 *
 * IMPORTANT
 * ---------
 * - Opens ONLY the Test Lab spreadsheet.
 * - Does NOT write to the Test Lab.
 * - Does NOT call the Production adapter getEDBBookingForNewUI(),
 *   because that adapter is intentionally Production-bound.
 * - Requires the existing B7 functions in this Apps Script project:
 *       getB7BookingDataContext(spreadsheetOverride)
 *       getB7SelectedBooking(context, bookingId)
 *
 * Test Lab:
 *   1ixlMDeAEUu2bpKL-Bnp9iNlniM_VxSNrRFi1CurcwuM
 *
 * Expected schema:
 *   A:AM = 39 columns
 *   N = Email Address
 *   O = Booking ID
 */

const IFFG_EDB_TEST_LAB_ID =
  '1ixlMDeAEUu2bpKL-Bnp9iNlniM_VxSNrRFi1CurcwuM';

const IFFG_EDB_TEST_LAB_BOOKING_IDS = [
  'IFFG-EDB-00003',
  'IFFG-EDB-00005',
  'IFFG-EDB-00006',
  'IFFG-EDB-00007'
];

function runEDBTestLabB7Regression() {
  const started = new Date();
  const results = [];

  try {
    const ss = SpreadsheetApp.openById(IFFG_EDB_TEST_LAB_ID);
    const sheet = findEDBTestLabResponseSheet_(ss);

    const lastColumn = Math.max(sheet.getLastColumn(), 1);
    const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];

    addB7TestResult_(
      results,
      'TEST LAB ACCESS',
      true,
      ss.getName() + ' / ' + sheet.getName()
    );

    addB7TestResult_(
      results,
      'SCHEMA WIDTH = 39',
      headers.length === 39,
      'Detected ' + headers.length + ' columns; expected 39 (A:AM).'
    );

    addB7TestResult_(
      results,
      'COLUMN N = Email Address',
      normaliseHeader(headers[13]) === 'emailaddress',
      'N1 = "' + headers[13] + '"'
    );

    addB7TestResult_(
      results,
      'COLUMN O = Booking ID',
      normaliseHeader(headers[14]) === 'bookingid',
      'O1 = "' + headers[14] + '"'
    );

    // Snapshot values before B7 lookups. The suite must remain read-only.
    const before = sheet.getDataRange().getValues();
    const beforeHash = hash2DArray_(before);

    let context;
    let contextOk = false;

    try {
      context = getB7BookingDataContext(ss);
      contextOk = !!context &&
        !!context.responseSheet &&
        Array.isArray(context.headers);
    } catch (err) {
      addB7TestResult_(
        results,
        'B7 CONTEXT CREATION',
        false,
        String(err && err.message ? err.message : err)
      );
    }

    if (contextOk) {
      addB7TestResult_(
        results,
        'B7 CONTEXT SHEET = TEST LAB',
        context.responseSheet.getParent().getId() === IFFG_EDB_TEST_LAB_ID,
        'Context spreadsheet ID = ' +
          context.responseSheet.getParent().getId()
      );

      addB7TestResult_(
        results,
        'B7 CONTEXT WIDTH = 39',
        context.headers.length === 39,
        'Context headers = ' + context.headers.length
      );

      IFFG_EDB_TEST_LAB_BOOKING_IDS.forEach(function(bookingId) {
        testB7BookingId_(results, context, bookingId);
      });

      testB7BlankId_(results, context);
      testB7InvalidId_(results, context);
      testB7WhitespaceId_(results, context);
    }

    const after = sheet.getDataRange().getValues();
    const afterHash = hash2DArray_(after);

    addB7TestResult_(
      results,
      'READ-ONLY SAFETY',
      beforeHash === afterHash,
      beforeHash === afterHash
        ? 'Test Lab data unchanged.'
        : 'WARNING: Test Lab data changed during test.'
    );

  } catch (err) {
    addB7TestResult_(
      results,
      'SUITE EXECUTION',
      false,
      String(err && err.stack ? err.stack : err)
    );
  }

  writeEDBTestLabB7Report_(results, started);
  return results;
}

function testB7BookingId_(results, context, bookingId) {
  try {
    const selected = getB7SelectedBooking(context, bookingId);

    const found =
      selected !== null &&
      selected !== undefined;

    addB7TestResult_(
      results,
      'LOOKUP ' + bookingId,
      found,
      found ? 'Booking found.' : 'Booking NOT found.'
    );

    if (!found) return;

    const row = selected.row || selected.values || selected.data;
    const returnedId =
      selected.bookingId ||
      selected.bookingID ||
      selected.id ||
      findBookingIdInSelected_(selected);

    addB7TestResult_(
      results,
      bookingId + ' / EXACT ID',
      String(returnedId || '').trim() === bookingId,
      'Returned Booking ID = "' + String(returnedId || '') + '"'
    );

    if (Array.isArray(row)) {
      addB7TestResult_(
        results,
        bookingId + ' / ROW WIDTH',
        row.length === 39,
        'Returned row width = ' + row.length
      );

      addB7TestResult_(
        results,
        bookingId + ' / COLUMN O',
        String(row[14] || '').trim() === bookingId,
        'Returned O value = "' + String(row[14] || '') + '"'
      );
    }
  } catch (err) {
    addB7TestResult_(
      results,
      'LOOKUP ' + bookingId,
      false,
      String(err && err.message ? err.message : err)
    );
  }
}

function testB7BlankId_(results, context) {
  try {
    const selected = getB7SelectedBooking(context, '');
    addB7TestResult_(
      results,
      'BLANK BOOKING ID',
      selected === null || selected === undefined,
      'Expected no booking for blank ID; returned ' +
        describeValue_(selected)
    );
  } catch (err) {
    // An explicit validation error is acceptable for a blank ID.
    addB7TestResult_(
      results,
      'BLANK BOOKING ID',
      true,
      'Rejected/validated: ' +
        String(err && err.message ? err.message : err)
    );
  }
}

function testB7InvalidId_(results, context) {
  const invalidId = 'IFFG-EDB-99999';

  try {
    const selected = getB7SelectedBooking(context, invalidId);
    addB7TestResult_(
      results,
      'INVALID BOOKING ID',
      selected === null || selected === undefined,
      'Expected no booking for ' + invalidId +
        '; returned ' + describeValue_(selected)
    );
  } catch (err) {
    addB7TestResult_(
      results,
      'INVALID BOOKING ID',
      true,
      'Rejected/validated: ' +
        String(err && err.message ? err.message : err)
    );
  }
}

function testB7WhitespaceId_(results, context) {
  const id = IFFG_EDB_TEST_LAB_BOOKING_IDS[1];
  const padded = '  ' + id + '  ';

  try {
    const selected = getB7SelectedBooking(context, padded);
    const found = selected !== null && selected !== undefined;

    addB7TestResult_(
      results,
      'WHITESPACE BOOKING ID',
      found,
      found
        ? 'Whitespace-padded ID resolved successfully.'
        : 'Whitespace-padded ID was not resolved.'
    );
  } catch (err) {
    addB7TestResult_(
      results,
      'WHITESPACE BOOKING ID',
      false,
      String(err && err.message ? err.message : err)
    );
  }
}

function findBookingIdInSelected_(selected) {
  const candidates = [
    selected.data,
    selected.values,
    selected.row
  ];

  for (let i = 0; i < candidates.length; i++) {
    const value = candidates[i];

    if (Array.isArray(value) && value.length > 14) {
      return value[14];
    }

    if (value && typeof value === 'object') {
      if (value.bookingId !== undefined) return value.bookingId;
      if (value.bookingID !== undefined) return value.bookingID;
      if (value['Booking ID'] !== undefined) return value['Booking ID'];
    }
  }

  return '';
}

function findEDBTestLabResponseSheet_(ss) {
  const sheets = ss.getSheets();

  for (let i = 0; i < sheets.length; i++) {
    const sheet = sheets[i];
    const lastColumn = Math.max(sheet.getLastColumn(), 1);
    const headers = sheet
      .getRange(1, 1, 1, lastColumn)
      .getValues()[0];

    const hasTimestamp = headers.some(function(header) {
      return normaliseHeader(header) === 'timestamp';
    });

    if (hasTimestamp) return sheet;
  }

  throw new Error(
    'TEST LAB: Could not identify the Forms response sheet by Timestamp header.'
  );
}

function addB7TestResult_(results, test, passed, detail) {
  results.push({
    time: new Date(),
    test: test,
    status: passed ? 'PASS' : 'FAIL',
    detail: detail
  });
}

function writeEDBTestLabB7Report_(results, started) {
  const ss = SpreadsheetApp.openById(IFFG_EDB_TEST_LAB_ID);
  let report = ss.getSheetByName('EDB_B7_TEST_REPORT');

  if (!report) {
    report = ss.insertSheet('EDB_B7_TEST_REPORT');
  } else {
    report.clearContents();
  }

  const passCount = results.filter(function(r) {
    return r.status === 'PASS';
  }).length;

  const failCount = results.filter(function(r) {
    return r.status === 'FAIL';
  }).length;

  const rows = [
    ['IFFG EDB - B7 TEST LAB REGRESSION', ''],
    ['Run started', started],
    ['Run completed', new Date()],
    ['Test Lab Spreadsheet ID', IFFG_EDB_TEST_LAB_ID],
    ['PASS', passCount],
    ['FAIL', failCount],
    ['Overall', failCount === 0 ? 'PASS' : 'FAIL'],
    ['Test', 'Status', 'Detail']
  ];

  results.forEach(function(r) {
    rows.push([r.test, r.status, r.detail]);
  });

  report
    .getRange(1, 1, rows.length, 3)
    .setValues(rows.map(function(row) {
      return [
        row[0] !== undefined ? row[0] : '',
        row[1] !== undefined ? row[1] : '',
        row[2] !== undefined ? row[2] : ''
      ];
    }));

  report.setFrozenRows(8);
  report.autoResizeColumns(1, 3);
}

function describeValue_(value) {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (Array.isArray(value)) return 'array[' + value.length + ']';
  if (typeof value === 'object') return 'object';
  return String(value);
}

function hash2DArray_(values) {
  return JSON.stringify(values);
}

function normaliseHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_\-–—]+/g, '');
}
