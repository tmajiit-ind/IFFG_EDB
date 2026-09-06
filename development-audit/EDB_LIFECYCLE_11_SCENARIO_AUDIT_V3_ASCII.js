/*
============================================================
IFFG EDB - FULL 10 SCENARIO LIFECYCLE AUDIT
VERSION: V11
ASCII ONLY
============================================================

PURPOSE
-------
Read-only acceptance audit of the ten test scenarios in
Form Responses 1.

IMPORTANT
---------
This audit does NOT modify Form Responses 1.
It does NOT approve, reject, pay, schedule, archive, or
change Display Status.

It tests the ACTUAL LIVE RECORDS.

A scenario is identified from:
"7. Display Instructions / Special Requirements"
containing "Scenario 1" through "Scenario 10".

The audit deliberately reports NOT READY when the operational
fields required to evaluate a scenario are blank. It never
turns missing data into PASS.

For approved + paid records, the actual lifecycle state is
calculated by the existing getEDBAutomaticDisplayState()
function.

TEST DATE
---------
The supplied ten-scenario test data was designed around
28-Aug-2026. This audit therefore uses:

28-Aug-2026 12:00:00

This keeps the result deterministic.

OUTPUT
------
Creates/rebuilds:
EDB Lifecycle 10 Scenario Audit

The result sheet contains:
- Scenario
- Booking ID
- Operational readiness
- Payment
- Approval
- Stored Display Status
- Resolved Start
- Resolved End
- Expected State
- Actual State
- Expected Live Display
- Actual Live Display
- Result
- Notes

RESULT RULES
------------
PASS:
  Required operational data is present and actual state matches
  the expected state.

NOT READY:
  The scenario row exists, but required workflow fields are
  not yet populated sufficiently for a real lifecycle test.

FAIL:
  Required data exists, but actual lifecycle behaviour differs
  from the expected scenario.

MISSING:
  The scenario row itself cannot be found.

The audit also runs the exact 00007 boundary test:
31-Aug-2026 = currently displaying
01-Sep-2026 = display period over

Run:
runEDBLifecycle11ScenarioAuditV3_ASCII()
============================================================
*/

var EDB_LIFECYCLE_AUDIT_SPREADSHEET_ID =
  '1hHdFRgj1YnBqQATLd94iEGuRDqxOIsQEd8w1DKmYQfQ';

var EDB_LIFECYCLE_AUDIT_SHEET =
  'EDB Lifecycle 10 Scenario Audit';

var EDB_LIFECYCLE_TEST_DATE =
  new Date(2026, 7, 28, 12, 0, 0, 0);


/* ============================================================
   MAIN AUDIT
   ============================================================ */

function runEDBLifecycle11ScenarioAuditV3_ASCII() {

  Logger.log(
    'EDB 10-scenario lifecycle audit V3 started.'
  );

  var ss =
    SpreadsheetApp.openById(
      EDB_LIFECYCLE_AUDIT_SPREADSHEET_ID
    );

  if (!ss) {
    throw new Error(
      'EDB spreadsheet could not be opened by ID.'
    );
  }

  if (
    typeof getEDBAutomaticDisplayState !==
    'function'
  ) {
    throw new Error(
      'getEDBAutomaticDisplayState() is not available.'
    );
  }

  var responseSheet =
    ss.getSheetByName(
      'Form Responses 1'
    );

  if (!responseSheet) {
    throw new Error(
      'Form Responses 1 not found.'
    );
  }

  var auditSheet =
    ss.getSheetByName(
      EDB_LIFECYCLE_AUDIT_SHEET
    );

  if (!auditSheet) {
    auditSheet =
      ss.insertSheet(
        EDB_LIFECYCLE_AUDIT_SHEET
      );
  }

  auditSheet.clear();
  auditSheet.clearFormats();

  var data =
    responseSheet
      .getDataRange()
      .getValues();

  if (data.length < 2) {
    throw new Error(
      'Form Responses 1 contains no data rows.'
    );
  }

  var headers =
    data[0].map(String);

  var headerMap =
    buildEDBLifecycleHeaderMapV3_(
      headers
    );

  requireEDBLifecycleHeadersV3_(
    headerMap
  );

  var scenarioRows =
    findEDBLifecycleScenarioRowsV3_(
      data,
      headerMap
    );

  var rows = [];

  rows.push([
    'Scenario',
    'Booking ID',
    'Operational Readiness',
    'Payment',
    'Approval',
    'Stored Display Status',
    'Resolved Start',
    'Resolved End',
    'Expected State',
    'Actual State',
    'Expected Live Display',
    'Actual Live Display',
    'Result',
    'Notes'
  ]);

  var passCount = 0;
  var failCount = 0;
  var notReadyCount = 0;
  var missingCount = 0;

  for (
    var scenarioNumber = 1;
    scenarioNumber <= 10;
    scenarioNumber++
  ) {

    var scenario =
      buildEDBLifecycleExpectedScenarioV3_(
        scenarioNumber
      );

    var rowIndex =
      scenarioRows[scenarioNumber];

    if (rowIndex === undefined) {

      rows.push([
        'Scenario ' + scenarioNumber,
        '',
        'MISSING',
        '',
        '',
        '',
        '',
        '',
        scenario.expectedState,
        '',
        scenario.expectedLiveDisplay
          ? 'YES'
          : 'NO',
        '',
        'MISSING',
        'Scenario row not found in Form Responses 1.'
      ]);

      missingCount++;
      continue;
    }

    var liveRow =
      data[rowIndex];

    var result =
      auditOneEDBLiveScenarioV3_(
        liveRow,
        headerMap,
        scenario
      );

    rows.push(result);

    if (result[12] === 'PASS') {
      passCount++;
    } else if (result[12] === 'FAIL') {
      failCount++;
    } else if (result[12] === 'NOT READY') {
      notReadyCount++;
    }

  }

  /*
   * Dedicated 00007 boundary test.
   * This does not modify the live booking.
   */
  var boundary =
    runEDBOneDayBoundaryAuditV3_();

  rows.push([
    '00007 Boundary Unit Test',
    'IFFG-EDB-00007',
    'UNIT TEST',
    'Paid',
    'Approved',
    'Scheduled',
    boundary.start,
    boundary.end,
    '31-Aug=currently displaying; 01-Sep=display period over',
    boundary.resultText,
    '31-Aug=YES; 01-Sep=NO',
    boundary.actualText,
    boundary.pass
      ? 'PASS'
      : 'FAIL',
    boundary.notes
  ]);

  if (boundary.pass) {
    passCount++;
  } else {
    failCount++;
  }

  /*
   * Write audit sheet.
   */
  auditSheet
    .getRange(
      1,
      1,
      rows.length,
      rows[0].length
    )
    .setValues(rows);

  auditSheet
    .getRange(
      1,
      1,
      1,
      rows[0].length
    )
    .setFontWeight('bold')
    .setWrap(true);

  if (rows.length > 1) {

    auditSheet
      .getRange(
        2,
        7,
        rows.length - 1,
        2
      )
      .setNumberFormat(
        'dd-mmm-yyyy'
      );

  }

  auditSheet.setFrozenRows(1);

  /*
   * Do not auto-resize every column aggressively.
   * The sheet is intended to remain readable and scrollable.
   */
  for (
    var c = 1;
    c <= rows[0].length;
    c++
  ) {

    auditSheet.setColumnWidth(
      c,
      c === 14
        ? 420
        : 150
    );

  }

  SpreadsheetApp.flush();

  Logger.log(
    'EDB 10-scenario lifecycle audit V3 complete. ' +
    'PASS=' + passCount +
    ', FAIL=' + failCount +
    ', NOT READY=' + notReadyCount +
    ', MISSING=' + missingCount
  );

  ss.setActiveSheet(
    auditSheet
  );

  return {
    pass: passCount,
    fail: failCount,
    notReady: notReadyCount,
    missing: missingCount
  };
}


/* ============================================================
   EXPECTED SCENARIOS
   ============================================================ */

function buildEDBLifecycleExpectedScenarioV3_(
  number
) {

  switch (number) {

    case 1:
      return {
        expectedState: 'pending',
        expectedLiveDisplay: false
      };

    case 2:
      return {
        expectedState: 'pending',
        expectedLiveDisplay: false
      };

    case 3:
      return {
        expectedState: 'payment received',
        expectedLiveDisplay: false
      };

    case 4:
      return {
        expectedState: 'scheduled',
        expectedLiveDisplay: false
      };

    case 5:
      return {
        expectedState: 'currently displaying',
        expectedLiveDisplay: true
      };

    case 6:
      return {
        expectedState: 'currently displaying',
        expectedLiveDisplay: true
      };

    case 7:
      return {
        expectedState: 'display period over',
        expectedLiveDisplay: false
      };

    case 8:
      return {
        expectedState: 'display period over',
        expectedLiveDisplay: false
      };

    case 9:
      return {
        expectedState: 'rejected',
        expectedLiveDisplay: false
      };

    case 10:
      return {
        expectedState: 'scheduled',
        expectedLiveDisplay: false
      };

    default:
      throw new Error(
        'Unknown scenario number: ' +
        number
      );
  }

}


/* ============================================================
   AUDIT ONE REAL LIVE SCENARIO
   ============================================================ */

function auditOneEDBLiveScenarioV3_(
  row,
  headerMap,
  scenario
) {

  var bookingId =
    getEDBLifecycleValueV3_(
      row,
      headerMap,
      'booking id'
    );

  var payment =
    normaliseEDBLifecycleTextV3_(
      getEDBLifecycleValueV3_(
        row,
        headerMap,
        'payment status'
      )
    );

  var approval =
    normaliseEDBLifecycleTextV3_(
      getEDBLifecycleValueV3_(
        row,
        headerMap,
        'approval status'
      )
    );

  var stored =
    normaliseEDBLifecycleTextV3_(
      getEDBLifecycleValueV3_(
        row,
        headerMap,
        'display status'
      )
    );

  var start =
    getEDBLifecycleDateV3_(
      row,
      headerMap,
      [
        'confirmed start date',
        'final start date',
        'requested start date',
        'preferred start date'
      ]
    );

  var end =
    getEDBLifecycleDateV3_(
      row,
      headerMap,
      [
        'confirmed end date',
        'final end date',
        'requested end date'
      ]
    );

  var operationalReady =
    (
      bookingId !== '' &&
      payment !== '' &&
      approval !== ''
    );

  /*
   * Rejected records can be evaluated without dates.
   */
  if (
    approval === 'rejected' ||
    stored === 'rejected'
  ) {

    var rejectedPass =
      scenario.expectedState === 'rejected';

    return [
      scenario.label || '',
      bookingId,
      'READY',
      payment,
      approval,
      stored,
      start || '',
      end || '',
      scenario.expectedState,
      'rejected',
      scenario.expectedLiveDisplay
        ? 'YES'
        : 'NO',
      'NO',
      rejectedPass
        ? 'PASS'
        : 'FAIL',
      rejectedPass
        ? 'Rejected booking correctly excluded.'
        : 'Expected rejected state but did not receive it.'
    ];

  }

  /*
   * If operational fields are absent, do NOT call this PASS.
   */
  if (!operationalReady) {

    return [
      scenario.label || '',
      bookingId,
      'NOT READY',
      payment,
      approval,
      stored,
      start || '',
      end || '',
      scenario.expectedState,
      '',
      scenario.expectedLiveDisplay
        ? 'YES'
        : 'NO',
      '',
      'NOT READY',
      buildEDBLifecycleNotReadyNoteV3_(
        payment,
        approval,
        start,
        end
      )
    ];

  }

  var actualState =
    getEDBAutomaticDisplayState(
      row,
      headerMap,
      EDB_LIFECYCLE_TEST_DATE
    );

  var actualLiveDisplay =
    actualState ===
    'currently displaying';

  var pass =
    actualState ===
      scenario.expectedState &&
    actualLiveDisplay ===
      scenario.expectedLiveDisplay;

  return [
    scenario.label || '',
    bookingId,
    'READY',
    payment,
    approval,
    stored,
    start || '',
    end || '',
    scenario.expectedState,
    actualState,
    scenario.expectedLiveDisplay
      ? 'YES'
      : 'NO',
    actualLiveDisplay
      ? 'YES'
      : 'NO',
    pass
      ? 'PASS'
      : 'FAIL',
    pass
      ? 'Actual lifecycle state matches expected scenario.'
      : 'LIFECYCLE MISMATCH: expected ' +
        scenario.expectedState +
        ', actual ' +
        actualState +
        '.'
  ];
}


/* ============================================================
   SCENARIO ROW DISCOVERY
   ============================================================ */

function findEDBLifecycleScenarioRowsV3_(
  data,
  headerMap
) {

  var map = {};

  var instructionColumn =
    headerMap[
      'display instructions / special requirements'
    ];

  if (
    instructionColumn === undefined
  ) {
    throw new Error(
      'Display Instructions / Special Requirements column not found.'
    );
  }

  for (
    var r = 1;
    r < data.length;
    r++
  ) {

    var text =
      String(
        data[r][instructionColumn] || ''
      ).toLowerCase();

    var match =
      text.match(
        /scenario\s+([0-9]+)/
      );

    if (!match) {
      continue;
    }

    var number =
      parseInt(
        match[1],
        10
      );

    if (
      number >= 1 &&
      number <= 10 &&
      map[number] === undefined
    ) {
      map[number] = r;
    }

  }

  return map;
}


/* ============================================================
   DATE RESOLUTION
   ============================================================ */

function getEDBLifecycleDateV3_(
  row,
  headerMap,
  names
) {

  for (
    var i = 0;
    i < names.length;
    i++
  ) {

    var name =
      names[i];

    if (
      Object.prototype.hasOwnProperty.call(
        headerMap,
        name
      )
    ) {

      var value =
        row[
          headerMap[name]
        ];

      if (
        value instanceof Date &&
        !isNaN(value.getTime())
      ) {
        return new Date(value.getTime());
      }

      if (
        value !== '' &&
        value !== null &&
        value !== undefined
      ) {

        var parsed =
          new Date(value);

        if (
          !isNaN(parsed.getTime())
        ) {
          return parsed;
        }

      }

    }

  }

  return '';
}


/* ============================================================
   HEADER MAP
   ============================================================ */

function buildEDBLifecycleHeaderMapV3_(
  headers
) {

  var map = {};

  headers.forEach(
    function(header, index) {

      var key =
        String(header || '')
          .toLowerCase()
          .replace(
            /^\s*\d+\.\s*/,
            ''
          )
          .replace(
            /\s+/g,
            ' '
          )
          .trim();

      if (key) {
        map[key] = index;
      }

    }
  );

  return map;
}


/* ============================================================
   REQUIRED HEADERS
   ============================================================ */

function requireEDBLifecycleHeadersV3_(
  headerMap
) {

  var required = [
    'booking id',
    'payment status',
    'approval status',
    'display status',
    'display instructions / special requirements'
  ];

  required.forEach(
    function(name) {

      if (
        !Object.prototype.hasOwnProperty.call(
          headerMap,
          name
        )
      ) {

        throw new Error(
          'Required column not found: ' +
          name
        );

      }

    }
  );
}


/* ============================================================
   VALUE HELPER
   ============================================================ */

function getEDBLifecycleValueV3_(
  row,
  headerMap,
  name
) {

  if (
    !Object.prototype.hasOwnProperty.call(
      headerMap,
      name
    )
  ) {
    return '';
  }

  var value =
    row[
      headerMap[name]
    ];

  if (
    value === null ||
    value === undefined
  ) {
    return '';
  }

  return String(value).trim();
}


/* ============================================================
   TEXT NORMALISATION
   ============================================================ */

function normaliseEDBLifecycleTextV3_(
  value
) {

  return String(
    value || ''
  )
    .trim()
    .toLowerCase();
}


/* ============================================================
   NOT READY NOTE
   ============================================================ */

function buildEDBLifecycleNotReadyNoteV3_(
  payment,
  approval,
  start,
  end
) {

  var missing = [];

  if (!payment) {
    missing.push('Payment Status');
  }

  if (!approval) {
    missing.push('Approval Status');
  }

  if (!start) {
    missing.push('Start Date');
  }

  if (!end) {
    missing.push('End Date');
  }

  return (
    'Live workflow data is incomplete. Missing/blank: ' +
    missing.join(', ') +
    '. No PASS assigned.'
  );
}


/* ============================================================
   00007 ONE-DAY BOUNDARY UNIT TEST
   ============================================================ */

function runEDBOneDayBoundaryAuditV3_() {

  var headerMap = {
    'approval status': 0,
    'payment status': 1,
    'display status': 2,
    'confirmed start date': 3,
    'confirmed end date': 4
  };

  var row = [
    'Approved',
    'Paid',
    'Scheduled',
    new Date(2026, 7, 31),
    new Date(2026, 7, 31)
  ];

  var onDay =
    getEDBAutomaticDisplayState(
      row,
      headerMap,
      new Date(2026, 7, 31, 12, 0, 0)
    );

  var nextDay =
    getEDBAutomaticDisplayState(
      row,
      headerMap,
      new Date(2026, 8, 1, 12, 0, 0)
    );

  var pass =
    onDay === 'currently displaying' &&
    nextDay === 'display period over';

  return {
    start: new Date(2026, 7, 31),
    end: new Date(2026, 7, 31),
    resultText:
      '31-Aug=' + onDay +
      '; 01-Sep=' + nextDay,
    actualText:
      '31-Aug=' + onDay +
      '; 01-Sep=' + nextDay,
    pass: pass,
    notes:
      pass
        ? '00007 one-day boundary rule passed.'
        : '00007 one-day boundary rule FAILED.'
  };
}
