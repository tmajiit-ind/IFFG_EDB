/*
============================================================
IFFG EDB - FULL SCENARIO SANDBOX TESTER
VERSION V2 - INDEPENDENT ORACLE
ASCII ONLY
============================================================

RUN:
  runEDBFullScenarioSandboxV2_ASCII()

SAFETY:
  - Form Responses 1 is READ ONLY.
  - No production booking is changed.
  - Only EDB SCENARIO TEST RESULTS TEMP is rebuilt.
  - 510 scenario rows are generated.
  - Expected state is calculated by an INDEPENDENT ORACLE.
  - Actual state is calculated by the live
    getEDBAutomaticDisplayState() function.
  - The TEMP sheet is then read back and verified.

TEST MATRIX:
  10 scenarios x 51 variants = 510 rows.

IMPORTANT:
  The expected result is NOT copied from the scenario definition.
  It is recalculated from the actual mutated test row.
  Therefore date/status mutations cannot create a false FAIL
  merely because the original scenario expectation was retained.

============================================================
*/

var EDB_SANDBOX_V2_SPREADSHEET_ID =
  '1hHdFRgj1YnBqQATLd94iEGuRDqxOIsQEd8w1DKmYQfQ';

var EDB_SANDBOX_V2_SHEET =
  'EDB SCENARIO TEST RESULTS TEMP';

var EDB_SANDBOX_V2_TEST_DATE =
  new Date(2026, 7, 28, 12, 0, 0, 0);

var EDB_SANDBOX_V2_VARIANTS =
  51;


/* ============================================================
   MAIN
   ============================================================ */

function runEDBFullScenarioSandboxV2_ASCII() {

  Logger.log(
    'EDB FULL SCENARIO SANDBOX V2 started.'
  );

  if (
    typeof getEDBAutomaticDisplayState !==
    'function'
  ) {
    throw new Error(
      'getEDBAutomaticDisplayState() is not available.'
    );
  }

  var ss =
    SpreadsheetApp.openById(
      EDB_SANDBOX_V2_SPREADSHEET_ID
    );

  var source =
    ss.getSheetByName(
      'Form Responses 1'
    );

  if (!source) {
    throw new Error(
      'Form Responses 1 not found.'
    );
  }

  var sourceData =
    source.getDataRange().getValues();

  if (sourceData.length < 2) {
    throw new Error(
      'Form Responses 1 contains no data rows.'
    );
  }

  var headers =
    sourceData[0].map(String);

  var headerMap =
    buildEDBSandboxV2HeaderMap_(
      headers
    );

  requireEDBSandboxV2Headers_(
    headerMap
  );

  var baseRow =
    sourceData[1].slice();

  var sheet =
    ss.getSheetByName(
      EDB_SANDBOX_V2_SHEET
    );

  if (!sheet) {
    sheet =
      ss.insertSheet(
        EDB_SANDBOX_V2_SHEET
      );
  }

  sheet.clear();
  sheet.clearFormats();

  var outputHeaders = [
    'Run Timestamp',
    'Scenario',
    'Variant',
    'Booking ID',
    'Resident',
    'Flat',
    'Material',
    'Duration',
    'Test Date',
    'Requested Start',
    'Requested End',
    'Final Start',
    'Final End',
    'Confirmed Start',
    'Confirmed End',
    'Payment',
    'Approval',
    'Stored Display Status',
    'Expected State',
    'Actual State',
    'Expected Live Display',
    'Actual Live Display',
    'Expected Eligible',
    'Actual Eligible',
    'Result',
    'Mutation',
    'Expected Basis',
    'Notes'
  ];

  var output =
    [outputHeaders];

  var scenarioDefinitions =
    buildEDBSandboxV2Scenarios_();

  var scenarioCounts = {};

  for (
    var s = 0;
    s < scenarioDefinitions.length;
    s++
  ) {

    var definition =
      scenarioDefinitions[s];

    scenarioCounts[
      definition.number
    ] = {
      name: definition.name,
      pass: 0,
      fail: 0
    };

    for (
      var v = 1;
      v <= EDB_SANDBOX_V2_VARIANTS;
      v++
    ) {

      var test =
        buildEDBSandboxV2TestRow_(
          definition,
          v,
          baseRow,
          headerMap
        );

      /*
       * INDEPENDENT ORACLE:
       * It does not call the production lifecycle function.
       */

      var expected =
        edbSandboxV2Oracle_(
          test.row,
          headerMap,
          EDB_SANDBOX_V2_TEST_DATE
        );

      var actual =
        getEDBAutomaticDisplayState(
          test.row,
          headerMap,
          EDB_SANDBOX_V2_TEST_DATE
        );

      var expectedLive =
        expected ===
        'currently displaying';

      var actualLive =
        actual ===
        'currently displaying';

      var expectedEligible =
        expected === 'scheduled' ||
        expected === 'currently displaying';

      var actualEligible =
        actual === 'scheduled' ||
        actual === 'currently displaying';

      var pass =
        expected === actual &&
        expectedLive === actualLive &&
        expectedEligible === actualEligible;

      if (pass) {
        scenarioCounts[
          definition.number
        ].pass++;
      } else {
        scenarioCounts[
          definition.number
        ].fail++;
      }

      output.push([
        new Date(),
        definition.name,
        v,
        test.bookingId,
        displaySandboxValue_(
          test.resident
        ),
        displaySandboxValue_(
          test.flat
        ),
        displaySandboxValue_(
          test.material
        ),
        displaySandboxValue_(
          test.duration
        ),
        EDB_SANDBOX_V2_TEST_DATE,
        displaySandboxValue_(
          test.requestedStart
        ),
        displaySandboxValue_(
          test.requestedEnd
        ),
        displaySandboxValue_(
          test.finalStart
        ),
        displaySandboxValue_(
          test.finalEnd
        ),
        displaySandboxValue_(
          test.confirmedStart
        ),
        displaySandboxValue_(
          test.confirmedEnd
        ),
        displaySandboxValue_(
          test.payment
        ),
        displaySandboxValue_(
          test.approval
        ),
        displaySandboxValue_(
          test.stored
        ),
        expected,
        actual,
        expectedLive ? 'YES' : 'NO',
        actualLive ? 'YES' : 'NO',
        expectedEligible ? 'YES' : 'NO',
        actualEligible ? 'YES' : 'NO',
        pass ? 'PASS' : 'FAIL',
        test.mutation,
        'Independent oracle',
        pass
          ? 'Expected and actual lifecycle state agree.'
          : 'EXPECTED/ACTUAL MISMATCH'
      ]);
    }
  }

  /*
   * Structural assertion before writing.
   * This prevents the previous 27-vs-28 error from ever
   * reaching setValues().
   */

  var width =
    outputHeaders.length;

  for (
    var r = 0;
    r < output.length;
    r++
  ) {

    if (
      output[r].length !== width
    ) {
      throw new Error(
        'INTERNAL ROW WIDTH ERROR at output row ' +
        (r + 1) +
        ': data=' +
        output[r].length +
        ', header=' +
        width
      );
    }
  }

  Logger.log(
    'STRUCTURE CHECK PASS. Columns=' +
    width +
    ', Data rows=' +
    (output.length - 1)
  );

  sheet
    .getRange(
      1,
      1,
      output.length,
      width
    )
    .setValues(output);

  formatEDBSandboxV2Sheet_(
    sheet,
    output.length,
    width
  );

  SpreadsheetApp.flush();

  /*
   * Read the TEMP sheet back.
   */

  var readback =
    verifyEDBSandboxV2Readback_(
      sheet
    );

  Logger.log(
    'READBACK COMPLETE. ROWS=' +
    readback.rows +
    ', PASS=' +
    readback.pass +
    ', FAIL=' +
    readback.fail
  );

  /*
   * Scenario-by-scenario report.
   */

  for (
    var key in scenarioCounts
  ) {

    if (
      Object.prototype.hasOwnProperty.call(
        scenarioCounts,
        key
      )
    ) {

      Logger.log(
        'SCENARIO ' +
        key +
        ' - ' +
        scenarioCounts[key].name +
        ' | PASS=' +
        scenarioCounts[key].pass +
        ' | FAIL=' +
        scenarioCounts[key].fail
      );
    }
  }

  if (
    readback.fail > 0
  ) {

    throw new Error(
      'EDB FULL SCENARIO SANDBOX V2 FAILED. ' +
      'PASS=' + readback.pass +
      ', FAIL=' + readback.fail
    );
  }

  Logger.log(
    'EDB FULL SCENARIO SANDBOX V2 PASS. ' +
    'ALL 510 ROWS VERIFIED.'
  );

  ss.setActiveSheet(
    sheet
  );

  return readback;
}


/* ============================================================
   TEN CANONICAL SCENARIOS
   ============================================================ */

function buildEDBSandboxV2Scenarios_() {

  return [

    {
      number: 1,
      name: 'Scenario 1 - New submission',
      payment: '',
      approval: '',
      stored: '',
      start: null,
      end: null
    },

    {
      number: 2,
      name: 'Scenario 2 - Approved awaiting payment',
      payment: 'Pending',
      approval: 'Approved',
      stored: '',
      start: new Date(2026, 8, 6),
      end: new Date(2026, 8, 8)
    },

    {
      number: 3,
      name: 'Scenario 3 - Paid awaiting scheduling',
      payment: 'Paid',
      approval: 'Approved',
      stored: 'Payment Received',
      start: null,
      end: null
    },

    {
      number: 4,
      name: 'Scenario 4 - Scheduled future',
      payment: 'Paid',
      approval: 'Approved',
      stored: 'Scheduled',
      start: new Date(2026, 8, 10),
      end: new Date(2026, 9, 9)
    },

    {
      number: 5,
      name: 'Scenario 5 - Starts today',
      payment: 'Paid',
      approval: 'Approved',
      stored: 'Scheduled',
      start: new Date(2026, 7, 28),
      end: new Date(2026, 7, 30)
    },

    {
      number: 6,
      name: 'Scenario 6 - Currently displaying',
      payment: 'Paid',
      approval: 'Approved',
      stored: 'Scheduled',
      start: new Date(2026, 7, 25),
      end: new Date(2026, 7, 31)
    },

    {
      number: 7,
      name: 'Scenario 7 - One day period over',
      payment: 'Paid',
      approval: 'Approved',
      stored: 'Scheduled',
      start: new Date(2026, 7, 26),
      end: new Date(2026, 7, 26)
    },

    {
      number: 8,
      name: 'Scenario 8 - Multi-day period over',
      payment: 'Paid',
      approval: 'Approved',
      stored: 'Scheduled',
      start: new Date(2026, 7, 20),
      end: new Date(2026, 7, 22)
    },

    {
      number: 9,
      name: 'Scenario 9 - Rejected',
      payment: 'Paid',
      approval: 'Rejected',
      stored: 'Rejected',
      start: new Date(2026, 8, 12),
      end: new Date(2026, 8, 12)
    },

    {
      number: 10,
      name: 'Scenario 10 - Future scheduled booking',
      payment: 'Paid',
      approval: 'Approved',
      stored: 'Scheduled',
      start: new Date(2026, 8, 20),
      end: new Date(2026, 9, 19)
    }

  ];
}


/* ============================================================
   TEST ROW GENERATOR
   ============================================================ */

function buildEDBSandboxV2TestRow_(
  definition,
  variant,
  baseRow,
  headerMap
) {

  var row =
    baseRow.slice();

  var bookingId =
    'EDB-SANDBOX-V2-' +
    String(definition.number).padStart(2, '0') +
    '-' +
    String(variant).padStart(3, '0');

  var payment =
    definition.payment;

  var approval =
    definition.approval;

  var stored =
    definition.stored;

  var start =
    cloneEDBSandboxV2Date_(
      definition.start
    );

  var end =
    cloneEDBSandboxV2Date_(
      definition.end
    );

  var mutation =
    'Canonical scenario';

  setEDBSandboxV2Value_(
    row,
    headerMap,
    'booking id',
    bookingId
  );

  /*
   * Variants 1-10:
   * stored Display Status variations.
   */

  if (
    variant >= 2 &&
    variant <= 10
  ) {

    var storedVariants = [
      '',
      'Scheduled',
      'scheduled',
      ' SCHEDULED ',
      'Payment Received',
      'payment received',
      'Rejected',
      'rejected',
      'Archived'
    ];

    stored =
      storedVariants[
        variant - 2
      ];

    mutation =
      'Stored Display Status variation';
  }

  /*
   * Variants 11-20:
   * date boundary mutations.
   *
   * The oracle recalculates expected state from these
   * dates, so these are genuine tests rather than fixed
   * expected labels.
   */

  if (
    variant >= 11 &&
    variant <= 20
  ) {

    var delta =
      variant - 15;

    if (
      definition.number === 4 ||
      definition.number === 10
    ) {

      start =
        addDaysEDBSandboxV2_(
          EDB_SANDBOX_V2_TEST_DATE,
          delta
        );

      end =
        addDaysEDBSandboxV2_(
          start,
          29
        );

      mutation =
        'Future date boundary variation';

    } else if (
      definition.number === 5 ||
      definition.number === 6
    ) {

      start =
        addDaysEDBSandboxV2_(
          EDB_SANDBOX_V2_TEST_DATE,
          delta
        );

      end =
        addDaysEDBSandboxV2_(
          start,
          1
        );

      mutation =
        'Current period date boundary variation';

    } else {

      mutation =
        'Date boundary control';
    }
  }

  /*
   * Variants 21-30:
   * status normalization and combinations.
   */

  if (
    variant >= 21 &&
    variant <= 30
  ) {

    var statusIndex =
      variant - 21;

    var paymentVariants = [
      payment,
      'paid',
      ' PAID ',
      'Paid',
      'pending',
      ' Pending ',
      'unpaid',
      ' UNPAID ',
      payment,
      payment
    ];

    var approvalVariants = [
      approval,
      'approved',
      ' APPROVED ',
      'Approved',
      'rejected',
      ' Rejected ',
      'pending',
      ' Pending ',
      approval,
      approval
    ];

    payment =
      paymentVariants[
        statusIndex
      ];

    approval =
      approvalVariants[
        statusIndex
      ];

    mutation =
      'Workflow status normalization variation';
  }

  /*
   * Variants 31-40:
   * date-source precedence.
   *
   * Only one date source is populated.
   */

  if (
    variant >= 31 &&
    variant <= 40
  ) {

    clearEDBSandboxV2Dates_(
      row,
      headerMap
    );

    var dateMode =
      variant - 31;

    if (
      dateMode <= 2
    ) {

      setEDBSandboxV2Date_(
        row,
        headerMap,
        'confirmed start date',
        start
      );

      setEDBSandboxV2Date_(
        row,
        headerMap,
        'confirmed end date',
        end
      );

      mutation =
        'Confirmed date source only';

    } else if (
      dateMode <= 5
    ) {

      setEDBSandboxV2Date_(
        row,
        headerMap,
        'final start date',
        start
      );

      setEDBSandboxV2Date_(
        row,
        headerMap,
        'final end date',
        end
      );

      mutation =
        'Final date source only';

    } else {

      setEDBSandboxV2Date_(
        row,
        headerMap,
        'requested start date',
        start
      );

      setEDBSandboxV2Date_(
        row,
        headerMap,
        'requested end date',
        end
      );

      mutation =
        'Requested date source only';
    }
  }

  /*
   * Variants 41-50:
   * combinations of date boundaries and stored status.
   */

  if (
    variant >= 41 &&
    variant <= 50
  ) {

    var combinedDelta =
      variant - 45;

    if (
      definition.number === 4 ||
      definition.number === 5 ||
      definition.number === 6 ||
      definition.number === 10
    ) {

      start =
        addDaysEDBSandboxV2_(
          EDB_SANDBOX_V2_TEST_DATE,
          combinedDelta
        );

      end =
        addDaysEDBSandboxV2_(
          start,
          1
        );
    }

    if (
      variant % 2 === 0
    ) {
      stored =
        'Scheduled';
    }

    mutation =
      'Combined date/status variation';
  }

  /*
   * Variant 51 is a clean canonical control.
   */

  if (
    variant === 51
  ) {

    payment =
      definition.payment;

    approval =
      definition.approval;

    stored =
      definition.stored;

    start =
      cloneEDBSandboxV2Date_(
        definition.start
      );

    end =
      cloneEDBSandboxV2Date_(
        definition.end
      );

    mutation =
      'Canonical control';
  }

  /*
   * Apply workflow values.
   */

  setEDBSandboxV2Value_(
    row,
    headerMap,
    'payment status',
    payment
  );

  setEDBSandboxV2Value_(
    row,
    headerMap,
    'approval status',
    approval
  );

  setEDBSandboxV2Value_(
    row,
    headerMap,
    'display status',
    stored
  );

  /*
   * Ordinary variants have all date sources populated.
   * Date-source variants deliberately have only one source.
   */

  if (
    variant < 31 ||
    variant > 40
  ) {

    setEDBSandboxV2Date_(
      row,
      headerMap,
      'confirmed start date',
      start
    );

    setEDBSandboxV2Date_(
      row,
      headerMap,
      'confirmed end date',
      end
    );

    setEDBSandboxV2Date_(
      row,
      headerMap,
      'final start date',
      start
    );

    setEDBSandboxV2Date_(
      row,
      headerMap,
      'final end date',
      end
    );

    setEDBSandboxV2Date_(
      row,
      headerMap,
      'requested start date',
      start
    );

    setEDBSandboxV2Date_(
      row,
      headerMap,
      'requested end date',
      end
    );
  }

  return {
    row: row,
    resident:
      getEDBSandboxV2Value_(
        row,
        headerMap,
        'resident'
      ),
    flat:
      getEDBSandboxV2Value_(
        row,
        headerMap,
        'flat'
      ),
    material:
      getEDBSandboxV2Value_(
        row,
        headerMap,
        'material'
      ),
    duration:
      getEDBSandboxV2Value_(
        row,
        headerMap,
        'duration'
      ),
    requestedStart:
      getEDBSandboxV2Value_(
        row,
        headerMap,
        'requested start date'
      ),
    requestedEnd:
      getEDBSandboxV2Value_(
        row,
        headerMap,
        'requested end date'
      ),
    finalStart:
      getEDBSandboxV2Value_(
        row,
        headerMap,
        'final start date'
      ),
    finalEnd:
      getEDBSandboxV2Value_(
        row,
        headerMap,
        'final end date'
      ),
    confirmedStart:
      getEDBSandboxV2Value_(
        row,
        headerMap,
        'confirmed start date'
      ),
    confirmedEnd:
      getEDBSandboxV2Value_(
        row,
        headerMap,
        'confirmed end date'
      ),
    payment: payment,
    approval: approval,
    stored: stored,
    bookingId: bookingId,
    mutation: mutation
  };
}


/* ============================================================
   INDEPENDENT ORACLE
   ============================================================ */

function edbSandboxV2Oracle_(
  row,
  headerMap,
  nowOverride
) {

  var approval =
    edbSandboxV2NormaliseStatus_(
      getEDBSandboxV2Value_(
        row,
        headerMap,
        'approval status'
      )
    );

  var payment =
    edbSandboxV2NormaliseStatus_(
      getEDBSandboxV2Value_(
        row,
        headerMap,
        'payment status'
      )
    );

  var stored =
    edbSandboxV2NormaliseStatus_(
      getEDBSandboxV2Value_(
        row,
        headerMap,
        'display status'
      )
    );

  /*
   * This deliberately mirrors the lifecycle contract,
   * without calling getEDBAutomaticDisplayState().
   */

  if (
    approval === 'rejected' ||
    stored === 'rejected' ||
    stored === 'archived'
  ) {
    return 'rejected';
  }

  if (
    payment !== 'paid' ||
    approval !== 'approved'
  ) {
    return stored || 'pending';
  }

  var startRaw =
    firstNonBlankEDBSandboxV2_(
      getEDBSandboxV2Value_(
        row,
        headerMap,
        'confirmed start date'
      ),
      getEDBSandboxV2Value_(
        row,
        headerMap,
        'final start date'
      ),
      getEDBSandboxV2Value_(
        row,
        headerMap,
        'requested start date'
      )
    );

  var endRaw =
    firstNonBlankEDBSandboxV2_(
      getEDBSandboxV2Value_(
        row,
        headerMap,
        'confirmed end date'
      ),
      getEDBSandboxV2Value_(
        row,
        headerMap,
        'final end date'
      ),
      getEDBSandboxV2Value_(
        row,
        headerMap,
        'requested end date'
      )
    );

  var start =
    edbSandboxV2DateOnly_(
      startRaw
    );

  var end =
    edbSandboxV2DateOnly_(
      endRaw
    );

  if (
    !start ||
    !end
  ) {
    return stored || 'scheduled';
  }

  var now =
    edbSandboxV2DateOnly_(
      nowOverride
    );

  if (!now) {
    return stored || 'scheduled';
  }

  if (
    now < start
  ) {
    return 'scheduled';
  }

  if (
    now > end
  ) {
    return 'display period over';
  }

  return 'currently displaying';
}


/* ============================================================
   READBACK
   ============================================================ */

function verifyEDBSandboxV2Readback_(
  sheet
) {

  var data =
    sheet.getDataRange().getValues();

  var expectedRows =
    10 *
    EDB_SANDBOX_V2_VARIANTS;

  if (
    data.length !==
    expectedRows + 1
  ) {

    throw new Error(
      'TEMP sheet row count is ' +
      data.length +
      '. Expected ' +
      (expectedRows + 1) +
      ' including header.'
    );
  }

  var header =
    data[0];

  var map = {};

  header.forEach(
    function(name, index) {
      map[
        String(name)
      ] = index;
    }
  );

  var requiredColumns = [
    'Scenario',
    'Variant',
    'Booking ID',
    'Expected State',
    'Actual State',
    'Expected Live Display',
    'Actual Live Display',
    'Expected Eligible',
    'Actual Eligible',
    'Result',
    'Mutation',
    'Expected Basis'
  ];

  requiredColumns.forEach(
    function(name) {

      if (
        !Object.prototype.hasOwnProperty.call(
          map,
          name
        )
      ) {

        throw new Error(
          'TEMP sheet missing column: ' +
          name
        );
      }
    }
  );

  var pass = 0;
  var fail = 0;

  for (
    var r = 1;
    r < data.length;
    r++
  ) {

    var row =
      data[r];

    var expectedState =
      String(
        row[map['Expected State']] || ''
      );

    var actualState =
      String(
        row[map['Actual State']] || ''
      );

    var expectedLive =
      String(
        row[map['Expected Live Display']] || ''
      );

    var actualLive =
      String(
        row[map['Actual Live Display']] || ''
      );

    var expectedEligible =
      String(
        row[map['Expected Eligible']] || ''
      );

    var actualEligible =
      String(
        row[map['Actual Eligible']] || ''
      );

    var result =
      String(
        row[map['Result']] || ''
      );

    var internallyConsistent =
      (
        actualLive ===
        (
          actualState ===
          'currently displaying'
            ? 'YES'
            : 'NO'
        )
      ) &&
      (
        actualEligible === 'YES'
          ? (
              actualState === 'scheduled' ||
              actualState === 'currently displaying'
            )
          : (
              actualState !== 'scheduled' &&
              actualState !== 'currently displaying'
            )
      );

    if (
      result === 'PASS' &&
      expectedState === actualState &&
      expectedLive === actualLive &&
      expectedEligible === actualEligible &&
      internallyConsistent
    ) {

      pass++;

    } else {

      fail++;

      Logger.log(
        'FAIL ROW ' +
        (r + 1) +
        ' | Scenario=' +
        row[map['Scenario']] +
        ' | Variant=' +
        row[map['Variant']] +
        ' | Booking=' +
        row[map['Booking ID']] +
        ' | Expected=' +
        expectedState +
        ' | Actual=' +
        actualState +
        ' | Mutation=' +
        row[map['Mutation']]
      );
    }
  }

  return {
    rows: data.length - 1,
    pass: pass,
    fail: fail
  };
}


/* ============================================================
   HEADER / VALUE HELPERS
   ============================================================ */

function buildEDBSandboxV2HeaderMap_(
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

function requireEDBSandboxV2Headers_(
  map
) {

  [
    'booking id',
    'payment status',
    'approval status',
    'display status',
    'confirmed start date',
    'confirmed end date',
    'final start date',
    'final end date',
    'requested start date',
    'requested end date'
  ].forEach(
    function(name) {

      if (
        !Object.prototype.hasOwnProperty.call(
          map,
          name
        )
      ) {

        throw new Error(
          'Required header not found: ' +
          name
        );
      }
    }
  );
}

function getEDBSandboxV2Value_(
  row,
  map,
  name
) {

  if (
    !Object.prototype.hasOwnProperty.call(
      map,
      name
    )
  ) {
    return '';
  }

  return row[map[name]];
}

function setEDBSandboxV2Value_(
  row,
  map,
  name,
  value
) {

  if (
    Object.prototype.hasOwnProperty.call(
      map,
      name
    )
  ) {
    row[map[name]] = value;
  }
}

function setEDBSandboxV2Date_(
  row,
  map,
  name,
  value
) {

  if (
    Object.prototype.hasOwnProperty.call(
      map,
      name
    )
  ) {
    row[map[name]] =
      value || '';
  }
}

function clearEDBSandboxV2Dates_(
  row,
  map
) {

  [
    'confirmed start date',
    'confirmed end date',
    'final start date',
    'final end date',
    'requested start date',
    'requested end date'
  ].forEach(
    function(name) {

      if (
        Object.prototype.hasOwnProperty.call(
          map,
          name
        )
      ) {
        row[map[name]] = '';
      }
    }
  );
}


/* ============================================================
   ORACLE HELPERS
   ============================================================ */

function edbSandboxV2NormaliseStatus_(
  value
) {

  return String(
    value == null ? '' : value
  )
    .trim()
    .toLowerCase();
}

function firstNonBlankEDBSandboxV2_() {

  for (
    var i = 0;
    i < arguments.length;
    i++
  ) {

    var value =
      arguments[i];

    if (
      value !== null &&
      value !== undefined &&
      String(value).trim() !== ''
    ) {
      return value;
    }
  }

  return '';
}

function edbSandboxV2DateOnly_(
  value
) {

  if (
    value instanceof Date &&
    !isNaN(value.getTime())
  ) {

    return new Date(
      value.getFullYear(),
      value.getMonth(),
      value.getDate()
    );
  }

  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ''
  ) {
    return null;
  }

  var parsed =
    new Date(value);

  if (
    isNaN(parsed.getTime())
  ) {
    return null;
  }

  return new Date(
    parsed.getFullYear(),
    parsed.getMonth(),
    parsed.getDate()
  );
}


/* ============================================================
   GENERAL HELPERS
   ============================================================ */

function cloneEDBSandboxV2Date_(
  value
) {

  if (
    value instanceof Date &&
    !isNaN(value.getTime())
  ) {
    return new Date(
      value.getTime()
    );
  }

  return null;
}

function addDaysEDBSandboxV2_(
  date,
  days
) {

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + days
  );
}

function displaySandboxValue_(
  value
) {

  if (
    value instanceof Date &&
    !isNaN(value.getTime())
  ) {

    return Utilities.formatDate(
      value,
      Session.getScriptTimeZone(),
      'dd-MMM-yyyy'
    );
  }

  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ''
  ) {
    return '-';
  }

  return value;
}


/* ============================================================
   FORMATTING
   ============================================================ */

function formatEDBSandboxV2Sheet_(
  sheet,
  rowCount,
  columnCount
) {

  sheet
    .getRange(
      1,
      1,
      1,
      columnCount
    )
    .setFontWeight('bold')
    .setWrap(true);

  sheet.setFrozenRows(1);

  sheet
    .getRange(
      2,
      9,
      rowCount - 1,
      1
    )
    .setNumberFormat(
      'dd-mmm-yyyy'
    );

  for (
    var c = 1;
    c <= columnCount;
    c++
  ) {

    sheet.setColumnWidth(
      c,
      c === 26 ? 260 : 145
    );
  }

  SpreadsheetApp.flush();
}
