/*
============================================================
IFFG EDB - BOOKING DETAIL AUDIT V1
ASCII ONLY
============================================================

PURPOSE
-------
Controlled, non-destructive audit of Screen 2 Booking Detail.

This script is designed for the current V10 Operations Console.

It deliberately:
  - rebuilds Screen 1 before starting
  - tests bookings in a fixed sequence
  - calls the existing Screen 2 renderer
  - captures the rendered Booking Detail fields
  - checks the VIEW FILE hyperlink
  - checks action-control state
  - records PASS/FAIL evidence in a separate audit sheet
  - restores Screen 1 at the end

It does NOT:
  - change Form Responses 1 booking data
  - approve or reject bookings
  - change payment status
  - schedule a booking
  - send WhatsApp
  - open/click a Drive file

TEST ORDER
----------
1. IFFG-EDB-00006 - Payment Received / Approval Pending
2. IFFG-EDB-00005 - Scheduled / future display
3. IFFG-EDB-00007 - One-day scheduled display

IMPORTANT
---------
The audit intentionally calls the existing V10 function
showEDBBookingDetailLive(). This means the audit tests the
actual Screen 2 rendering code, not a duplicate approximation.

After each booking is rendered, the script reads the resulting
Screen 2 cells and records them.

At the end, buildEDBAdminUICompact() is called so the workbook
is returned to Screen 1 / Operations Console.
============================================================
*/


function runEDBBookingDetailAuditV1_ASCII() {

  var SPREADSHEET_ID =
    '1hHdFRgj1YnBqQATLd94iEGuRDqxOIsQEd8w1DKmYQfQ';

  var TEST_BOOKINGS = [
    'IFFG-EDB-00006',
    'IFFG-EDB-00005',
    'IFFG-EDB-00007'
  ];

  var ss =
    SpreadsheetApp.openById(
      SPREADSHEET_ID
    );

  var auditSheet =
    getOrCreateEDBBookingDetailAuditSheet_(
      ss
    );

  resetEDBBookingDetailAuditSheet_(
    auditSheet
  );

  var startedAt =
    new Date();

  var results = [];

  Logger.log(
    'EDB Booking Detail Audit V1 started.'
  );

  Logger.log(
    'Test order: ' +
    TEST_BOOKINGS.join(
      ' -> '
    )
  );

  /*
   * ALWAYS restore Screen 1 at the end,
   * even if one test fails.
   */
  try {

    /*
     * --------------------------------------------------------
     * STEP 1
     * Rebuild Screen 1 from current live data.
     * --------------------------------------------------------
     */

    buildEDBAdminUICompact();

    recordAuditEvent_(
      auditSheet,
      'STEP 1',
      '',
      'PASS',
      'Operations Console rebuilt before Booking Detail audit.'
    );


    /*
     * --------------------------------------------------------
     * STEP 2
     * Test each Booking Detail in controlled order.
     * --------------------------------------------------------
     */

    for (
      var i = 0;
      i < TEST_BOOKINGS.length;
      i++
    ) {

      var bookingId =
        TEST_BOOKINGS[i];

      var result =
        auditOneEDBBookingDetail_(
          ss,
          auditSheet,
          bookingId,
          i + 1
        );

      results.push(
        result
      );
    }


    /*
     * --------------------------------------------------------
     * STEP 3
     * Restore Screen 1 after all tests.
     * --------------------------------------------------------
     */

    buildEDBAdminUICompact();

    recordAuditEvent_(
      auditSheet,
      'STEP 3',
      '',
      'PASS',
      'Operations Console restored after Booking Detail audit.'
    );

  }
  catch (err) {

    recordAuditEvent_(
      auditSheet,
      'ERROR',
      '',
      'FAIL',
      String(
        err &&
        err.message
          ? err.message
          : err
      )
    );

    /*
     * Attempt restoration even after an unexpected failure.
     */
    try {

      buildEDBAdminUICompact();

      recordAuditEvent_(
        auditSheet,
        'RECOVERY',
        '',
        'PASS',
        'Operations Console restored after audit error.'
      );

    }
    catch (restoreErr) {

      recordAuditEvent_(
        auditSheet,
        'RECOVERY',
        '',
        'FAIL',
        'Unable to restore Operations Console: ' +
        String(
          restoreErr &&
          restoreErr.message
            ? restoreErr.message
            : restoreErr
        )
      );

    }

    throw err;

  }


  /*
   * ----------------------------------------------------------
   * SUMMARY
   * ----------------------------------------------------------
   */

  var passCount = 0;
  var failCount = 0;

  results.forEach(
    function(result) {

      if (
        result.result === 'PASS'
      ) {
        passCount++;
      }
      else {
        failCount++;
      }

    }
  );

  var elapsedMs =
    new Date().getTime() -
    startedAt.getTime();

  recordAuditEvent_(
    auditSheet,
    'SUMMARY',
    '',
    failCount === 0
      ? 'PASS'
      : 'FAIL',
    'Booking Detail tests: ' +
    results.length +
    '; PASS=' +
    passCount +
    '; FAIL=' +
    failCount +
    '; elapsed=' +
    elapsedMs +
    ' ms.'
  );

  Logger.log(
    'EDB Booking Detail Audit V1 complete. ' +
    'PASS=' +
    passCount +
    ', FAIL=' +
    failCount
  );

}


/* ============================================================
   AUDIT ONE BOOKING DETAIL
   ============================================================ */

function auditOneEDBBookingDetail_(
  ss,
  auditSheet,
  bookingId,
  sequenceNo
) {

  var result =
    {
      bookingId: bookingId,
      result: 'PASS'
    };

  Logger.log(
    'STEP 2.' +
    sequenceNo +
    ' - Rendering ' +
    bookingId
  );


  /*
   * ----------------------------------------------------------
   * Render the REAL V10 Booking Detail.
   * ----------------------------------------------------------
   */

  try {

    showEDBBookingDetailLive(
      bookingId
    );

  }
  catch (err) {

    recordAuditEvent_(
      auditSheet,
      'STEP 2.' + sequenceNo,
      bookingId,
      'FAIL',
      'showEDBBookingDetailLive failed: ' +
      String(
        err &&
        err.message
          ? err.message
          : err
      )
    );

    result.result = 'FAIL';

    return result;
  }


  SpreadsheetApp.flush();


  /*
   * ----------------------------------------------------------
   * Confirm the correct UI sheet.
   * ----------------------------------------------------------
   */

  var sheet =
    ss.getSheetByName(
      'EDB Admin UI'
    );

  if (!sheet) {

    recordAuditEvent_(
      auditSheet,
      'STEP 2.' + sequenceNo,
      bookingId,
      'FAIL',
      'EDB Admin UI sheet not found after render.'
    );

    result.result = 'FAIL';

    return result;
  }


  /*
   * ----------------------------------------------------------
   * Capture the rendered Screen 2.
   * ----------------------------------------------------------
   */

  var screenTitle =
    sheet
      .getRange('A1')
      .getDisplayValue();

  var renderedBookingId =
    sheet
      .getRange('A2')
      .getDisplayValue();

  var state =
    sheet
      .getRange('I2')
      .getDisplayValue();

  var resident =
    sheet
      .getRange('B5')
      .getDisplayValue();

  var flat =
    sheet
      .getRange('D5')
      .getDisplayValue();

  var mobile =
    sheet
      .getRange('F5')
      .getDisplayValue();

  var material =
    sheet
      .getRange('H5')
      .getDisplayValue();

  var duration =
    sheet
      .getRange('J5')
      .getDisplayValue();

  var viewFileText =
    sheet
      .getRange('L5')
      .getDisplayValue();

  var startDate =
    sheet
      .getRange('B9')
      .getDisplayValue();

  var endDate =
    sheet
      .getRange('D9')
      .getDisplayValue();

  var validation =
    sheet
      .getRange('H9')
      .getDisplayValue();

  var amount =
    sheet
      .getRange('B10')
      .getDisplayValue();

  var gst =
    sheet
      .getRange('D10')
      .getDisplayValue();

  var payment =
    sheet
      .getRange('F10')
      .getDisplayValue();

  var utr =
    sheet
      .getRange('H10')
      .getDisplayValue();

  var paymentDate =
    sheet
      .getRange('B11')
      .getDisplayValue();

  var approval =
    sheet
      .getRange('D11')
      .getDisplayValue();

  var displayStatus =
    sheet
      .getRange('F11')
      .getDisplayValue();

  var workflow =
    sheet
      .getRange('B14')
      .getDisplayValue();

  var instruction =
    sheet
      .getRange('A17')
      .getDisplayValue();


  /*
   * ----------------------------------------------------------
   * VIEW FILE hyperlink
   * ----------------------------------------------------------
   */

  var viewFileRichText =
    sheet
      .getRange('L5')
      .getRichTextValue();

  var viewFileUrl =
    '';

  if (
    viewFileRichText
  ) {

    viewFileUrl =
      viewFileRichText
        .getLinkUrl() ||
      '';

  }


  /*
   * ----------------------------------------------------------
   * Action controls
   * ----------------------------------------------------------
   */

  var d19Validation =
    sheet
      .getRange('D19')
      .getDataValidation();

  var h19Validation =
    sheet
      .getRange('H19')
      .getDataValidation();

  var d19HasCheckbox =
    d19Validation &&
    d19Validation.getCriteriaType() ===
      SpreadsheetApp.DataValidationCriteria.CHECKBOX;

  var h19HasCheckbox =
    h19Validation &&
    h19Validation.getCriteriaType() ===
      SpreadsheetApp.DataValidationCriteria.CHECKBOX;


  /*
   * ----------------------------------------------------------
   * Determine expected action-control behaviour.
   *
   * This is based on the actual rendered state, not guessed
   * from the Booking ID.
   * ----------------------------------------------------------
   */

  var expectedD19Checkbox =
    (
      state === 'AWAITING REVIEW' ||
      state === 'PAYMENT RECEIVED' ||
      state === 'AWAITING PAYMENT'
    );

  var expectedH19Checkbox =
    state === 'AWAITING REVIEW';


  /*
   * ----------------------------------------------------------
   * Validate basic rendering.
   * ----------------------------------------------------------
   */

  var checks = [];

  checks.push(
    screenTitle === 'BOOKING DETAIL'
  );

  checks.push(
    renderedBookingId === bookingId
  );

  checks.push(
    resident !== ''
  );

  checks.push(
    flat !== ''
  );

  checks.push(
    material !== ''
  );

  checks.push(
    duration !== ''
  );

  checks.push(
    viewFileText === 'VIEW FILE' ||
    viewFileText === 'FILE NOT AVAILABLE'
  );


  /*
   * The supplied test records use actual Drive media.
   * Therefore the three controlled bookings should expose
   * a real VIEW FILE URL.
   */
  checks.push(
    viewFileUrl !== ''
  );


  checks.push(
    validation !== ''
  );

  checks.push(
    payment !== ''
  );

  checks.push(
    approval !== ''
  );

  checks.push(
    displayStatus !== ''
  );

  checks.push(
    workflow !== ''
  );

  checks.push(
    instruction !== ''
  );


  /*
   * For states which require the functional checkbox,
   * verify that the checkbox is actually present.
   */
  if (
    expectedD19Checkbox
  ) {

    checks.push(
      d19HasCheckbox
    );

  }


  if (
    expectedH19Checkbox
  ) {

    checks.push(
      h19HasCheckbox
    );

  }


  var pass =
    checks.every(
      function(value) {
        return value === true;
      }
    );


  if (!pass) {
    result.result = 'FAIL';
  }


  /*
   * ----------------------------------------------------------
   * Write one complete evidence row.
   * ----------------------------------------------------------
   */

  auditSheet.appendRow([
    new Date(),
    sequenceNo,
    bookingId,
    screenTitle,
    renderedBookingId,
    state,
    resident,
    flat,
    mobile,
    material,
    duration,
    startDate,
    endDate,
    validation,
    amount,
    gst,
    payment,
    utr,
    paymentDate,
    approval,
    displayStatus,
    workflow,
    viewFileText,
    viewFileUrl,
    d19HasCheckbox ? 'YES' : 'NO',
    h19HasCheckbox ? 'YES' : 'NO',
    pass ? 'PASS' : 'FAIL',
    pass
      ? 'Screen 2 rendered correctly and required evidence was found.'
      : 'One or more Booking Detail checks failed.'
  ]);


  Logger.log(
    bookingId +
    ' -> ' +
    result.result +
    ' | State=' +
    state +
    ' | VIEW FILE=' +
    (
      viewFileUrl
        ? 'FOUND'
        : 'NOT FOUND'
    )
  );


  return result;
}


/* ============================================================
   AUDIT SHEET
   ============================================================ */

function getOrCreateEDBBookingDetailAuditSheet_(
  ss
) {

  var name =
    'EDB Booking Detail Audit';

  var sheet =
    ss.getSheetByName(
      name
    );

  if (!sheet) {

    sheet =
      ss.insertSheet(
        name
      );

  }

  return sheet;
}


function resetEDBBookingDetailAuditSheet_(
  sheet
) {

  var lastRow =
    Math.max(
      sheet.getLastRow(),
      1
    );

  var lastColumn =
    Math.max(
      sheet.getLastColumn(),
      1
    );

  sheet
    .getRange(
      1,
      1,
      lastRow,
      lastColumn
    )
    .clear();


  var headers = [
    'Timestamp',
    'Sequence',
    'Booking ID',
    'Screen Title',
    'Rendered Booking ID',
    'State',
    'Resident',
    'Flat',
    'Mobile',
    'Material',
    'Duration',
    'Start',
    'End',
    'Validation',
    'Amount',
    'GST',
    'Payment',
    'UTR',
    'Payment Date',
    'Approval',
    'Display Status',
    'Workflow',
    'VIEW FILE Text',
    'VIEW FILE URL',
    'D19 Checkbox',
    'H19 Checkbox',
    'Result',
    'Notes'
  ];


  sheet
    .getRange(
      1,
      1,
      1,
      headers.length
    )
    .setValues([
      headers
    ])
    .setFontWeight(
      'bold'
    );


  sheet.setFrozenRows(
    1
  );


  sheet
    .getRange(
      1,
      1,
      1,
      headers.length
    )
    .setWrap(
      true
    );


  sheet.setColumnWidths(
    1,
    headers.length,
    120
  );


  sheet.setColumnWidth(
    3,
    150
  );


  sheet.setColumnWidth(
    24,
    300
  );


  sheet.setColumnWidth(
    28,
    320
  );

}


/* ============================================================
   AUDIT EVENT LOGGER
   ============================================================ */

function recordAuditEvent_(
  sheet,
  step,
  bookingId,
  result,
  notes
) {

  sheet.appendRow([
    new Date(),
    step,
    bookingId,
    'AUDIT EVENT',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    result,
    notes
  ]);

}
