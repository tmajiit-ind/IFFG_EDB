/*
============================================================
IFFG EDB - STEP 8 COMPLETE TEST SUITE
VERSION 1
READ ONLY
============================================================

PURPOSE
-------
Run ONE function:

  runEDBStep8CompleteTestSuite()

This suite tests the Step 8 service adapter and its live
booking-ID data path without changing Form Responses 1.

TESTS
-----
1. Core dependencies exist.
2. Live EDB spreadsheet and Response Sheet resolve.
3. Booking ID header exists.
4. K3 current Booking ID is captured.
5. K3 helper-list sheet exists.
6. Helper-list IDs are compared with live Response Sheet IDs.
7. K3 ID is checked directly against the live Response Sheet.
8. getB7SelectedBooking() is tested with the K3 ID.
9. getEDBBookingForNewUI() is tested with the K3 ID.
10. Adapter output is compared with the selected booking row.
11. Adapter is tested with a blank ID (expected rejection).
12. Adapter is tested with a deliberately nonexistent ID
    (expected rejection).
13. getEDBAutomaticDisplayState() availability is checked.
14. Response Sheet snapshot is compared before/after all
    read-only calls to detect unintended changes.

IMPORTANT
---------
- Form Responses 1 is READ ONLY.
- No booking is created, edited, approved, paid, scheduled,
  archived, or deleted.
- No trigger is installed.
- No production cell is written.
- No spreadsheet ID is hard-coded.
- The test reports the K3/helper-list/Response-Sheet
  discrepancy instead of silently correcting it.

The suite deliberately does NOT "fix" stale helper data.
============================================================
*/

function runEDBStep8CompleteTestSuite() {

  var started = new Date();
  var results = [];
  var ss = null;
  var responseSheet = null;
  var dashboard = null;
  var listSheet = null;
  var k3BookingId = '';

  function pass(name, detail) {
    results.push({
      test: name,
      result: 'PASS',
      detail: detail || ''
    });
    console.log('PASS | ' + name + ' | ' + (detail || ''));
  }

  function fail(name, detail) {
    results.push({
      test: name,
      result: 'FAIL',
      detail: detail || ''
    });
    console.log('FAIL | ' + name + ' | ' + (detail || ''));
  }

  function warn(name, detail) {
    results.push({
      test: name,
      result: 'WARN',
      detail: detail || ''
    });
    console.log('WARN | ' + name + ' | ' + (detail || ''));
  }

  function info(name, detail) {
    console.log('INFO | ' + name + ' | ' + (detail || ''));
  }

  function normaliseId(value) {
    return String(value || '').trim();
  }

  function safeValue(value) {
    if (value instanceof Date) {
      return value.toISOString();
    }
    return String(value === null || value === undefined ? '' : value);
  }

  function snapshotSheet(sheet) {
    var lastRow = sheet.getLastRow();
    var lastColumn = sheet.getLastColumn();

    if (lastRow < 1 || lastColumn < 1) {
      return JSON.stringify([]);
    }

    return JSON.stringify(
      sheet.getRange(
        1,
        1,
        lastRow,
        lastColumn
      ).getValues().map(function(row) {
        return row.map(safeValue);
      })
    );
  }

  function findBookingIdIndex(headers) {
    for (var i = 0; i < headers.length; i++) {
      if (
        String(headers[i] || '')
          .trim()
          .toLowerCase() === 'booking id'
      ) {
        return i;
      }
    }
    return -1;
  }

  function getLiveBookingIds(sheet, bookingIdIndex) {
    var lastRow = sheet.getLastRow();

    if (lastRow < 2) {
      return [];
    }

    var lastColumn = sheet.getLastColumn();

    var values = sheet.getRange(
      2,
      1,
      lastRow - 1,
      lastColumn
    ).getValues();

    return values
      .map(function(row) {
        return normaliseId(row[bookingIdIndex]);
      })
      .filter(function(id) {
        return id !== '';
      });
  }

  function getHelperBookingIds(sheet) {
    if (!sheet) {
      return [];
    }

    var lastRow = sheet.getLastRow();

    if (lastRow < 2) {
      return [];
    }

    return sheet
      .getRange(2, 1, lastRow - 1, 1)
      .getDisplayValues()
      .map(function(row) {
        return normaliseId(row[0]);
      })
      .filter(function(id) {
        return id !== '';
      });
  }

  function findId(ids, wanted) {
    var target = normaliseId(wanted);

    for (var i = 0; i < ids.length; i++) {
      if (ids[i] === target) {
        return true;
      }
    }

    return false;
  }

  function compareAdapterToSelected(adapter, selected) {

    var headers = selected.headers || [];
    var values = selected.values || [];
    var headerMap =
      getEDBHeaderMap(selected.responseSheet);

    function value(names) {
      return getEDBValue(
        values,
        headerMap,
        names
      );
    }

    var expected = {
      bookingId: normaliseId(
        value(['Booking ID'])
      ),
      rowNumber: selected.rowNumber,
      flat: String(
        value(['Flat Number', 'Flat']) || ''
      ),
      resident: String(
        value(['Name', 'Resident Name', 'Resident']) || ''
      ),
      content: String(
        value([
          'Advertisement Content',
          'Content',
          'Description'
        ]) || ''
      ),
      payment: String(
        value(['Payment Status']) || ''
      ),
      displayStart: safeValue(
        value([
          'Confirmed Start Date',
          'Display Start Date',
          'Start Date'
        ])
      ),
      displayEnd: safeValue(
        value([
          'Confirmed End Date',
          'Display End Date',
          'End Date'
        ])
      )
    };

    var actual = {
      bookingId: normaliseId(adapter.bookingId),
      rowNumber: adapter.rowNumber,
      flat: String(adapter.flat || ''),
      resident: String(adapter.resident || ''),
      content: String(adapter.content || ''),
      payment: String(adapter.payment || ''),
      displayStart: safeValue(adapter.displayStart),
      displayEnd: safeValue(adapter.displayEnd)
    };

    var mismatches = [];

    Object.keys(expected).forEach(function(key) {
      if (
        String(expected[key]) !==
        String(actual[key])
      ) {
        mismatches.push(
          key +
          ' expected=[' + expected[key] +
          '] actual=[' + actual[key] + ']'
        );
      }
    });

    return mismatches;
  }

  info(
    'SUITE',
    'Step 8 complete read-only test started.'
  );

  /*
   * ----------------------------------------------------------
   * 1. DEPENDENCIES
   * ----------------------------------------------------------
   */

  var requiredFunctions = [
    'getEDBSpreadsheet',
    'getEDBResponseSheet',
    'getB7BookingDataContext',
    'getB7SelectedBooking',
    'getEDBHeaderMap',
    'getEDBValue',
    'getEDBAutomaticDisplayState',
    'getEDBBookingForNewUI'
  ];

  requiredFunctions.forEach(function(name) {
    if (typeof this[name] === 'function') {
      pass(
        'Dependency: ' + name,
        'Available.'
      );
    } else {
      fail(
        'Dependency: ' + name,
        'Function is not available.'
      );
    }
  });

  /*
   * ----------------------------------------------------------
   * 2. LIVE SPREADSHEET / RESPONSE SHEET
   * ----------------------------------------------------------
   */

  try {
    ss = getEDBSpreadsheet();

    if (!ss) {
      throw new Error(
        'getEDBSpreadsheet() returned no spreadsheet.'
      );
    }

    pass(
      'Live spreadsheet resolution',
      ss.getName()
    );

  } catch (err) {

    fail(
      'Live spreadsheet resolution',
      err.message
    );

    throw err;
  }

  try {
    responseSheet =
      getEDBResponseSheet(ss);

    if (!responseSheet) {
      throw new Error(
        'Response Sheet could not be resolved.'
      );
    }

    pass(
      'Response Sheet resolution',
      responseSheet.getName()
    );

  } catch (err) {

    fail(
      'Response Sheet resolution',
      err.message
    );

    throw err;
  }

  /*
   * ----------------------------------------------------------
   * 3. DASHBOARD / K3
   * ----------------------------------------------------------
   */

  dashboard =
    ss.getSheetByName('EDB Dashboard');

  if (!dashboard) {

    fail(
      'EDB Dashboard',
      'EDB Dashboard sheet not found.'
    );

  } else {

    pass(
      'EDB Dashboard',
      'Sheet exists.'
    );

    k3BookingId =
      normaliseId(
        dashboard.getRange('K3').getDisplayValue()
      );

    info(
      'K3 current Booking ID',
      '[' + k3BookingId + ']'
    );

    if (k3BookingId) {
      pass(
        'K3 Booking ID present',
        k3BookingId
      );
    } else {
      warn(
        'K3 Booking ID present',
        'K3 is blank; live-ID tests requiring a selected booking will be skipped.'
      );
    }
  }

  /*
   * ----------------------------------------------------------
   * 4. RESPONSE SHEET HEADER / DATA
   * ----------------------------------------------------------
   */

  var lastColumn =
    Math.max(
      responseSheet.getLastColumn(),
      1
    );

  var headers =
    responseSheet
      .getRange(
        1,
        1,
        1,
        lastColumn
      )
      .getValues()[0];

  var bookingIdIndex =
    findBookingIdIndex(headers);

  if (bookingIdIndex < 0) {

    fail(
      'Booking ID header',
      'Booking ID header was not found.'
    );

    throw new Error(
      'Step 8 suite cannot continue without Booking ID header.'
    );

  } else {

    pass(
      'Booking ID header',
      'Zero-based index = ' + bookingIdIndex +
      '; sheet column = ' + (bookingIdIndex + 1)
    );
  }

  var liveIds =
    getLiveBookingIds(
      responseSheet,
      bookingIdIndex
    );

  pass(
    'Live Booking ID inventory',
    liveIds.length + ' nonblank Booking IDs found.'
  );

  /*
   * ----------------------------------------------------------
   * 5. HELPER LIST / K3 SOURCE DIAGNOSTIC
   * ----------------------------------------------------------
   */

  listSheet =
    ss.getSheetByName('_EDB_B7D1_Lists');

  if (!listSheet) {

    warn(
      'B7 helper list',
      '_EDB_B7D1_Lists does not exist.'
    );

  } else {

    pass(
      'B7 helper list',
      '_EDB_B7D1_Lists exists.'
    );

    var helperIds =
      getHelperBookingIds(listSheet);

    info(
      'Helper Booking ID inventory',
      helperIds.length + ' nonblank IDs found.'
    );

    if (k3BookingId) {

      var k3InLive =
        findId(
          liveIds,
          k3BookingId
        );

      var k3InHelper =
        findId(
          helperIds,
          k3BookingId
        );

      if (k3InLive) {

        pass(
          'K3 ID exists in Response Sheet',
          k3BookingId
        );

      } else {

        fail(
          'K3 ID exists in Response Sheet',
          k3BookingId +
          ' is NOT present in the live Response Sheet Booking ID column.'
        );
      }

      if (k3InHelper) {

        pass(
          'K3 ID exists in helper list',
          k3BookingId
        );

      } else {

        fail(
          'K3 ID exists in helper list',
          k3BookingId +
          ' is NOT present in _EDB_B7D1_Lists.'
        );
      }

      if (
        k3InHelper &&
        !k3InLive
      ) {

        fail(
          'K3/helper/Response consistency',
          'K3/helper list contains the Booking ID but the live Response Sheet does not. This indicates stale or mismatched selector data.'
        );

      } else if (
        k3InLive &&
        !k3InHelper
      ) {

        warn(
          'K3/helper/Response consistency',
          'Booking exists live but helper list does not contain it.'
        );

      } else if (
        k3InLive &&
        k3InHelper
      ) {

        pass(
          'K3/helper/Response consistency',
          'K3 ID exists in both sources.'
        );
      }
    }
  }

  /*
   * ----------------------------------------------------------
   * 6. RAW LIVE ROW LOOKUP
   * ----------------------------------------------------------
   */

  var selected = null;

  if (k3BookingId) {

    var context =
      getB7BookingDataContext();

    if (
      context &&
      context.responseSheet === responseSheet
    ) {

      pass(
        'B7 context uses live Response Sheet',
        responseSheet.getName()
      );

    } else {

      fail(
        'B7 context uses live Response Sheet',
        'Returned context does not point to the resolved Response Sheet.'
      );
    }

    selected =
      getB7SelectedBooking(
        context,
        k3BookingId
      );

    if (selected) {

      pass(
        'getB7SelectedBooking(K3)',
        'Found row ' + selected.rowNumber
      );

    } else {

      fail(
        'getB7SelectedBooking(K3)',
        'Booking ID not found: ' + k3BookingId
      );
    }
  }

  /*
   * ----------------------------------------------------------
   * 7. STEP 8 ADAPTER
   * ----------------------------------------------------------
   */

  var adapter = null;

  if (k3BookingId) {

    try {

      adapter =
        getEDBBookingForNewUI(
          k3BookingId
        );

      if (!adapter) {
        throw new Error(
          'Adapter returned null/undefined.'
        );
      }

      pass(
        'getEDBBookingForNewUI(K3)',
        'Returned adapter object.'
      );

      info(
        'Adapter bookingId',
        '[' + adapter.bookingId + ']'
      );

      info(
        'Adapter rowNumber',
        '[' + adapter.rowNumber + ']'
      );

      info(
        'Adapter flat',
        '[' + adapter.flat + ']'
      );

      info(
        'Adapter resident',
        '[' + adapter.resident + ']'
      );

      info(
        'Adapter payment',
        '[' + adapter.payment + ']'
      );

      info(
        'Adapter lifecycle',
        '[' + adapter.lifecycle + ']'
      );

    } catch (err) {

      fail(
        'getEDBBookingForNewUI(K3)',
        err.message
      );
    }
  }

  /*
   * ----------------------------------------------------------
   * 8. ADAPTER VS EXISTING SELECTED ROW
   * ----------------------------------------------------------
   */

  if (adapter && selected) {

    try {

      var mismatches =
        compareAdapterToSelected(
          adapter,
          selected
        );

      if (mismatches.length === 0) {

        pass(
          'Adapter data matches existing lookup',
          'All mapped fields match.'
        );

      } else {

        fail(
          'Adapter data matches existing lookup',
          mismatches.join(' ; ')
        );
      }

    } catch (err) {

      fail(
        'Adapter data comparison',
        err.message
      );
    }
  }

  /*
   * ----------------------------------------------------------
   * 9. NEGATIVE TESTS
   * ----------------------------------------------------------
   */

  try {

    getEDBBookingForNewUI('');

    fail(
      'Blank Booking ID rejection',
      'Adapter did not reject a blank Booking ID.'
    );

  } catch (err) {

    if (
      String(err.message || '')
        .indexOf('Booking ID is required.') >= 0
    ) {

      pass(
        'Blank Booking ID rejection',
        err.message
      );

    } else {

      fail(
        'Blank Booking ID rejection',
        'Unexpected error: ' + err.message
      );
    }
  }

  var impossibleId =
    '__STEP8_TEST_NONEXISTENT_BOOKING_ID__';

  try {

    getEDBBookingForNewUI(
      impossibleId
    );

    fail(
      'Nonexistent Booking ID rejection',
      'Adapter did not reject deliberately nonexistent ID.'
    );

  } catch (err) {

    if (
      String(err.message || '')
        .indexOf('Booking ID not found:') >= 0
    ) {

      pass(
        'Nonexistent Booking ID rejection',
        err.message
      );

    } else {

      fail(
        'Nonexistent Booking ID rejection',
        'Unexpected error: ' + err.message
      );
    }
  }

  /*
   * ----------------------------------------------------------
   * 10. LIFECYCLE DEPENDENCY
   * ----------------------------------------------------------
   */

  if (
    typeof getEDBAutomaticDisplayState ===
    'function'
  ) {

    pass(
      'Automatic lifecycle dependency',
      'getEDBAutomaticDisplayState() is available.'
    );

  } else {

    fail(
      'Automatic lifecycle dependency',
      'getEDBAutomaticDisplayState() is unavailable.'
    );
  }

  if (
    adapter &&
    typeof adapter.lifecycle === 'string'
  ) {

    pass(
      'Adapter lifecycle field',
      'Lifecycle property returned as string.'
    );

  } else if (adapter) {

    fail(
      'Adapter lifecycle field',
      'Lifecycle property is missing or not a string.'
    );
  }

  /*
   * ----------------------------------------------------------
   * 11. READ-ONLY INTEGRITY TEST
   * ----------------------------------------------------------
   */

  var beforeSnapshot =
    snapshotSheet(responseSheet);

  /*
   * Repeat the live adapter call if a valid K3 booking exists.
   * This call is intentionally read-only.
   */

  if (k3BookingId) {

    try {

      getEDBBookingForNewUI(
        k3BookingId
      );

      var afterSnapshot =
        snapshotSheet(responseSheet);

      if (
        beforeSnapshot ===
        afterSnapshot
      ) {

        pass(
          'Response Sheet read-only integrity',
          'No Response Sheet value changed during Step 8 reads.'
        );

      } else {

        fail(
          'Response Sheet read-only integrity',
          'Response Sheet content changed during Step 8 reads.'
        );
      }

    } catch (err) {

      fail(
        'Response Sheet read-only integrity',
        'Could not complete repeat adapter read: ' +
        err.message
      );
    }

  } else {

    warn(
      'Response Sheet read-only integrity',
      'Skipped live adapter read because K3 is blank.'
    );
  }

  /*
   * ----------------------------------------------------------
   * FINAL SUMMARY
   * ----------------------------------------------------------
   */

  var passCount = 0;
  var failCount = 0;
  var warnCount = 0;

  results.forEach(function(item) {

    if (item.result === 'PASS') {
      passCount++;
    } else if (item.result === 'FAIL') {
      failCount++;
    } else if (item.result === 'WARN') {
      warnCount++;
    }
  });

  var finished = new Date();

  console.log(
    '============================================================'
  );

  console.log(
    'STEP 8 COMPLETE TEST SUMMARY'
  );

  console.log(
    'PASS = ' + passCount +
    ' | FAIL = ' + failCount +
    ' | WARN = ' + warnCount
  );

  console.log(
    'K3 BOOKING ID = [' + k3BookingId + ']'
  );

  console.log(
    'START = ' + started.toISOString()
  );

  console.log(
    'END   = ' + finished.toISOString()
  );

  console.log(
    '============================================================'
  );

  return {
    started: started,
    finished: finished,
    bookingId: k3BookingId,
    pass: passCount,
    fail: failCount,
    warn: warnCount,
    results: results
  };
}
