/**
 * IFFG EDB - SCREEN 2 CORRECTED DATA REGRESSION V2
 * READ-ONLY against Production. Report goes to Test Lab only.
 */

var EDB_PROD_ID_SCREEN2_V2 =
  '1hHdFRgj1YnBqQATLd94iEGuRDqxOIsQEd8w1DKmYQfQ';

var EDB_PROD_BOOKINGS_SCREEN2_V2 = [
  'IFFG-EDB-00009',
  'IFFG-EDB-00011'
];


function normaliseHeaderS2V2_(value) {
  return String(value == null ? '' : value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function runEDBScreen2CorrectedRegressionV2() {
  var started = new Date();
  var results = [];

  try {
    var ss = SpreadsheetApp.openById(EDB_PROD_ID_SCREEN2_V2);
    var sheet = ss.getSheetByName('Form Responses 1');

    addS2V2_(results, 'Production response sheet',
      !!sheet, sheet ? 'Found' : 'NOT FOUND');

    if (!sheet) {
      writeS2V2Report_(results, started);
      return results;
    }

    var lastColumn = Math.max(sheet.getLastColumn(), 1);
    var headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];

    addS2V2_(results, 'Production schema',
      headers.length === 39,
      'Columns=' + headers.length + '; expected=39');

    addS2V2_(results, 'Email Address at N',
      normaliseHeaderS2V2_(headers[13]) === 'emailaddress',
      'N1=[' + headers[13] + ']');

    addS2V2_(results, 'Booking ID at O',
      normaliseHeaderS2V2_(headers[14]) === 'bookingid',
      'O1=[' + headers[14] + ']');

    var before = JSON.stringify(sheet.getDataRange().getValues());

    EDB_PROD_BOOKINGS_SCREEN2_V2.forEach(function(id) {
      testS2BookingV2_(results, id);
    });

    addS2V2_(results, 'showEDBBookingDetailLive available',
      typeof showEDBBookingDetailLive === 'function',
      'Type=' + typeof showEDBBookingDetailLive);

    var after = JSON.stringify(sheet.getDataRange().getValues());

    addS2V2_(results, 'Production data unchanged',
      before === after,
      before === after
        ? 'No Production cell values changed.'
        : 'WARNING: Production data changed.');

  } catch (e) {
    addS2V2_(results, 'Suite execution', false,
      String(e && e.stack ? e.stack : e));
  }

  var failures = results.filter(function(r) {
    return r[1] === 'FAIL';
  }).length;

  results.push([
    'OVERALL',
    failures === 0 ? 'PASS' : 'FAIL',
    'FAIL rows=' + failures
  ]);

  writeS2V2Report_(results, started);
  return results;
}

function testS2BookingV2_(results, id) {
  var model;

  try {
    model = getEDBBookingForNewUI(id);
  } catch (e) {
    addS2V2_(results, id + ' adapter', false,
      String(e && e.stack ? e.stack : e));
    return;
  }

  var ok = model && typeof model === 'object';

  addS2V2_(results, id + ' model returned', ok,
    ok ? 'Object returned.' : 'null/undefined');

  if (!ok) return;

  addS2V2_(results, id + ' Booking ID',
    String(model.bookingId || '').trim() === id,
    'bookingId=' + model.bookingId);

  addS2V2_(results, id + ' Flat',
    String(model.flat || '').trim() !== '',
    'flat=' + model.flat);

  addS2V2_(results, id + ' Resident',
    String(model.resident || '').trim() !== '',
    'resident=' + model.resident);

  addS2V2_(results, id + ' Content field type',
    typeof model.content === 'string' ||
    model.content === null ||
    model.content === undefined,
    'content type=' + typeof model.content +
    '; value=[' + String(model.content || '') + ']');

  addS2V2_(results, id + ' Payment field',
    typeof model.payment === 'string' ||
    typeof model.payment === 'number' ||
    model.payment === null ||
    model.payment === undefined,
    'payment=' + String(model.payment || ''));

  addS2V2_(results, id + ' Lifecycle field',
    typeof model.lifecycle === 'string',
    'lifecycle=' + model.lifecycle);

  addS2V2_(results, id + ' Display Start field',
    typeof model.displayStart === 'string' ||
    model.displayStart === null ||
    model.displayStart === undefined,
    'displayStart=' + String(model.displayStart || ''));

  addS2V2_(results, id + ' Display End field',
    typeof model.displayEnd === 'string' ||
    model.displayEnd === null ||
    model.displayEnd === undefined,
    'displayEnd=' + String(model.displayEnd || ''));

  [
    'bookingId',
    'rowNumber',
    'flat',
    'resident',
    'content',
    'payment',
    'displayStart',
    'displayEnd',
    'lifecycle'
  ].forEach(function(field) {
    addS2V2_(results, id + ' model field: ' + field,
      Object.prototype.hasOwnProperty.call(model, field),
      Object.prototype.hasOwnProperty.call(model, field)
        ? 'Present'
        : 'MISSING');
  });

  verifyS2SourceRowV2_(results, id);
}

function verifyS2SourceRowV2_(results, id) {
  try {
    var ss = SpreadsheetApp.openById(EDB_PROD_ID_SCREEN2_V2);
    var sheet = ss.getSheetByName('Form Responses 1');
    var data = sheet.getDataRange().getValues();
    var bookingIndex = 14;
    var sourceRow = null;

    for (var r = 1; r < data.length; r++) {
      if (String(data[r][bookingIndex] || '').trim() === id) {
        sourceRow = data[r];
        break;
      }
    }

    addS2V2_(results, id + ' source row found',
      !!sourceRow,
      sourceRow ? 'Found in column O.' : 'NOT FOUND');

    if (!sourceRow) return;

    [
      ['Media File Name', 15],
      ['Media Drive Link', 18],
      ['Media Validation', 19],
      ['Payment Status', 24],
      ['Payment UTR / Reference', 25],
      ['Approval Status', 26],
      ['Display Status', 29]
    ].forEach(function(check) {
      var label = check[0];
      var index = check[1];
      var value = sourceRow[index];

      addS2V2_(results, id + ' source ' + label,
        value !== null &&
        value !== undefined &&
        String(value).trim() !== '',
        label + '=' + String(value || ''));
    });

  } catch (e) {
    addS2V2_(results, id + ' source-row inspection', false,
      String(e && e.stack ? e.stack : e));
  }
}

function addS2V2_(results, test, passed, detail) {
  results.push([
    test,
    passed ? 'PASS' : 'FAIL',
    detail
  ]);
}

function writeS2V2Report_(results, started) {
  var lab = SpreadsheetApp.openById(
    '1ixlMDeAEUu2bpKL-Bnp9iNlniM_VxSNrRFi1CurcwuM'
  );

  var report = lab.getSheetByName(
    'EDB_SCREEN2_CORRECTED_TEST'
  );

  if (!report) {
    report = lab.insertSheet(
      'EDB_SCREEN2_CORRECTED_TEST'
    );
  } else {
    report.clearContents();
  }

  var rows = [
    ['IFFG EDB - SCREEN 2 CORRECTED DATA REGRESSION V2', '', ''],
    ['Run started', started, ''],
    ['Run completed', new Date(), ''],
    ['', '', ''],
    ['TEST', 'RESULT', 'DETAIL']
  ].concat(results);

  report.getRange(
    1, 1, rows.length, 3
  ).setValues(rows);

  report.setFrozenRows(5);
  report.autoResizeColumns(1, 3);
}