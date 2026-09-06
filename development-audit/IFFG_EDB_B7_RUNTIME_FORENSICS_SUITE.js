/**
 * IFFG EDB - B7 Runtime Forensics Test Suite
 *
 * PURPOSE
 * -------
 * Investigate the discrepancy:
 *
 *   REAL ID  -> getB7SelectedBooking() returns null
 *   INVALID  -> getB7SelectedBooking() unexpectedly returns an object
 *
 * This suite tests the ACTUAL runtime data and several input variants.
 *
 * SAFETY
 * ------
 * READ ONLY.
 * Never calls:
 *   showEDBBookingDetailLive()
 *   approve/reject
 *   payment
 *   WhatsApp
 *   scheduling
 *
 * RUN:
 *   runEDBB7RuntimeForensicsSuite()
 *
 * RESULT:
 *   EDB_B7_RUNTIME_FORENSICS
 */

function runEDBB7RuntimeForensicsSuite() {

  const ss = SpreadsheetApp.openById(
    '1hHdFRgj1YnBqQATLd94iEGuRDqxOIsQEd8w1DKmYQfQ'
  );

  const report =
    getEDBRuntimeForensicsSheet_(ss);

  const started = new Date();

  const rows = [
    ['SECTION', 'TEST', 'RESULT', 'DETAIL']
  ];

  function add(section, test, result, detail) {
    rows.push([
      section,
      test,
      result,
      detail == null ? '' : String(detail)
    ]);
  }

  function safeCall(fn) {
    try {
      return {
        ok: true,
        value: fn()
      };
    } catch (err) {
      return {
        ok: false,
        error: String(err && err.message || err)
      };
    }
  }

  // ============================================================
  // 1. FUNCTION AVAILABILITY
  // ============================================================

  [
    'getB7BookingDataContext',
    'getB7SelectedBooking',
    'getEDBBookingForNewUI',
    'showEDBBookingDetailLive'
  ].forEach(function(name) {

    const available =
      typeof globalThis[name] === 'function';

    add(
      'FUNCTION',
      name,
      available ? 'PASS' : 'FAIL',
      available ? 'available' : 'missing'
    );
  });


  // ============================================================
  // 2. RESPONSE SHEET
  // ============================================================

  const responseSheet =
    ss.getSheetByName('Form Responses 1');

  add(
    'SHEET',
    'Form Responses 1',
    responseSheet ? 'PASS' : 'FAIL',
    responseSheet
      ? 'id=' + responseSheet.getSheetId()
      : 'not found'
  );

  if (!responseSheet) {

    add(
      'OVERALL',
      'Suite',
      'STOP',
      'Form Responses 1 not found'
    );

    writeEDBRuntimeForensics_(
      report,
      rows,
      started
    );

    return;
  }


  // ============================================================
  // 3. LIVE SHEET DIMENSIONS + HEADERS
  // ============================================================

  const lastRow =
    responseSheet.getLastRow();

  const lastColumn =
    responseSheet.getLastColumn();

  add(
    'SHEET',
    'Live dimensions',
    lastColumn > 0 ? 'PASS' : 'FAIL',
    lastRow + ' rows x ' +
    lastColumn + ' columns'
  );

  if (lastColumn < 1) {

    add(
      'OVERALL',
      'Suite',
      'STOP',
      'Response sheet has no columns'
    );

    writeEDBRuntimeForensics_(
      report,
      rows,
      started
    );

    return;
  }

  const headerValues =
    responseSheet
      .getRange(
        1,
        1,
        1,
        lastColumn
      )
      .getValues()[0];

  let bookingCol = -1;

  headerValues.forEach(function(header, i) {

    const normalized =
      String(header || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');

    if (
      normalized === 'booking id' ||
      normalized === 'bookingid'
    ) {
      bookingCol = i;
    }
  });

  add(
    'RAW DATA',
    'Booking ID column',
    bookingCol >= 0 ? 'PASS' : 'FAIL',
    bookingCol >= 0
      ? columnLetterForensics_(bookingCol + 1) +
        ' / zero-based index ' +
        bookingCol
      : 'not found'
  );

  if (bookingCol < 0) {

    writeEDBRuntimeForensics_(
      report,
      rows,
      started
    );

    return;
  }


  // ============================================================
  // 4. LIVE BOOKING RECORDS
  // ============================================================

  const dataValues =
    lastRow >= 2
      ? responseSheet
          .getRange(
            2,
            1,
            lastRow - 1,
            lastColumn
          )
          .getValues()
      : [];

  const realIds = [];

  for (let i = 0; i < dataValues.length; i++) {

    const raw =
      dataValues[i][bookingCol];

    const id =
      String(raw == null ? '' : raw).trim();

    if (!id) continue;

    realIds.push({
      row: i + 2,
      id: id,
      raw: raw
    });

    add(
      'RAW DATA',
      'Booking ID row ' + (i + 2),
      'INFO',
      'raw=[' + String(raw) +
      '], trimmed=[' + id + ']'
    );
  }

  add(
    'RAW DATA',
    'Real Booking ID count',
    realIds.length >= 1 ? 'PASS' : 'FAIL',
    'count=' + realIds.length
  );


  // ============================================================
  // 5. B7 CONTEXT
  // ============================================================

  let context = null;

  const contextCall =
    safeCall(function() {
      return getB7BookingDataContext();
    });

  if (!contextCall.ok) {

    add(
      'B7 CONTEXT',
      'getB7BookingDataContext()',
      'FAIL',
      contextCall.error
    );

  } else {

    context = contextCall.value;

    add(
      'B7 CONTEXT',
      'getB7BookingDataContext()',
      context ? 'PASS' : 'FAIL',
      context ? 'object returned' : 'null/undefined'
    );
  }

  if (!context) {

    add(
      'OVERALL',
      'Suite',
      'STOP',
      'B7 context unavailable'
    );

    writeEDBRuntimeForensics_(
      report,
      rows,
      started
    );

    return;
  }


  // ============================================================
  // 6. CONTEXT FORENSICS
  // ============================================================

  add(
    'B7 CONTEXT',
    'Context keys',
    'INFO',
    Object.keys(context).join(', ')
  );

  if (context.responseSheet) {

    add(
      'B7 CONTEXT',
      'Context responseSheet',
      'PASS',
      describeSheetForensics_(
        context.responseSheet
      )
    );

    add(
      'B7 CONTEXT',
      'Context sheet equals live sheet',
      context.responseSheet.getSheetId() ===
      responseSheet.getSheetId()
        ? 'PASS'
        : 'FAIL',
      'context=' +
      context.responseSheet.getSheetId() +
      '; live=' +
      responseSheet.getSheetId()
    );

  } else {

    add(
      'B7 CONTEXT',
      'Context responseSheet',
      'FAIL',
      'missing'
    );
  }

  const contextHeaders =
    Array.isArray(context.headers)
      ? context.headers
      : [];

  const contextBookingIndex =
    contextHeaders.findIndex(
      function(h) {
        return String(h || '')
          .trim()
          .toLowerCase()
          .replace(/\s+/g, ' ') ===
          'booking id';
      }
    );

  add(
    'B7 CONTEXT',
    'Context headers',
    Array.isArray(context.headers)
      ? 'PASS'
      : 'FAIL',
    Array.isArray(context.headers)
      ? 'count=' +
        contextHeaders.length +
        '; Booking ID index=' +
        contextBookingIndex
      : 'not an array'
  );

  add(
    'CROSS CHECK',
    'Live vs context header count',
    contextHeaders.length === lastColumn
      ? 'PASS'
      : 'INFO',
    'live=' +
    lastColumn +
    '; context=' +
    contextHeaders.length
  );

  add(
    'CROSS CHECK',
    'Live vs context Booking ID index',
    contextBookingIndex === bookingCol
      ? 'PASS'
      : 'INFO',
    'live=' +
    bookingCol +
    '; context=' +
    contextBookingIndex
  );


  // ============================================================
  // 7. DIRECT LIVE DATA MATCH
  // ============================================================

  realIds.forEach(function(item) {

    let exact = 0;

    for (let i = 0; i < dataValues.length; i++) {

      const value =
        String(
          dataValues[i][bookingCol] == null
            ? ''
            : dataValues[i][bookingCol]
        ).trim();

      if (value === item.id) {
        exact++;
      }
    }

    add(
      'MATCH',
      item.id + ' exact live match',
      exact === 1 ? 'PASS' : 'FAIL',
      'matches=' + exact
    );
  });


  // ============================================================
  // 8. DIRECT getB7SelectedBooking()
  // ============================================================

  const selectedCases = [];

  realIds.forEach(function(item) {

    selectedCases.push({
      label: 'REAL exact ' + item.id,
      value: item.id,
      expected: 'FOUND'
    });

    selectedCases.push({
      label: 'REAL padded ' + item.id,
      value: '  ' + item.id + '  ',
      expected: 'FOUND'
    });

    selectedCases.push({
      label: 'REAL lower-case ' + item.id,
      value: item.id.toLowerCase(),
      expected: 'NOT_FOUND'
    });
  });

  selectedCases.push({
    label: 'INVALID',
    value: '__EDB_FORENSICS_INVALID__',
    expected: 'NOT_FOUND'
  });

  selectedCases.push({
    label: 'BLANK',
    value: '',
    expected: 'NOT_FOUND'
  });

  selectedCases.forEach(function(testCase) {

    const call =
      safeCall(function() {
        return getB7SelectedBooking(
          context,
          testCase.value
        );
      });

    if (!call.ok) {

      add(
        'B7 LOOKUP',
        testCase.label,
        testCase.expected === 'NOT_FOUND'
          ? 'FAIL'
          : 'FAIL',
        'THREW: ' + call.error
      );

      return;
    }

    const result = call.value;

    const found =
      result !== null &&
      result !== undefined;

    const expectedFound =
      testCase.expected === 'FOUND';

    const correct =
      found === expectedFound;

    add(
      'B7 LOOKUP',
      testCase.label,
      correct ? 'PASS' : 'FAIL',
      found
        ? describeEDBResultForensics_(result)
        : 'null/undefined'
    );

    // ----------------------------------------------------------
    // Returned-object integrity for successful real lookups
    // ----------------------------------------------------------

    if (expectedFound && found) {

      const returnedHeaders =
        Array.isArray(result.headers)
          ? result.headers
          : [];

      const returnedValues =
        Array.isArray(result.values)
          ? result.values
          : [];

      add(
        'B7 RESULT',
        testCase.label + ' headers',
        returnedHeaders.length === lastColumn
          ? 'PASS'
          : 'FAIL',
        'returned=' +
        returnedHeaders.length +
        '; live=' +
        lastColumn
      );

      add(
        'B7 RESULT',
        testCase.label + ' values',
        returnedValues.length === lastColumn
          ? 'PASS'
          : 'FAIL',
        'returned=' +
        returnedValues.length +
        '; live=' +
        lastColumn
      );

      const returnedBookingIndex =
        returnedHeaders.findIndex(
          function(h) {
            return String(h || '')
              .trim()
              .toLowerCase()
              .replace(/\s+/g, ' ') ===
              'booking id';
          }
        );

      add(
        'B7 RESULT',
        testCase.label + ' Booking ID index',
        returnedBookingIndex === bookingCol
          ? 'PASS'
          : 'FAIL',
        'returned=' +
        returnedBookingIndex +
        '; expected=' +
        bookingCol
      );

      const returnedId =
        returnedBookingIndex >= 0 &&
        returnedValues.length > returnedBookingIndex
          ? String(
              returnedValues[
                returnedBookingIndex
              ] == null
                ? ''
                : returnedValues[
                    returnedBookingIndex
                  ]
            ).trim()
          : '';

      add(
        'B7 RESULT',
        testCase.label + ' returned Booking ID',
        returnedId === itemIdFromLabel_(testCase.label)
          ? 'PASS'
          : 'FAIL',
        'returned=[' + returnedId + ']'
      );
    }
  });


  // ============================================================
  // 9. ADAPTER getEDBBookingForNewUI()
  // ============================================================

  realIds.forEach(function(item) {

    const call =
      safeCall(function() {
        return getEDBBookingForNewUI(
          item.id
        );
      });

    if (!call.ok) {

      add(
        'ADAPTER',
        item.id,
        'FAIL',
        call.error
      );

      return;
    }

    const result =
      call.value;

    const found =
      result !== null &&
      result !== undefined;

    add(
      'ADAPTER',
      item.id,
      found ? 'PASS' : 'FAIL',
      found
        ? describeEDBResultForensics_(result)
        : 'null/undefined'
    );

    if (found) {

      const adapterBookingId =
        result.bookingId == null
          ? ''
          : String(result.bookingId).trim();

      if (adapterBookingId) {

        add(
          'ADAPTER',
          item.id + ' returned Booking ID',
          adapterBookingId === item.id
            ? 'PASS'
            : 'FAIL',
          'returned=[' +
          adapterBookingId +
          ']'
        );
      }
    }
  });


  // ============================================================
  // 10. ADAPTER INVALID / BLANK
  // ============================================================

  [
    {
      label: 'INVALID',
      value: '__EDB_FORENSICS_INVALID__'
    },
    {
      label: 'BLANK',
      value: ''
    }
  ].forEach(function(testCase) {

    const call =
      safeCall(function() {
        return getEDBBookingForNewUI(
          testCase.value
        );
      });

    if (!call.ok) {

      add(
        'ADAPTER',
        testCase.label,
        'PASS',
        'Rejected: ' + call.error
      );

      return;
    }

    const found =
      call.value !== null &&
      call.value !== undefined;

    add(
      'ADAPTER',
      testCase.label,
      found ? 'FAIL' : 'PASS',
      found
        ? 'Unexpected booking returned'
        : 'null/undefined'
    );
  });


  // ============================================================
  // 11. EXPLICIT SAFETY BOUNDARY
  // ============================================================

  add(
    'SAFETY',
    'Booking writes',
    'NOT RUN',
    'No booking writes invoked'
  );

  add(
    'SAFETY',
    'Approval / rejection',
    'NOT RUN',
    'No approval/rejection invoked'
  );

  add(
    'SAFETY',
    'Payment / WhatsApp',
    'NOT RUN',
    'No payment/WhatsApp invoked'
  );

  add(
    'SAFETY',
    'Scheduling',
    'NOT RUN',
    'No scheduling invoked'
  );

  add(
    'SAFETY',
    'showEDBBookingDetailLive',
    'NOT RUN',
    'Screen 2 rendering deliberately excluded'
  );


  // ============================================================
  // 12. OVERALL
  // ============================================================

  const failures =
    rows.filter(function(row) {
      return row[2] === 'FAIL';
    }).length;

  add(
    'OVERALL',
    'B7 runtime regression suite',
    failures === 0 ? 'PASS' : 'FAIL',
    'FAIL rows=' + failures +
    '; real bookings=' + realIds.length +
    '; read-only suite'
  );


  writeEDBRuntimeForensics_(
    report,
    rows,
    started
  );
}


function itemIdFromLabel_(label) {

  const match =
    String(label || '').match(
      /(?:REAL exact|REAL padded|REAL lower-case)\s+(.+)$/
    );

  return match
    ? String(match[1]).trim()
    : '';
}


function describeSheetForensics_(sheet) {

  if (!sheet) return 'null';

  try {

    return 'name=' +
      sheet.getName() +
      '; id=' +
      sheet.getSheetId() +
      '; rows=' +
      sheet.getLastRow() +
      '; cols=' +
      sheet.getLastColumn();

  } catch (err) {

    return 'sheet object present but inaccessible';
  }
}


function describeEDBResultForensics_(result) {

  if (!result) return 'null';

  if (typeof result !== 'object') {
    return typeof result +
      ': ' +
      String(result);
  }

  const keys =
    Object.keys(result);

  const important = [];

  [
    'bookingId',
    'rowNumber',
    'flat',
    'resident',
    'payment',
    'lifecycle'
  ].forEach(function(key) {

    if (result[key] !== undefined) {

      important.push(
        key + '=' +
        String(result[key])
      );
    }
  });

  return 'keys=[' +
    keys.slice(0, 30).join(', ') +
    ']' +
    (
      important.length
        ? '; ' + important.join('; ')
        : ''
    );
}


function columnLetterForensics_(column) {

  let result = '';
  let n = column;

  while (n > 0) {

    const rem = (n - 1) % 26;

    result =
      String.fromCharCode(
        65 + rem
      ) + result;

    n =
      Math.floor(
        (n - 1) / 26
      );
  }

  return result;
}


function getEDBRuntimeForensicsSheet_(ss) {

  const name =
    'EDB_B7_RUNTIME_FORENSICS';

  let sheet =
    ss.getSheetByName(name);

  if (!sheet) {
    sheet = ss.insertSheet(name);
  }

  return sheet;
}


function writeEDBRuntimeForensics_(
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
      4
    )
    .setValues(rows);

  sheet
    .getRange(
      1,
      1,
      1,
      4
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

  sheet.autoResizeColumns(1, 4);
}

function testB7ResponseSheetResolver() {

  const ss = SpreadsheetApp.openById(
    '1hHdFRgj1YnBqQATLd94iEGuRDqxOIsQEd8w1DKmYQfQ'
  );

  const sheets = ss.getSheets();

  const output = [
    ['SHEET NAME', 'SHEET ID', 'ROWS', 'COLUMNS', 'HAS TIMESTAMP', 'BOOKING ID COLUMN']
  ];

  for (let i = 0; i < sheets.length; i++) {

    const sheet = sheets[i];

    const lastColumn =
      Math.max(sheet.getLastColumn(), 1);

    const headers =
      sheet
        .getRange(
          1,
          1,
          1,
          lastColumn
        )
        .getValues()[0];

    const hasTimestamp =
      headers.some(function(header) {
        return normaliseHeader(header) === 'timestamp';
      });

    const bookingIdIndex =
      headers.findIndex(function(header) {
        return String(header || '')
          .trim()
          .toLowerCase() === 'booking id';
      });

    output.push([
      sheet.getName(),
      sheet.getSheetId(),
      sheet.getLastRow(),
      sheet.getLastColumn(),
      hasTimestamp ? 'YES' : 'NO',
      bookingIdIndex >= 0
        ? columnLetterForensics_(bookingIdIndex + 1) +
          ' / index ' +
          bookingIdIndex
        : 'NOT FOUND'
    ]);
  }

  Logger.log(output);

  const name = 'EDB_B7_RESOLVER_CHECK';

  let report =
    ss.getSheetByName(name);

  if (!report) {
    report = ss.insertSheet(name);
  }

  report.clearContents();

  report
    .getRange(
      1,
      1,
      output.length,
      output[0].length
    )
    .setValues(output);

  report
    .getRange(1, 1, 1, output[0].length)
    .setFontWeight('bold');

  report.autoResizeColumns(
    1,
    output[0].length
  );
}
function testB7DirectFunctionPath() {

  const ss = SpreadsheetApp.openById(
    '1hHdFRgj1YnBqQATLd94iEGuRDqxOIsQEd8w1DKmYQfQ'
  );

  const sheet =
    ss.getSheetByName('Form Responses 1');

  const ids = [
    'IFFG-EDB-00009',
    'IFFG-EDB-00011'
  ];

  const output = [
    ['TEST', 'RESULT', 'DETAIL']
  ];

  // --------------------------------------------------
  // 1. DIRECT SHEET
  // --------------------------------------------------

  const directLastRow =
    sheet.getLastRow();

  const directLastColumn =
    sheet.getLastColumn();

  const directHeaders =
    sheet
      .getRange(
        1,
        1,
        1,
        directLastColumn
      )
      .getValues()[0];

  const directBookingIndex =
    directHeaders.findIndex(function(header) {
      return String(header || '')
        .trim()
        .toLowerCase() === 'booking id';
    });

  output.push([
    'DIRECT SHEET',
    directBookingIndex === 14
      ? 'PASS'
      : 'FAIL',
    'name=' +
      sheet.getName() +
      '; id=' +
      sheet.getSheetId() +
      '; rows=' +
      directLastRow +
      '; cols=' +
      directLastColumn +
      '; bookingIndex=' +
      directBookingIndex
  ]);

  // --------------------------------------------------
  // 2. DIRECT VALUES
  // --------------------------------------------------

  const directValues =
    sheet
      .getRange(
        2,
        1,
        Math.max(directLastRow - 1, 1),
        directLastColumn
      )
      .getValues();

  for (let x = 0; x < ids.length; x++) {

    const id = ids[x];

    let foundRow = -1;
    let foundValue = '';

    for (
      let r = 0;
      r < directValues.length;
      r++
    ) {

      const value =
        String(
          directValues[r][directBookingIndex] || ''
        ).trim();

      if (value === id) {
        foundRow = r + 2;
        foundValue = value;
        break;
      }
    }

    output.push([
      'DIRECT ID ' + id,
      foundRow > 0 ? 'PASS' : 'FAIL',
      'row=' +
        foundRow +
        '; value=[' +
        foundValue +
        ']'
    ]);
  }

  // --------------------------------------------------
  // 3. BUILD B7 CONTEXT
  // --------------------------------------------------

  const context =
    getB7BookingDataContext(ss);

  output.push([
    'B7 CONTEXT SHEET',
    context.responseSheet.getSheetId() ===
      sheet.getSheetId()
      ? 'PASS'
      : 'FAIL',
    'name=' +
      context.responseSheet.getName() +
      '; id=' +
      context.responseSheet.getSheetId() +
      '; cols=' +
      context.responseSheet.getLastColumn()
  ]);

  // --------------------------------------------------
  // 4. CALL B7 FUNCTION DIRECTLY
  // --------------------------------------------------

  for (let x = 0; x < ids.length; x++) {

    const id = ids[x];

    try {

      const result =
        getB7SelectedBooking(
          context,
          id
        );

      output.push([
        'B7 FUNCTION ' + id,
        result ? 'PASS' : 'FAIL',
        result
          ? 'row=' +
            result.rowNumber +
            '; values=' +
            result.values.length +
            '; headers=' +
            result.headers.length +
            '; returnedID=[' +
            String(
              result.values[14] || ''
            ) +
            ']'
          : 'returned null'
      ]);

    } catch (err) {

      output.push([
        'B7 FUNCTION ' + id,
        'THREW',
        String(err.message || err)
      ]);
    }
  }

  // --------------------------------------------------
  // 5. WRITE REPORT
  // --------------------------------------------------

  const reportName =
    'EDB_B7_DIRECT_FUNCTION_PATH';

  let report =
    ss.getSheetByName(reportName);

  if (!report) {
    report =
      ss.insertSheet(reportName);
  }

  report.clearContents();

  report
    .getRange(
      1,
      1,
      output.length,
      output[0].length
    )
    .setValues(output);

  report
    .getRange(
      1,
      1,
      1,
      output[0].length
    )
    .setFontWeight('bold');

  report.autoResizeColumns(
    1,
    output[0].length
  );

  Logger.log(output);
}

function testB7DirectFunctionPath() {

  const ss = SpreadsheetApp.openById(
    '1hHdFRgj1YnBqQATLd94iEGuRDqxOIsQEd8w1DKmYQfQ'
  );

  const sheet =
    ss.getSheetByName('Form Responses 1');

  const ids = [
    'IFFG-EDB-00009',
    'IFFG-EDB-00011'
  ];

  const output = [
    ['TEST', 'RESULT', 'DETAIL']
  ];

  // --------------------------------------------------
  // 1. DIRECT SHEET
  // --------------------------------------------------

  const directLastRow =
    sheet.getLastRow();

  const directLastColumn =
    sheet.getLastColumn();

  const directHeaders =
    sheet
      .getRange(
        1,
        1,
        1,
        directLastColumn
      )
      .getValues()[0];

  const directBookingIndex =
    directHeaders.findIndex(function(header) {
      return String(header || '')
        .trim()
        .toLowerCase() === 'booking id';
    });

  output.push([
    'DIRECT SHEET',
    directBookingIndex === 14
      ? 'PASS'
      : 'FAIL',
    'name=' +
      sheet.getName() +
      '; id=' +
      sheet.getSheetId() +
      '; rows=' +
      directLastRow +
      '; cols=' +
      directLastColumn +
      '; bookingIndex=' +
      directBookingIndex
  ]);

  // --------------------------------------------------
  // 2. DIRECT VALUES
  // --------------------------------------------------

  const directValues =
    sheet
      .getRange(
        2,
        1,
        Math.max(directLastRow - 1, 1),
        directLastColumn
      )
      .getValues();

  for (let x = 0; x < ids.length; x++) {

    const id = ids[x];

    let foundRow = -1;
    let foundValue = '';

    for (
      let r = 0;
      r < directValues.length;
      r++
    ) {

      const value =
        String(
          directValues[r][directBookingIndex] || ''
        ).trim();

      if (value === id) {
        foundRow = r + 2;
        foundValue = value;
        break;
      }
    }

    output.push([
      'DIRECT ID ' + id,
      foundRow > 0 ? 'PASS' : 'FAIL',
      'row=' +
        foundRow +
        '; value=[' +
        foundValue +
        ']'
    ]);
  }

  // --------------------------------------------------
  // 3. BUILD B7 CONTEXT
  // --------------------------------------------------

  const context =
    getB7BookingDataContext(ss);

  output.push([
    'B7 CONTEXT SHEET',
    context.responseSheet.getSheetId() ===
      sheet.getSheetId()
      ? 'PASS'
      : 'FAIL',
    'name=' +
      context.responseSheet.getName() +
      '; id=' +
      context.responseSheet.getSheetId() +
      '; cols=' +
      context.responseSheet.getLastColumn()
  ]);

  // --------------------------------------------------
  // 4. CALL B7 FUNCTION DIRECTLY
  // --------------------------------------------------

  for (let x = 0; x < ids.length; x++) {

    const id = ids[x];

    try {

      const result =
        getB7SelectedBooking(
          context,
          id
        );

      output.push([
        'B7 FUNCTION ' + id,
        result ? 'PASS' : 'FAIL',
        result
          ? 'row=' +
            result.rowNumber +
            '; values=' +
            result.values.length +
            '; headers=' +
            result.headers.length +
            '; returnedID=[' +
            String(
              result.values[14] || ''
            ) +
            ']'
          : 'returned null'
      ]);

    } catch (err) {

      output.push([
        'B7 FUNCTION ' + id,
        'THREW',
        String(err.message || err)
      ]);
    }
  }

  // --------------------------------------------------
  // 5. WRITE REPORT
  // --------------------------------------------------

  const reportName =
    'EDB_B7_DIRECT_FUNCTION_PATH';

  let report =
    ss.getSheetByName(reportName);

  if (!report) {
    report =
      ss.insertSheet(reportName);
  }

  report.clearContents();

  report
    .getRange(
      1,
      1,
      output.length,
      output[0].length
    )
    .setValues(output);

  report
    .getRange(
      1,
      1,
      1,
      output[0].length
    )
    .setFontWeight('bold');

  report.autoResizeColumns(
    1,
    output[0].length
  );

  Logger.log(output);
}

function testB7ProductionContextPath() {

  const output = [
    ['TEST', 'RESULT', 'DETAIL']
  ];

  try {

    const context =
      getB7BookingDataContext();

    const sheet =
      context.responseSheet;

    output.push([
      'NO-OVERRIDE CONTEXT',
      'PASS',
      'name=' +
        sheet.getName() +
        '; id=' +
        sheet.getSheetId() +
        '; rows=' +
        sheet.getLastRow() +
        '; cols=' +
        sheet.getLastColumn()
    ]);

    const headers =
      sheet
        .getRange(
          1,
          1,
          1,
          sheet.getLastColumn()
        )
        .getValues()[0];

    const bookingIndex =
      headers.findIndex(function(header) {
        return String(header || '')
          .trim()
          .toLowerCase() === 'booking id';
      });

    output.push([
      'NO-OVERRIDE BOOKING INDEX',
      bookingIndex === 14
        ? 'PASS'
        : 'FAIL',
      'index=' + bookingIndex
    ]);

    const ids = [
      'IFFG-EDB-00009',
      'IFFG-EDB-00011'
    ];

    for (let i = 0; i < ids.length; i++) {

      const id = ids[i];

      try {

        const selected =
          getB7SelectedBooking(
            context,
            id
          );

        output.push([
          'NO-OVERRIDE B7 ' + id,
          selected
            ? 'PASS'
            : 'FAIL',
          selected
            ? 'row=' +
              selected.rowNumber +
              '; values=' +
              selected.values.length +
              '; headers=' +
              selected.headers.length +
              '; returnedID=[' +
              String(
                selected.values[14] || ''
              ) +
              ']'
            : 'returned null'
        ]);

      } catch (err) {

        output.push([
          'NO-OVERRIDE B7 ' + id,
          'THREW',
          String(err.message || err)
        ]);
      }
    }

    for (let i = 0; i < ids.length; i++) {

      const id = ids[i];

      try {

        const result =
          getEDBBookingForNewUI(id);

        output.push([
          'PRODUCTION ADAPTER ' + id,
          result
            ? 'PASS'
            : 'FAIL',
          result
            ? 'bookingId=' +
              result.bookingId +
              '; row=' +
              result.rowNumber +
              '; values=' +
              result.values.length +
              '; resident=[' +
              result.resident +
              ']'
            : 'returned null'
        ]);

      } catch (err) {

        output.push([
          'PRODUCTION ADAPTER ' + id,
          'THREW',
          String(err.message || err)
        ]);
      }
    }

  } catch (err) {

    output.push([
      'PRODUCTION CONTEXT',
      'THREW',
      String(err.message || err)
    ]);
  }

  const ss =
    SpreadsheetApp.openById(
      '1hHdFRgj1YnBqQATLd94iEGuRDqxOIsQEd8w1DKmYQfQ'
    );

  const reportName =
    'EDB_B7_PRODUCTION_CONTEXT';

  let report =
    ss.getSheetByName(reportName);

  if (!report) {
    report =
      ss.insertSheet(reportName);
  }

  report.clearContents();

  report
    .getRange(
      1,
      1,
      output.length,
      output[0].length
    )
    .setValues(output);

  report
    .getRange(
      1,
      1,
      1,
      output[0].length
    )
    .setFontWeight('bold');

  report.autoResizeColumns(
    1,
    output[0].length
  );

  Logger.log(output);
}