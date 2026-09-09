/* ============================================================
   IFFG EDB - STEP 8 SERVICE ADAPTER TEST
   READ ONLY
   ============================================================ */

function runEDBStep8AdapterTest() {

  var ss = getEDBSpreadsheet();
  var dashboard = ss.getSheetByName('EDB Dashboard');
  var responseSheet = getEDBResponseSheet(ss);

  if (!dashboard) {
    throw new Error(
      'STEP 8 TEST FAILED: EDB Dashboard sheet not found.'
    );
  }

  if (!responseSheet) {
    throw new Error(
      'STEP 8 TEST FAILED: Response Sheet could not be resolved.'
    );
  }

  var bookingId = String(
    dashboard.getRange('K3').getDisplayValue() || ''
  ).trim();

  if (!bookingId) {
    throw new Error(
      'STEP 8 TEST FAILED: EDB Dashboard K3 has no selected Booking ID.'
    );
  }

  function snapshotSheet(sheet) {
    var lastRow = sheet.getLastRow();
    var lastColumn = sheet.getLastColumn();

    if (lastRow < 1 || lastColumn < 1) {
      return JSON.stringify([]);
    }

    return JSON.stringify(
      sheet.getRange(1, 1, lastRow, lastColumn).getValues().map(function(row) {
        return row.map(function(value) {
          if (value instanceof Date) {
            return value.toISOString();
          }
          return String(value === null || value === undefined ? '' : value);
        });
      })
    );
  }

  var beforeSnapshot = snapshotSheet(responseSheet);

  Logger.log(
    'STEP 8 TEST START: ' + bookingId
  );

  var before =
    getEDBBookingForNewUI(bookingId);

  if (!before) {
    throw new Error(
      'STEP 8 TEST FAILED: No result returned for ' + bookingId
    );
  }

  if (
    String(before.bookingId) !==
    bookingId
  ) {
    throw new Error(
      'STEP 8 TEST FAILED: Booking ID mismatch.'
    );
  }

  if (
    !before.rowNumber
  ) {
    throw new Error(
      'STEP 8 TEST FAILED: Row number missing.'
    );
  }

  var afterSnapshot = snapshotSheet(responseSheet);

  if (beforeSnapshot !== afterSnapshot) {
    throw new Error(
      'STEP 8 TEST FAILED: Response Sheet changed during read-only adapter call.'
    );
  }

  Logger.log(
    'Booking ID = ' +
    before.bookingId
  );

  Logger.log(
    'Row Number = ' +
    before.rowNumber
  );

  Logger.log(
    'Flat = ' +
    before.flat
  );

  Logger.log(
    'Resident = ' +
    before.resident
  );

  Logger.log(
    'Content = ' +
    before.content
  );

  Logger.log(
    'Payment = ' +
    before.payment
  );

  Logger.log(
    'Display Start = ' +
    before.displayStart
  );

  Logger.log(
    'Display End = ' +
    before.displayEnd
  );

  Logger.log(
    'Lifecycle = ' +
    before.lifecycle
  );

  Logger.log(
    'READ-ONLY INTEGRITY PASS: Response Sheet unchanged.'
  );

  Logger.log(
    'STEP 8 TEST PASS: Read-only adapter returned booking data.'
  );

  return before;
}
