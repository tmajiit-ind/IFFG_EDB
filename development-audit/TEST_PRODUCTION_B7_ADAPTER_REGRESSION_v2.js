/**
 * IFFG EDB - PRODUCTION B7 ADAPTER REGRESSION v2
 *
 * READ-ONLY test of the complete Production B7 adapter:
 *     getEDBBookingForNewUI(bookingId)
 *
 * Production spreadsheet:
 *   1hHdFRgj1YnBqQATLd94iEGuRDqxOIsQEd8w1DKmYQfQ
 *
 * Known real Production bookings:
 *   IFFG-EDB-00009
 *   IFFG-EDB-00011
 *
 * This test deliberately does NOT use the Test Lab IDs because
 * getEDBBookingForNewUI() is Production-bound.
 *
 * It also does NOT assume that result.values or result.headers
 * exist. It safely inspects the returned object first.
 *
 * NO booking writes, approvals, payments, WhatsApp, scheduling,
 * or Screen 2 rendering are invoked.
 */

const IFFG_EDB_PRODUCTION_ID_V2 =
  '1hHdFRgj1YnBqQATLd94iEGuRDqxOIsQEd8w1DKmYQfQ';

const IFFG_EDB_PRODUCTION_REAL_IDS_V2 = [
  'IFFG-EDB-00009',
  'IFFG-EDB-00011'
];

function runEDBProductionB7AdapterRegressionV2() {
  const started = new Date();
  const rows = [
    ['SECTION', 'TEST', 'RESULT', 'DETAIL']
  ];

  let ss;
  let sheet;
  let beforeHash = '';

  try {
    ss = SpreadsheetApp.openById(
      IFFG_EDB_PRODUCTION_ID_V2
    );

    rows.push([
      'ACCESS',
      'Production spreadsheet',
      'PASS',
      ss.getName() + ' / id=' + ss.getId()
    ]);

    sheet = ss.getSheetByName('Form Responses 1');

    rows.push([
      'SHEET',
      'Form Responses 1',
      sheet ? 'PASS' : 'FAIL',
      sheet
        ? 'sheetId=' + sheet.getSheetId()
        : 'not found'
    ]);

    if (!sheet) {
      rows.push([
        'OVERALL',
        'Adapter regression',
        'FAIL',
        'Production response sheet missing'
      ]);
      writeEDBProductionB7AdapterReportV2_(rows, started);
      return rows;
    }

    const lastColumn = Math.max(
      sheet.getLastColumn(),
      1
    );

    const headers = sheet
      .getRange(1, 1, 1, lastColumn)
      .getValues()[0];

    rows.push([
      'SCHEMA',
      'Production width',
      headers.length === 39 ? 'PASS' : 'FAIL',
      'columns=' + headers.length + '; expected=39'
    ]);

    rows.push([
      'SCHEMA',
      'Email Address at N',
      normaliseHeaderV2_(headers[13]) === 'emailaddress'
        ? 'PASS'
        : 'FAIL',
      'N1=[' + headers[13] + ']'
    ]);

    rows.push([
      'SCHEMA',
      'Booking ID at O',
      normaliseHeaderV2_(headers[14]) === 'bookingid'
        ? 'PASS'
        : 'FAIL',
      'O1=[' + headers[14] + ']'
    ]);

    // Snapshot production data before adapter calls.
    beforeHash =
      hashValuesV2_(
        sheet.getDataRange().getValues()
      );

    // ---------------------------------------------------------
    // ACTUAL PRODUCTION ADAPTER
    // ---------------------------------------------------------
    IFFG_EDB_PRODUCTION_REAL_IDS_V2.forEach(
      function(bookingId) {

        let result;

        try {
          result =
            getEDBBookingForNewUI(bookingId);
        } catch (err) {
          rows.push([
            'ADAPTER',
            bookingId + ' execution',
            'FAIL',
            String(
              err && err.stack
                ? err.stack
                : err
            )
          ]);
          return;
        }

        const found =
          result !== null &&
          result !== undefined;

        rows.push([
          'ADAPTER',
          bookingId + ' returned object',
          found ? 'PASS' : 'FAIL',
          found
            ? describeResultV2_(result)
            : 'null/undefined'
        ]);

        if (!found) return;

        const resultBookingId =
          extractBookingIdV2_(result);

        rows.push([
          'ADAPTER',
          bookingId + ' / Booking ID',
          resultBookingId === bookingId
            ? 'PASS'
            : 'FAIL',
          'returned=[' + resultBookingId + ']'
        ]);

        const rowNumber =
          extractRowNumberV2_(result);

        rows.push([
          'ADAPTER',
          bookingId + ' / rowNumber',
          rowNumber > 1
            ? 'PASS'
            : 'CHECK',
          'rowNumber=' + rowNumber
        ]);

        const resultHeaders =
          Array.isArray(result.headers)
            ? result.headers
            : null;

        const resultValues =
          Array.isArray(result.values)
            ? result.values
            : null;

        if (resultHeaders !== null) {
          rows.push([
            'ADAPTER',
            bookingId + ' / headers width',
            resultHeaders.length === 39
              ? 'PASS'
              : 'FAIL',
            'returned=' + resultHeaders.length +
              '; expected=39'
          ]);

          const returnedBookingIndex =
            resultHeaders.findIndex(
              function(header) {
                return normaliseHeaderV2_(header) ===
                  'bookingid';
              }
            );

          rows.push([
            'ADAPTER',
            bookingId + ' / Booking ID index',
            returnedBookingIndex === 14
              ? 'PASS'
              : 'FAIL',
            'returned=' + returnedBookingIndex +
              '; expected=14'
          ]);
        } else {
          rows.push([
            'ADAPTER',
            bookingId + ' / headers',
            'CHECK',
            'Returned object has no headers array'
          ]);
        }

        if (resultValues !== null) {
          rows.push([
            'ADAPTER',
            bookingId + ' / values width',
            resultValues.length === 39
              ? 'PASS'
              : 'FAIL',
            'returned=' + resultValues.length +
              '; expected=39'
          ]);

          if (resultValues.length > 14) {
            const valueAtO =
              String(
                resultValues[14] == null
                  ? ''
                  : resultValues[14]
              ).trim();

            rows.push([
              'ADAPTER',
              bookingId + ' / values[14]',
              valueAtO === bookingId
                ? 'PASS'
                : 'FAIL',
              'values[14]=[' + valueAtO + ']'
            ]);
          }
        } else {
          rows.push([
            'ADAPTER',
            bookingId + ' / values',
            'CHECK',
            'Returned object has no values array'
          ]);
        }

        // Verify the most important mapped fields without assuming
        // one particular return-object implementation.
        checkMappedFieldV2_(
          rows,
          bookingId,
          result,
          'bookingId',
          bookingId
        );

        checkMappedFieldV2_(
          rows,
          bookingId,
          result,
          'flatNo',
          ''
        );
      }
    );

    // ---------------------------------------------------------
    // INVALID / BLANK
    // ---------------------------------------------------------
    [
      {
        label: 'INVALID',
        value: '__EDB_B7_INVALID_V2__'
      },
      {
        label: 'BLANK',
        value: ''
      }
    ].forEach(function(testCase) {

      try {
        const result =
          getEDBBookingForNewUI(
            testCase.value
          );

        const found =
          result !== null &&
          result !== undefined;

        rows.push([
          'NEGATIVE',
          testCase.label,
          found ? 'FAIL' : 'PASS',
          found
            ? 'Unexpected booking returned'
            : 'null/undefined'
        ]);

      } catch (err) {
        rows.push([
          'NEGATIVE',
          testCase.label,
          'PASS',
          'Safely rejected: ' +
            String(
              err && err.message
                ? err.message
                : err
            )
        ]);
      }
    });

    // ---------------------------------------------------------
    // SAFETY
    // ---------------------------------------------------------
    const afterHash =
      hashValuesV2_(
        sheet.getDataRange().getValues()
      );

    rows.push([
      'SAFETY',
      'Production response data unchanged',
      beforeHash === afterHash
        ? 'PASS'
        : 'FAIL',
      beforeHash === afterHash
        ? 'No production cell values changed.'
        : 'WARNING: production data changed.'
    ]);

    rows.push([
      'SAFETY',
      'Booking writes',
      'NOT RUN',
      'No booking writes invoked.'
    ]);

    rows.push([
      'SAFETY',
      'Approval/rejection',
      'NOT RUN',
      'No approval/rejection invoked.'
    ]);

    rows.push([
      'SAFETY',
      'Payment/WhatsApp',
      'NOT RUN',
      'No payment or WhatsApp invoked.'
    ]);

    rows.push([
      'SAFETY',
      'Scheduling',
      'NOT RUN',
      'No scheduling invoked.'
    ]);

    rows.push([
      'SAFETY',
      'Screen 2',
      'NOT RUN',
      'Rendering deliberately tested separately.'
    ]);

  } catch (err) {
    rows.push([
      'SUITE',
      'Execution',
      'FAIL',
      String(
        err && err.stack
          ? err.stack
          : err
      )
    ]);
  }

  const failures =
    rows.filter(function(row) {
      return row[2] === 'FAIL';
    }).length;

  rows.push([
    'OVERALL',
    'Production B7 adapter regression',
    failures === 0 ? 'PASS' : 'FAIL',
    'FAIL rows=' + failures +
      '; real production IDs=' +
      IFFG_EDB_PRODUCTION_REAL_IDS_V2.length
  ]);

  writeEDBProductionB7AdapterReportV2_(
    rows,
    started
  );

  return rows;
}

function checkMappedFieldV2_(
  rows,
  bookingId,
  result,
  fieldName,
  expected
) {
  if (!Object.prototype.hasOwnProperty.call(
    result,
    fieldName
  )) {
    rows.push([
      'MAPPED FIELD',
      bookingId + ' / ' + fieldName,
      'CHECK',
      'Field not exposed directly by adapter.'
    ]);
    return;
  }

  const actual =
    String(
      result[fieldName] == null
        ? ''
        : result[fieldName]
    ).trim();

  if (fieldName === 'bookingId') {
    rows.push([
      'MAPPED FIELD',
      bookingId + ' / bookingId',
      actual === expected ? 'PASS' : 'FAIL',
      'returned=[' + actual + ']'
    ]);
  } else {
    rows.push([
      'MAPPED FIELD',
      bookingId + ' / ' + fieldName,
      'INFO',
      'returned=[' + actual + ']'
    ]);
  }
}

function extractBookingIdV2_(result) {
  const directCandidates = [
    result.bookingId,
    result.bookingID,
    result.id
  ];

  for (let i = 0; i < directCandidates.length; i++) {
    if (
      directCandidates[i] !== null &&
      directCandidates[i] !== undefined &&
      String(directCandidates[i]).trim() !== ''
    ) {
      return String(
        directCandidates[i]
      ).trim();
    }
  }

  const arrays = [
    result.values,
    result.row,
    result.data
  ];

  for (let i = 0; i < arrays.length; i++) {
    if (
      Array.isArray(arrays[i]) &&
      arrays[i].length > 14
    ) {
      return String(
        arrays[i][14] == null
          ? ''
          : arrays[i][14]
      ).trim();
    }
  }

  return '';
}

function extractRowNumberV2_(result) {
  const candidates = [
    result.rowNumber,
    result.row,
    result.sheetRow
  ];

  for (let i = 0; i < candidates.length; i++) {
    const n = Number(candidates[i]);
    if (isFinite(n) && n > 0) return n;
  }

  return 0;
}

function describeResultV2_(result) {
  if (Array.isArray(result)) {
    return 'array length=' + result.length;
  }

  if (typeof result !== 'object') {
    return 'type=' + typeof result +
      '; value=[' + String(result) + ']';
  }

  const keys =
    Object.keys(result);

  const summary = {
    keys: keys,
    bookingId: result.bookingId,
    rowNumber: result.rowNumber,
    headersLength:
      Array.isArray(result.headers)
        ? result.headers.length
        : null,
    valuesLength:
      Array.isArray(result.values)
        ? result.values.length
        : null
  };

  return JSON.stringify(summary);
}

function normaliseHeaderV2_(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_\-–—]+/g, '');
}

function hashValuesV2_(values) {
  return JSON.stringify(values);
}

function writeEDBProductionB7AdapterReportV2_(
  rows,
  started
) {
  // Report is written to the Test Lab, never to Production.
  const testLab =
    SpreadsheetApp.openById(
      '1ixlMDeAEUu2bpKL-Bnp9iNlniM_VxSNrRFi1CurcwuM'
    );

  let report =
    testLab.getSheetByName(
      'EDB_PROD_B7_ADAPTER_TEST'
    );

  if (!report) {
    report =
      testLab.insertSheet(
        'EDB_PROD_B7_ADAPTER_TEST'
      );
  } else {
    report.clearContents();
  }

  const output = [
    ['IFFG EDB - PRODUCTION B7 ADAPTER REGRESSION V2', '', '', ''],
    ['Run started', started, '', ''],
    ['Run completed', new Date(), '', ''],
    ['Production Spreadsheet ID',
      IFFG_EDB_PRODUCTION_ID_V2, '', ''],
    ['', '', '', ''],
    ...rows
  ];

  report
    .getRange(
      1,
      1,
      output.length,
      4
    )
    .setValues(output);

  report.setFrozenRows(5);
  report.autoResizeColumns(1, 4);
}
