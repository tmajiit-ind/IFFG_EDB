/* ============================================================
   IFFG EDB - STEP 8 SERVICE ADAPTER TEST
   READ ONLY
   ============================================================ */

function runEDBStep8AdapterTest() {

  var bookingId = 'IFFG-EDB-00011';

  Logger.log(
    'STEP 8 TEST START: ' + bookingId
  );

  var before =
    getEDBBookingForNewUI(bookingId);

  if (!before) {
    throw new Error(
      'STEP 8 TEST FAILED: No result returned.'
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
    'STEP 8 TEST PASS: Read-only adapter returned booking data.'
  );

  return before;
}
