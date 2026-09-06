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

function runEDBStep8AdapterTest() {

  var bookingId = 'IFFG-EDB-00011';

  var context = getB7BookingDataContext();

  var sheet = context.responseSheet;
  var headers = context.headers;

  Logger.log('BOOKING ID BEING TESTED: [' + bookingId + ']');
  Logger.log('RESPONSE SHEET: ' + sheet.getName());
  Logger.log('LAST ROW: ' + sheet.getLastRow());
  Logger.log('LAST COLUMN: ' + sheet.getLastColumn());

  var bookingIdIndex = headers.findIndex(function(header) {
    return String(header || '').trim().toLowerCase() === 'booking id';
  });

  Logger.log('BOOKING ID COLUMN INDEX: ' + bookingIdIndex);

  if (bookingIdIndex < 0) {
    throw new Error('Booking ID column not found.');
  }

  var values = sheet.getRange(
    2,
    1,
    sheet.getLastRow() - 1,
    sheet.getLastColumn()
  ).getValues();

  var found = false;

  for (var i = 0; i < values.length; i++) {

    var actual = String(
      values[i][bookingIdIndex] || ''
    ).trim();

    if (actual === bookingId) {

      Logger.log(
        'FOUND at row ' +
        (i + 2) +
        ' : [' +
        actual +
        ']'
      );

      found = true;
      break;
    }
  }

  if (!found) {
    Logger.log(
      'BOOKING ID NOT FOUND IN RESPONSE SHEET: [' +
      bookingId +
      ']'
    );
  }

  return {
    testedBookingId: bookingId,
    responseSheet: sheet.getName(),
    bookingIdColumnIndex: bookingIdIndex,
    found: found
  };
}