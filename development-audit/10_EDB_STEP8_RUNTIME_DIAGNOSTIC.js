/**
 * IFFG EDB - STEP 8 RUNTIME DIAGNOSTIC
 *
 * Read-only diagnostic for reconciling the live Apps Script runtime
 * with the Dev branch Step 8 source.
 *
 * PURPOSE:
 * - prove which getEDBBookingForNewUI implementation is loaded at runtime
 * - prove which getB7SelectedBooking implementation is loaded at runtime
 * - compare stable spreadsheet/sheet identity values
 * - exercise the K3 booking lookup once
 * - capture the exact adapter failure, if any
 *
 * NO SHEET WRITES.
 * NO TRIGGER INSTALLATION.
 * NO PRODUCTION CHANGES.
 */

function runEDBStep8RuntimeDiagnostic() {
  var result = {
    status: 'PASS',
    checks: [],
    errors: []
  };

  function check(name, passed, detail) {
    var item = {
      name: name,
      passed: !!passed,
      detail: detail || ''
    };
    result.checks.push(item);
    console.log((passed ? 'PASS: ' : 'FAIL: ') + name + (detail ? ' | ' + detail : ''));
    if (!passed) {
      result.status = 'FAIL';
      result.errors.push(name + (detail ? ': ' + detail : ''));
    }
  }

  console.log('============================================================');
  console.log('IFFG EDB STEP 8 RUNTIME DIAGNOSTIC');
  console.log('READ-ONLY - NO DATA CHANGES');
  console.log('============================================================');

  check(
    'getEDBBookingForNewUI exists',
    typeof getEDBBookingForNewUI === 'function',
    typeof getEDBBookingForNewUI
  );

  check(
    'getB7BookingDataContext exists',
    typeof getB7BookingDataContext === 'function',
    typeof getB7BookingDataContext
  );

  check(
    'getB7SelectedBooking exists',
    typeof getB7SelectedBooking === 'function',
    typeof getB7SelectedBooking
  );

  if (
    typeof getEDBBookingForNewUI === 'function'
  ) {
    var adapterSource = String(getEDBBookingForNewUI.toString());
    console.log('ADAPTER SOURCE MARKERS:');
    console.log('  uses getB7BookingDataContext: ' + adapterSource.indexOf('getB7BookingDataContext') >= 0);
    console.log('  uses getB7SelectedBooking: ' + adapterSource.indexOf('getB7SelectedBooking') >= 0);
    console.log('  contains production spreadsheet ID: ' + adapterSource.indexOf('1hHdFRgj1YnBqQATLd94iEGuRDqxOIsQEd8w1DKmYQfQ') >= 0);
    console.log('  contains hardcoded Form Responses 1: ' + adapterSource.indexOf('Form Responses 1') >= 0);
    console.log('  contains rich output field mediaDriveLink: ' + adapterSource.indexOf('mediaDriveLink') >= 0);
    console.log('  calls lifecycle with values/headerMap: ' + adapterSource.indexOf('getEDBAutomaticDisplayState(values, headerMap)') >= 0);
    check(
      'Runtime adapter is not the known hardcoded-production implementation',
      adapterSource.indexOf('1hHdFRgj1YnBqQATLd94iEGuRDqxOIsQEd8w1DKmYQfQ') < 0,
      'production-ID marker=' + (adapterSource.indexOf('1hHdFRgj1YnBqQATLd94iEGuRDqxOIsQEd8w1DKmYQfQ') >= 0)
    );
  }

  if (
    typeof getB7SelectedBooking === 'function'
  ) {
    var selectedSource = String(getB7SelectedBooking.toString());
    console.log('SELECTED-BOOKING SOURCE MARKERS:');
    console.log('  uses getEDBResponseSheet: ' + (selectedSource.indexOf('getEDBResponseSheet') >= 0));
    console.log('  hardcoded Form Responses 1: ' + (selectedSource.indexOf("getSheetByName('Form Responses 1')") >= 0));
    console.log('  hardcoded production spreadsheet ID: ' + (selectedSource.indexOf('1hHdFRgj1YnBqQATLd94iEGuRDqxOIsQEd8w1DKmYQfQ') >= 0));
  }

  var spreadsheet;
  var resolvedSheet;
  var context;
  var k3 = '';

  try {
    spreadsheet = getEDBSpreadsheet();
    check(
      'EDB spreadsheet resolved',
      !!spreadsheet,
      spreadsheet ? spreadsheet.getName() + ' | id=' + spreadsheet.getId() : 'No spreadsheet'
    );
  } catch (err) {
    check('EDB spreadsheet resolved', false, String(err));
  }

  try {
    resolvedSheet = getEDBResponseSheet(spreadsheet);
    check(
      'Authoritative Response Sheet resolved',
      !!resolvedSheet,
      resolvedSheet ? resolvedSheet.getName() + ' | gid=' + resolvedSheet.getSheetId() : 'No sheet'
    );
  } catch (err) {
    check('Authoritative Response Sheet resolved', false, String(err));
  }

  try {
    context = getB7BookingDataContext();
    var contextSheet = context && context.responseSheet;
    var sameSpreadsheet = !!(
      context &&
      context.spreadsheet &&
      spreadsheet &&
      context.spreadsheet.getId() === spreadsheet.getId()
    );
    var sameSheetStable = !!(
      contextSheet &&
      resolvedSheet &&
      contextSheet.getSheetId() === resolvedSheet.getSheetId()
    );

    check(
      'B7 context uses same spreadsheet by stable ID',
      sameSpreadsheet,
      context && context.spreadsheet ? context.spreadsheet.getId() : 'missing'
    );

    check(
      'B7 context uses same Response Sheet by stable GID',
      sameSheetStable,
      contextSheet ? contextSheet.getName() + ' | gid=' + contextSheet.getSheetId() : 'missing'
    );
  } catch (err) {
    check('B7 context resolves without error', false, String(err));
  }

  try {
    var dashboard = spreadsheet.getSheetByName('EDB Dashboard');
    check('EDB Dashboard exists', !!dashboard, dashboard ? 'found' : 'missing');
    if (dashboard) {
      k3 = String(dashboard.getRange('K3').getDisplayValue() || '').trim();
      check('Dashboard K3 contains Booking ID', !!k3, k3 || 'blank');
      console.log('K3 BOOKING ID: ' + k3);
    }
  } catch (err) {
    check('Dashboard K3 can be read', false, String(err));
  }

  if (k3) {
    try {
      var selected = getB7SelectedBooking(context, k3);
      check(
        'B7 selected-booking lookup finds K3',
        !!selected,
        selected ? 'row=' + selected.rowNumber + ' | sheet=' + selected.responseSheet.getName() : 'not found'
      );
    } catch (err) {
      check('B7 selected-booking lookup finds K3', false, String(err));
    }

    try {
      var adapted = getEDBBookingForNewUI(k3);
      check(
        'Adapter lookup finds K3',
        !!adapted && String(adapted.bookingId || '').trim() === k3,
        adapted ? 'returned=' + adapted.bookingId + ' | row=' + adapted.rowNumber : 'no result'
      );
    } catch (err) {
      check('Adapter lookup finds K3', false, String(err));
    }
  }

  console.log('============================================================');
  console.log('RUNTIME DIAGNOSTIC RESULT: ' + result.status);
  console.log('CHECKS: ' + result.checks.length + ' | FAILURES: ' + result.errors.length);
  if (result.errors.length) {
    console.log('FAILURES:');
    result.errors.forEach(function(error) {
      console.log('  - ' + error);
    });
  }
  console.log('============================================================');

  return result;
}
