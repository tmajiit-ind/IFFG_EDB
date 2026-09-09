/*
 * IFFG EDB - RESPONSE SHEET SCHEMA CONTRACT TEST
 *
 * Purpose:
 *   Enforce the settled physical mapping while keeping application
 *   lookups header-driven.
 *
 * Confirmed physical mapping:
 *   N  = Email Address
 *   O  = Booking ID
 *   P  = Media File Name
 *   AM = WhatsApp - FM/Accounts Notification
 *
 * Important:
 *   The test verifies the known physical mapping, but production and
 *   development code must resolve fields by header name rather than
 *   relying on these positions.
 *
 * Run:
 *   runEDBResponseSchemaContractTest()
 *
 * Safety:
 *   READ ONLY. No sheet writes. No trigger installation.
 */

function runEDBResponseSchemaContractTest() {

  var ss = getEDBSpreadsheet();
  var sheet = getEDBResponseSheet(ss);

  if (!sheet) {
    throw new Error(
      'Schema contract test failed: authoritative Response Sheet not found.'
    );
  }

  var lastColumn = Math.max(sheet.getLastColumn(), 1);
  var headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];

  function normalise(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/\\s+/g, ' ');
  }

  function headerAt(columnNumber) {
    return String(headers[columnNumber - 1] || '').trim();
  }

  function findHeader(name) {
    var target = normalise(name);
    for (var i = 0; i < headers.length; i++) {
      if (normalise(headers[i]) === target) {
        return i + 1;
      }
    }
    return 0;
  }

  var checks = [
    ['Response Sheet resolved', !!sheet, sheet.getName()],
    ['Response Sheet width is 39 columns', lastColumn === 39, String(lastColumn)],
    ['N is Email Address', headerAt(14) === 'Email Address', headerAt(14)],
    ['O is Booking ID', headerAt(15) === 'Booking ID', headerAt(15)],
    ['P is Media File Name', headerAt(16) === 'Media File Name', headerAt(16)],
    ['AM is WhatsApp - FM/Accounts Notification', headerAt(39) === 'WhatsApp - FM/Accounts Notification', headerAt(39)],
    ['Booking ID resolves by header to O', findHeader('Booking ID') === 15, String(findHeader('Booking ID'))],
    ['Email Address resolves by header to N', findHeader('Email Address') === 14, String(findHeader('Email Address'))],
    ['Media File Name resolves by header to P', findHeader('Media File Name') === 16, String(findHeader('Media File Name'))],
    ['WhatsApp notification resolves by header to AM', findHeader('WhatsApp - FM/Accounts Notification') === 39, String(findHeader('WhatsApp - FM/Accounts Notification'))]
  ];

  var failures = [];

  checks.forEach(function(check) {
    if (check[1]) {
      console.log('PASS | ' + check[0] + ' | ' + check[2]);
    } else {
      console.log('FAIL | ' + check[0] + ' | ' + check[2]);
      failures.push(check[0]);
    }
  });

  if (typeof getEDBHeaderMap === 'function') {
    var headerMap = getEDBHeaderMap(sheet);
    var bookingMapIndex = headerMap[normalise('Booking ID')];

    if (bookingMapIndex === 14) {
      console.log('PASS | getEDBHeaderMap Booking ID zero-based index | 14');
    } else {
      console.log('FAIL | getEDBHeaderMap Booking ID zero-based index | ' + bookingMapIndex);
      failures.push('getEDBHeaderMap Booking ID zero-based index');
    }
  } else {
    console.log('WARN | getEDBHeaderMap | unavailable');
  }

  if (failures.length) {
    throw new Error(
      'Response schema contract FAILED: ' + failures.join('; ')
    );
  }

  console.log('============================================================');
  console.log('RESPONSE SCHEMA CONTRACT PASS');
  console.log('N = Email Address | O = Booking ID | P = Media File Name | AM = WhatsApp notification');
  console.log('Application lookup remains header-driven.');
  console.log('READ ONLY - NO DATA CHANGES');
  console.log('============================================================');

  return {
    status: 'PASS',
    readOnly: true,
    bookingIdColumn: 15,
    emailColumn: 14,
    mediaFileNameColumn: 16,
    whatsappNotificationColumn: 39
  };
}
