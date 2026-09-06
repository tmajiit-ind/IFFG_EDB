/**
 * IFFG EDB - Screen 2 / Adapter Comprehensive Test Suite V2
 *
 * PURPOSE:
 *   Test the new Screen 2 booking adapter against a REAL booking found
 *   in the live Response Sheet.
 *
 * SAFETY:
 *   READ ONLY. No booking/action writes.
 *
 * RUN:
 *   runEDBScreen2AdapterTestSuiteV2()
 *
 * RESULT:
 *   EDB_TEST_SUITE_V2
 */

function runEDBScreen2AdapterTestSuiteV2() {

  const ss = SpreadsheetApp.openById(
    '1hHdFRgj1YnBqQATLd94iEGuRDqxOIsQEd8w1DKmYQfQ'
  );

  const reportSheet = getEDBTestSuiteV2Sheet_(ss);
  const started = new Date();
  const rows = [['TEST', 'RESULT', 'DETAIL']];

  // ------------------------------------------------------------
  // 1. Function availability
  // ------------------------------------------------------------

  const functionsToCheck = [
    'getEDBBookingForNewUI',
    'getB7BookingDataContext',
    'getB7SelectedBooking',
    'showEDBBookingDetailLive'
  ];

  functionsToCheck.forEach(function(name) {

    let exists = false;

    try {
      exists = typeof globalThis[name] === 'function';
    } catch (err) {
      exists = false;
    }

    rows.push([
      'Function: ' + name,
      exists ? 'PASS' : 'FAIL',
      exists ? 'Available' : 'Missing'
    ]);
  });

  // ------------------------------------------------------------
  // 2. Locate the live Response Sheet
  // ------------------------------------------------------------

  const responseSheet = findEDBResponseSheetV2_(ss);

  rows.push([
    'Response Sheet',
    responseSheet ? 'PASS' : 'FAIL',
    responseSheet
      ? responseSheet.getName()
      : 'Could not identify Response Sheet'
  ]);

  if (!responseSheet) {

    rows.push([
      'OVERALL',
      'STOP',
      'No Response Sheet identified'
    ]);

    writeEDBTestSuiteV2Report_(reportSheet, rows, started);
    return;
  }

  // ------------------------------------------------------------
  // 3. Discover a REAL Booking ID from the Response Sheet
  // ------------------------------------------------------------

  const bookingInfo =
    findRealEDBBookingIdV2_(responseSheet);

  rows.push([
    'Real Booking ID discovered',
    bookingInfo.bookingId ? 'PASS' : 'FAIL',
    bookingInfo.bookingId
      ? bookingInfo.bookingId +
        ' (row ' + bookingInfo.rowNumber + ')'
      : bookingInfo.detail
  ]);

  if (!bookingInfo.bookingId) {

    rows.push([
      'Adapter smoke test',
      'NOT RUN',
      'No usable Booking ID found'
    ]);

    rows.push([
      'OVERALL',
      'STOP',
      'Need a real Booking ID before adapter test'
    ]);

    writeEDBTestSuiteV2Report_(reportSheet, rows, started);
    return;
  }

  // ------------------------------------------------------------
  // 4. Test adapter with REAL Booking ID
  // ------------------------------------------------------------

  if (typeof getEDBBookingForNewUI !== 'function') {

    rows.push([
      'Adapter smoke test',
      'FAIL',
      'getEDBBookingForNewUI() is missing'
    ]);

  } else {

    try {

      const booking =
        getEDBBookingForNewUI(bookingInfo.bookingId);

      rows.push([
        'Adapter returns object',
        booking ? 'PASS' : 'FAIL',
        booking ? 'Object returned' : 'No object'
      ]);

      if (booking) {

        rows.push([
          'Booking ID',
          String(booking.bookingId || '') ===
            bookingInfo.bookingId ? 'PASS' : 'FAIL',
          String(booking.bookingId || '')
        ]);

        rows.push([
          'Row number',
          booking.rowNumber ? 'PASS' : 'CHECK',
          String(booking.rowNumber || '')
        ]);

        rows.push([
          'Headers',
          Array.isArray(booking.headers) &&
          booking.headers.length ? 'PASS' : 'FAIL',
          String(
            Array.isArray(booking.headers)
              ? booking.headers.length
              : 0
          )
        ]);

        rows.push([
          'Values',
          Array.isArray(booking.values) &&
          booking.values.length ? 'PASS' : 'FAIL',
          String(
            Array.isArray(booking.values)
              ? booking.values.length
              : 0
          )
        ]);

        rows.push([
          'Flat',
          booking.flat ? 'PASS' : 'CHECK',
          String(booking.flat || '')
        ]);

        rows.push([
          'Resident',
          booking.resident ? 'PASS' : 'CHECK',
          String(booking.resident || '')
        ]);

        rows.push([
          'Payment',
          booking.payment ? 'PASS' : 'CHECK',
          String(booking.payment || '')
        ]);

        rows.push([
          'Display Start',
          booking.displayStart ? 'PASS' : 'CHECK',
          String(booking.displayStart || '')
        ]);

        rows.push([
          'Display End',
          booking.displayEnd ? 'PASS' : 'CHECK',
          String(booking.displayEnd || '')
        ]);

        rows.push([
          'Lifecycle',
          booking.lifecycle ? 'PASS' : 'CHECK',
          String(booking.lifecycle || '')
        ]);
      }

    } catch (err) {

      rows.push([
        'Adapter smoke test',
        'FAIL',
        String(err && err.message || err)
      ]);
    }
  }

  // ------------------------------------------------------------
  // 5. Invalid ID behaviour
  // ------------------------------------------------------------

  try {

    getEDBBookingForNewUI(
      '__EDB_TEST_INVALID_BOOKING_ID__'
    );

    rows.push([
      'Invalid Booking ID',
      'FAIL',
      'Adapter unexpectedly returned data'
    ]);

  } catch (err) {

    rows.push([
      'Invalid Booking ID',
      'PASS',
      String(err && err.message || err)
    ]);
  }

  // ------------------------------------------------------------
  // 6. Explicit source inspection limitation
  // ------------------------------------------------------------

  rows.push([
    'Screen 2 source inspection',
    'NOT RUN',
    'Apps Script runtime does not expose project source safely'
  ]);

  // ------------------------------------------------------------
  // 7. Write/action safety
  // ------------------------------------------------------------

  rows.push([
    'Production booking writes',
    'NOT RUN',
    'This test suite performs no booking writes'
  ]);

  rows.push([
    'Approval / rejection',
    'NOT RUN',
    'Deliberately excluded'
  ]);

  rows.push([
    'Payment / WhatsApp',
    'NOT RUN',
    'Deliberately excluded'
  ]);

  rows.push([
    'Scheduling',
    'NOT RUN',
    'Deliberately excluded'
  ]);

  rows.push([
    'OVERALL',
    'SEE ABOVE',
    'Adapter tested against a real booking'
  ]);

  writeEDBTestSuiteV2Report_(
    reportSheet,
    rows,
    started
  );
}


function findEDBResponseSheetV2_(ss) {

  const sheets = ss.getSheets();

  // Prefer an exact conventional name first.
  const exactNames = [
    'Response Sheet',
    'ResponseSheet',
    'EDB Response Sheet',
    'EDB_RESPONSE'
  ];

  for (let i = 0; i < exactNames.length; i++) {

    const sheet = ss.getSheetByName(exactNames[i]);

    if (sheet) return sheet;
  }

  // Otherwise identify a sheet whose headers contain Booking ID.
  for (let i = 0; i < sheets.length; i++) {

    const sheet = sheets[i];

    if (sheet.getName() === 'EDB_TEST_SUITE' ||
        sheet.getName() === 'EDB_TEST_SUITE_V2') {
      continue;
    }

    const lastColumn = sheet.getLastColumn();

    if (!lastColumn) continue;

    const headerValues = sheet
      .getRange(1, 1, 1, lastColumn)
      .getDisplayValues()[0];

    const hasBookingId = headerValues.some(function(value) {
      return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ') === 'booking id';
    });

    if (hasBookingId) return sheet;
  }

  return null;
}


function findRealEDBBookingIdV2_(sheet) {

  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();

  if (lastRow < 2 || lastColumn < 1) {

    return {
      bookingId: '',
      rowNumber: '',
      detail: 'Response Sheet has no data rows'
    };
  }

  const data = sheet
    .getRange(1, 1, lastRow, lastColumn)
    .getDisplayValues();

  const headers = data[0];

  let bookingIdIndex = -1;

  for (let c = 0; c < headers.length; c++) {

    const normalized = String(headers[c] || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');

    if (normalized === 'booking id') {
      bookingIdIndex = c;
      break;
    }
  }

  if (bookingIdIndex < 0) {

    return {
      bookingId: '',
      rowNumber: '',
      detail: 'Booking ID column not found'
    };
  }

  // Find the first non-empty real Booking ID.
  for (let r = 1; r < data.length; r++) {

    const value = String(
      data[r][bookingIdIndex] || ''
    ).trim();

    if (value) {

      return {
        bookingId: value,
        rowNumber: r + 1,
        detail: 'Found in live Response Sheet'
      };
    }
  }

  return {
    bookingId: '',
    rowNumber: '',
    detail: 'Booking ID column contains no values'
  };
}


function getEDBTestSuiteV2Sheet_(ss) {

  const name = 'EDB_TEST_SUITE_V2';

  let sheet = ss.getSheetByName(name);

  if (!sheet) {
    sheet = ss.insertSheet(name);
  }

  return sheet;
}


function writeEDBTestSuiteV2Report_(
  sheet,
  rows,
  started
) {

  sheet.clearContents();

  sheet.getRange(
    1,
    1,
    rows.length,
    3
  ).setValues(rows);

  sheet.getRange(
    1,
    1,
    1,
    3
  ).setFontWeight('bold');

  sheet.getRange(
    rows.length + 2,
    1,
    2,
    2
  ).setValues([
    ['Started', started],
    ['Completed', new Date()]
  ]);

  sheet.autoResizeColumns(1, 3);
}
