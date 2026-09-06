/**
 * IFFG EDB - B7 Lookup Fix Candidate Test
 *
 * PURPOSE
 * -------
 * We now have evidence that getB7SelectedBooking() is using
 * bookingDataContext.headers whose Booking ID index does not match
 * the actual Response Sheet.
 *
 * This file DOES NOT replace or override any production function.
 *
 * It tests the proposed correction:
 *   derive headers from the SAME responseSheet used for the row data.
 *
 * RUN:
 *   runEDBB7LookupFixCandidateTest()
 *
 * RESULT:
 *   EDB_B7_LOOKUP_FIX_TEST
 *
 * SAFETY:
 *   READ ONLY.
 */

function runEDBB7LookupFixCandidateTest() {

  const ss = SpreadsheetApp.openById(
    '1hHdFRgj1YnBqQATLd94iEGuRDqxOIsQEd8w1DKmYQfQ'
  );

  const report = getEDBB7LookupFixTestSheet_(ss);
  const started = new Date();

  const rows = [
    ['TEST', 'RESULT', 'DETAIL']
  ];

  const sheet = ss.getSheetByName('Form Responses 1');

  if (!sheet) {
    rows.push([
      'Response Sheet',
      'FAIL',
      'Form Responses 1 not found'
    ]);
    writeEDBB7LookupFixTest_(report, rows, started);
    return;
  }

  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();

  const headers = sheet
    .getRange(1, 1, 1, Math.max(lastColumn, 1))
    .getValues()[0];

  const values = lastRow >= 2
    ? sheet
        .getRange(
          2,
          1,
          lastRow - 1,
          Math.max(lastColumn, 1)
        )
        .getValues()
    : [];

  rows.push([
    'Direct sheet column count',
    'PASS',
    String(lastColumn)
  ]);

  const bookingIdIndex = headers.findIndex(function(header) {
    return String(header || '')
      .trim()
      .toLowerCase() === 'booking id';
  });

  rows.push([
    'Direct sheet Booking ID index',
    bookingIdIndex >= 0 ? 'PASS' : 'FAIL',
    bookingIdIndex >= 0
      ? columnLetterFixTest_(bookingIdIndex + 1) +
        ' / zero-based index ' +
        bookingIdIndex
      : 'not found'
  ]);

  // ------------------------------------------------------------
  // Compare with the existing B7 context WITHOUT modifying it.
  // ------------------------------------------------------------

  let context = null;

  try {
    context = getB7BookingDataContext();

    const contextHeaders =
      context && Array.isArray(context.headers)
        ? context.headers
        : [];

    const contextBookingIndex =
      contextHeaders.findIndex(function(header) {
        return String(header || '')
          .trim()
          .toLowerCase() === 'booking id';
      });

    rows.push([
      'Existing B7 context header count',
      'INFO',
      String(contextHeaders.length)
    ]);

    rows.push([
      'Existing B7 context Booking ID index',
      'INFO',
      String(contextBookingIndex)
    ]);

    rows.push([
      'Context vs direct Booking ID index',
      contextBookingIndex === bookingIdIndex
        ? 'PASS'
        : 'FAIL',
      'context=' +
      contextBookingIndex +
      '; direct=' +
      bookingIdIndex
    ]);

  } catch (err) {

    rows.push([
      'Existing B7 context',
      'FAIL',
      String(err && err.message || err)
    ]);
  }

  // ------------------------------------------------------------
  // Collect every real Booking ID.
  // ------------------------------------------------------------

  const realIds = [];

  if (bookingIdIndex >= 0) {

    for (let i = 0; i < values.length; i++) {

      const id =
        String(values[i][bookingIdIndex] || '').trim();

      if (id) {
        realIds.push({
          id: id,
          row: i + 2
        });
      }
    }
  }

  rows.push([
    'Real Booking IDs found',
    realIds.length ? 'PASS' : 'FAIL',
    realIds.map(function(item) {
      return item.id + ' (row ' + item.row + ')';
    }).join(' | ')
  ]);

  // ------------------------------------------------------------
  // Candidate lookup:
  // IMPORTANT: headers and values come from the SAME sheet/range.
  // ------------------------------------------------------------

  function candidateLookup(bookingId) {

    const target =
      String(bookingId || '').trim();

    if (!target) {
      return null;
    }

    for (let i = 0; i < values.length; i++) {

      const current =
        String(values[i][bookingIdIndex] || '').trim();

      if (current === target) {

        return {
          rowNumber: i + 2,
          values: values[i],
          headers: headers,
          spreadsheet: ss,
          responseSheet: sheet
        };
      }
    }

    return null;
  }

  // ------------------------------------------------------------
  // Test ALL real IDs.
  // ------------------------------------------------------------

  let realPass = 0;
  let realFail = 0;

  realIds.forEach(function(item) {

    const result =
      candidateLookup(item.id);

    const ok =
      !!result &&
      result.rowNumber === item.row &&
      String(
        result.values[bookingIdIndex] || ''
      ).trim() === item.id &&
      result.headers.length === lastColumn;

    rows.push([
      'Candidate real-ID lookup: ' + item.id,
      ok ? 'PASS' : 'FAIL',
      ok
        ? 'row=' + result.rowNumber +
          '; ID=' + item.id +
          '; headers=' + result.headers.length
        : 'candidate returned inconsistent data'
    ]);

    if (ok) {
      realPass++;
    } else {
      realFail++;
    }
  });

  rows.push([
    'Candidate real-ID regression',
    realFail === 0 && realIds.length > 0
      ? 'PASS'
      : 'FAIL',
    'tested=' + realIds.length +
    '; passed=' + realPass +
    '; failed=' + realFail
  ]);

  // ------------------------------------------------------------
  // Input variants for every real ID.
  // ------------------------------------------------------------

  let variantPass = 0;
  let variantFail = 0;

  realIds.forEach(function(item) {

    const variants = [
      {
        name: 'exact',
        value: item.id,
        shouldFind: true
      },
      {
        name: 'padded',
        value: '  ' + item.id + '  ',
        shouldFind: true
      },
      {
        name: 'lowercase',
        value: item.id.toLowerCase(),
        shouldFind: false
      }
    ];

    variants.forEach(function(variant) {

      const result =
        candidateLookup(variant.value);

      const found =
        !!result;

      const expected =
        variant.shouldFind;

      const ok =
        found === expected;

      rows.push([
        'Variant ' + variant.name +
        ': ' + item.id,
        ok ? 'PASS' : 'FAIL',
        'found=' + found +
        '; expected=' + expected
      ]);

      if (ok) {
        variantPass++;
      } else {
        variantFail++;
      }
    });
  });

  rows.push([
    'Candidate input-variant regression',
    variantFail === 0 ? 'PASS' : 'FAIL',
    'tested=' +
    (variantPass + variantFail) +
    '; passed=' +
    variantPass +
    '; failed=' +
    variantFail
  ]);

  // ------------------------------------------------------------
  // Invalid and blank IDs.
  // ------------------------------------------------------------

  const invalidCases = [
    {
      name: 'invalid',
      value: '__EDB_FIX_TEST_INVALID__'
    },
    {
      name: 'blank',
      value: ''
    }
  ];

  invalidCases.forEach(function(testCase) {

    const result =
      candidateLookup(testCase.value);

    rows.push([
      'Candidate ' + testCase.name,
      result === null ? 'PASS' : 'FAIL',
      result === null
        ? 'no booking returned'
        : 'unexpected row ' +
          result.rowNumber
    ]);
  });

  // ------------------------------------------------------------
  // Safety statement.
  // ------------------------------------------------------------

  rows.push([
    'Production functions changed',
    'NO',
    'This file defines only a uniquely named test runner'
  ]);

  rows.push([
    'Production booking writes',
    'NOT RUN',
    'Read-only candidate test'
  ]);

  rows.push([
    'Approval / rejection',
    'NOT RUN',
    'Not invoked'
  ]);

  rows.push([
    'Payment / WhatsApp',
    'NOT RUN',
    'Not invoked'
  ]);

  rows.push([
    'Scheduling',
    'NOT RUN',
    'Not invoked'
  ]);

  rows.push([
    'showEDBBookingDetailLive',
    'NOT RUN',
    'Not invoked'
  ]);

  rows.push([
    'OVERALL',
    realFail === 0 &&
    variantFail === 0 &&
    realIds.length > 0
      ? 'PASS'
      : 'SEE ABOVE',
    'Candidate fix tested independently of production'
  ]);

  writeEDBB7LookupFixTest_(
    report,
    rows,
    started
  );
}


function columnLetterFixTest_(column) {

  let result = '';
  let n = column;

  while (n > 0) {

    const remainder =
      (n - 1) % 26;

    result =
      String.fromCharCode(
        65 + remainder
      ) + result;

    n =
      Math.floor(
        (n - 1) / 26
      );
  }

  return result;
}


function getEDBB7LookupFixTestSheet_(ss) {

  const name =
    'EDB_B7_LOOKUP_FIX_TEST';

  let sheet =
    ss.getSheetByName(name);

  if (!sheet) {
    sheet = ss.insertSheet(name);
  }

  return sheet;
}


function writeEDBB7LookupFixTest_(
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
      3
    )
    .setValues(rows);

  sheet
    .getRange(
      1,
      1,
      1,
      3
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

  sheet.autoResizeColumns(1, 3);
}
