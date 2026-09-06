/* ============================================================
   IFFG EDB - ADMIN UI
   OPERATIONS CONSOLE + BOOKING DETAIL - V11 DATE RESOLUTION
   ============================================================

   THIS IS THE AUTHORITATIVE EDB ADMIN UI FILE.

   Contains:
     - Screen 1 - Operations Console
     - Screen 2 - Booking Detail
     - Screen 1 -> Screen 2 navigation
     - Screen 2 -> Screen 1 navigation
     - Screen 2 Approve / Reject actions
     - Screen 2 WhatsApp payment-request action
     - Rich Text VIEW FILE hyperlink
     - Rich Text WhatsApp payment link
     - Trigger installer / diagnostic

   Production backend helpers remain in displayboard.gs.
   EDB Admin UI - LIVE READONLY.gs remains a read-only adapter.
   ============================================================ */


/* ============================================================
   UI SHEET ACCESSOR
   ============================================================

   The old separate DESIGN sheet is no longer part of the
   workbook. This file now owns the UI sheet itself.

   If the UI sheet does not exist, it is created automatically.

   The source file is ASCII-only.
   ============================================================ */

function getEDBAdminUISheet_(ss) {

  const UI_SHEET_NAME = 'EDB Admin UI';

  let sheet = ss.getSheetByName(UI_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(UI_SHEET_NAME);
  }

  return sheet;
}


/* ============================================================
   SCREEN 1 - OPERATIONS CONSOLE
   ============================================================ */

function buildEDBAdminUICompact() {
  const SPREADSHEET_ID =
    '1hHdFRgj1YnBqQATLd94iEGuRDqxOIsQEd8w1DKmYQfQ';

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = getEDBAdminUISheet_(ss);
  const source = ss.getSheetByName('Form Responses 1');

  if (!sheet) {
    throw new Error('EDB Admin UI sheet could not be created or found.');
  }

  if (!source) {
    throw new Error('Form Responses 1 not found.');
  }

  // ------------------------------------------------------------
  // READ LIVE SOURCE DATA
  // ------------------------------------------------------------

  const data = source.getDataRange().getValues();

  if (data.length < 2) {
    throw new Error('Form Responses 1 contains no booking records.');
  }

  const headers = data[0].map(String);

  function normalizeHeader(value) {
  return String(value || '')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function col(name) {
  const wanted = normalizeHeader(name);

  const index = headers.findIndex(function(header) {
    return normalizeHeader(header) === wanted;
  });

  if (index === -1) {
    throw new Error(
      'Column not found: ' + name +
      '\nActual headers: ' + headers.join(' | ')
    );
  }

  return index;
}

  function text(value) {
    return value === null || value === undefined
      ? ''
      : String(value).trim();
  }

  function lower(value) {
    return text(value).toLowerCase();
  }

    const bookingCol = col('Booking ID');
  const residentCol = col('2. Resident Name');
  const flatCol = col('1. Flat No');
  const materialCol =
    col('4. What type of material are you submitting?');
  const durationCol = col('4. Desired Display Duration');
  const amountCol = col('Total Payable');
  const approvalCol = col('Approval Status');
  const paymentCol = col('Payment Status');
  const displayCol = col('Display Status');

  // ------------------------------------------------------------
  // DISPLAY DATE SOURCES
  //
  // Priority:
  //   Confirmed Start/End
  //   Final Start/End
  //   Requested Start/End
  // ------------------------------------------------------------

  const confirmedStartCol = col('Confirmed Start Date');
  const confirmedEndCol = col('Confirmed End Date');
  const finalStartCol = col('Final Start Date');
  const finalEndCol = col('Final End Date');
  const requestedStartCol = col('Requested Start Date');
  const requestedEndCol = col('Requested End Date');

  const scriptTimeZone =
    Session.getScriptTimeZone();

  function firstDateValue(row, columns) {
    for (let i = 0; i < columns.length; i++) {
      const value = row[columns[i]];

      if (
        value !== '' &&
        value !== null &&
        value !== undefined
      ) {
        return value;
      }
    }

    return '';
  }

  function calendarDateKey(value) {

    if (
      value === '' ||
      value === null ||
      value === undefined
    ) {
      return '';
    }

    if (
      Object.prototype.toString.call(value) === '[object Date]' &&
      !isNaN(value.getTime())
    ) {
      return Utilities.formatDate(
        value,
        scriptTimeZone,
        'yyyy-MM-dd'
      );
    }

    const parsed = new Date(value);

    if (!isNaN(parsed.getTime())) {
      return Utilities.formatDate(
        parsed,
        scriptTimeZone,
        'yyyy-MM-dd'
      );
    }

    return '';
  }

  function displayDateValue(value) {

    if (
      value === '' ||
      value === null ||
      value === undefined
    ) {
      return '';
    }

    if (
      Object.prototype.toString.call(value) === '[object Date]' &&
      !isNaN(value.getTime())
    ) {
      return value;
    }

    const parsed = new Date(value);

    return isNaN(parsed.getTime())
      ? value
      : parsed;
  }

  // ------------------------------------------------------------
  // BUILD LIVE BOOKING RECORDS
  // ------------------------------------------------------------

  const records = [];

  const todayKey =
    Utilities.formatDate(
      new Date(),
      scriptTimeZone,
      'yyyy-MM-dd'
    );

  for (let r = 1; r < data.length; r++) {

    const row = data[r];

    const bookingId =
      text(row[bookingCol]);

    if (!bookingId) continue;

    const approval =
      lower(row[approvalCol]);

    const payment =
      lower(row[paymentCol]);

    const display =
      lower(row[displayCol]);

    // ----------------------------------------------------------
    // RESOLVE AUTHORITATIVE DISPLAY DATES
    // ----------------------------------------------------------

    const startValue =
      firstDateValue(row, [
        confirmedStartCol,
        finalStartCol,
        requestedStartCol
      ]);

    const endValue =
      firstDateValue(row, [
        confirmedEndCol,
        finalEndCol,
        requestedEndCol
      ]);

    const startKey =
      calendarDateKey(startValue);

    const endKey =
      calendarDateKey(endValue);

    let stage = '';

    // ----------------------------------------------------------
    // REJECTION ALWAYS WINS
    // ----------------------------------------------------------

    if (
      approval === 'rejected' ||
      display === 'rejected'
    ) {

      stage = 'Rejected';

    }

    // ----------------------------------------------------------
    // WORKFLOW STATE HAS PRIORITY OVER STORED DISPLAY STATUS
    //
    // A stale Display Status must never promote a booking into
    // Scheduled or Displaying. Approval and payment are evaluated
    // first, then the automatic date lifecycle is applied.
    // ----------------------------------------------------------

    else if (
      approval === 'approved' &&
      payment === 'paid'
    ) {

      if (startKey && endKey) {

        if (todayKey < startKey) {

          stage = 'Scheduled';

        } else if (todayKey <= endKey) {

          stage = 'Displaying';

        } else {

          stage = 'Display Period Over';

        }

      } else {

        // Paid + Approved but no usable dates means the booking
        // still requires scheduling. Do not trust stale Display Status.
        stage = 'Payment Received';

      }

    }

    // ----------------------------------------------------------
    // APPROVED BUT NOT PAID
    // ----------------------------------------------------------

    else if (approval === 'approved') {

      stage = 'Awaiting Payment';

    }

    // ----------------------------------------------------------
    // PAID BUT NOT YET APPROVED
    // ----------------------------------------------------------

    else if (payment === 'paid') {

      stage = 'Payment Received';

    }

    // ----------------------------------------------------------
    // NEW / UNREVIEWED
    // ----------------------------------------------------------

    else {

      stage = 'Awaiting Review';

    }

    // ----------------------------------------------------------
    // STORE RECORD
    // ----------------------------------------------------------

    records.push({
      bookingId: bookingId,
      resident: text(row[residentCol]),
      flat: text(row[flatCol]),
      material: text(row[materialCol]),
      duration: text(row[durationCol]),
      amount: text(row[amountCol]),
      stage: stage,
      start: displayDateValue(startValue),
      end: displayDateValue(endValue)
    });
  }

  // ------------------------------------------------------------
  // RECORDS REQUIRING ADMIN ACTION
  // ------------------------------------------------------------

  const actionRows = records.filter(function(r) {
    return (
      r.stage === 'Awaiting Review' ||
      r.stage === 'Awaiting Payment' ||
      r.stage === 'Payment Received'
    );
  });

  // ------------------------------------------------------------
  // RESET UI SHEET
  // ------------------------------------------------------------

  const fullRange = sheet.getRange(
    1,
    1,
    sheet.getMaxRows(),
    sheet.getMaxColumns()
  );

  fullRange.getMergedRanges().forEach(function(range) {
    range.breakApart();
  });

  sheet.clear();
  sheet.clearFormats();
  sheet.setHiddenGridlines(true);

  // ------------------------------------------------------------
  // PAGE SETUP
  // ------------------------------------------------------------

  sheet.setFrozenRows(4);

  sheet.setColumnWidths(1, 8, 120);
  sheet.setColumnWidth(1, 145);
  sheet.setColumnWidth(2, 145);
  sheet.setColumnWidth(3, 110);
  sheet.setColumnWidth(4, 110);
  sheet.setColumnWidth(5, 145);
  sheet.setColumnWidth(6, 105);
  sheet.setColumnWidth(7, 125);
  sheet.setColumnWidth(8, 115);

  sheet.getRange('A1:H22')
    .setFontFamily('Arial')
    .setFontSize(10)
    .setVerticalAlignment('middle')
    .setWrap(true);

  // ------------------------------------------------------------
  // HEADER
  // ------------------------------------------------------------

  sheet.getRange('A1:H1').merge()
    .setValue('IFFG ELECTRONIC DISPLAY BOARD')
    .setFontSize(16)
    .setFontWeight('bold')
    .setHorizontalAlignment('center');

  sheet.getRange('A2:H2').merge()
    .setValue('ADMIN CONSOLE')
    .setFontSize(12)
    .setFontWeight('bold')
    .setHorizontalAlignment('center');

  sheet.getRange('A3:H3').merge()
    .setValue('Advertisement Booking Management')
    .setFontSize(9)
    .setHorizontalAlignment('center');

  // ------------------------------------------------------------
  // NAVIGATION
  // ------------------------------------------------------------

  const nav = [
    ['A4:B4', 'HOME'],
    ['C4:D4', 'ACTION REQUIRED'],
    ['E4:F4', 'DISPLAYS'],
    ['G4:H4', 'HISTORY']
  ];

  nav.forEach(function(item, index) {
    sheet.getRange(item[0]).merge()
      .setValue(item[1])
      .setHorizontalAlignment('center')
      .setFontWeight('bold')
      .setBorder(true, true, true, true, true, true);

    if (index === 0) {
      sheet.getRange(item[0])
        .setBackground('#e8f0fe');
    }
  });

  // ------------------------------------------------------------
  // STATUS COUNTS
  // ------------------------------------------------------------

  const reviewCount =
    records.filter(r => r.stage === 'Awaiting Review').length;

  const paymentCount =
    records.filter(r => r.stage === 'Awaiting Payment').length;

  const receivedCount =
    records.filter(r => r.stage === 'Payment Received').length;

  const displayingCount =
    records.filter(r =>
      r.stage === 'Displaying' ||
      r.stage === 'Scheduled'
    ).length;

  const cards = [
    ['A6:B7', 'NEW / REVIEW', reviewCount, '#fce8e6'],
    ['C6:D7', 'AWAITING PAYMENT', paymentCount, '#fff4ce'],
    ['E6:F7', 'PAYMENT RECEIVED', receivedCount, '#e6f4ea'],
    ['G6:H7', 'SCHEDULED / DISPLAYING', displayingCount, '#e8f0fe']
  ];

  cards.forEach(function(card) {
    sheet.getRange(card[0]).merge()
      .setValue(card[1] + '\n' + card[2])
      .setBackground(card[3])
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle')
      .setFontWeight('bold')
      .setBorder(true, true, true, true, true, true);
  });

  // ------------------------------------------------------------
  // ACTION REQUIRED
  // ------------------------------------------------------------

  sheet.getRange('A9:H9').merge()
    .setValue('ACTION REQUIRED')
    .setFontSize(12)
    .setFontWeight('bold');

  sheet.getRange('A10:H10').setValues([[
    'Booking',
    'Resident',
    'Flat',
    'Material',
    'Status',
    'Amount',
    'Start',
    'OPEN'
  ]])
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setBorder(true, true, true, true, true, true);

  // Render every booking requiring admin action.
  // There is deliberately NO fixed 2/3-row limit.
  const actionStartRow = 11;
  const actionCount = actionRows.length;
  const actionRenderCount = Math.max(actionCount, 1);
  const actionEndRow = actionStartRow + actionRenderCount - 1;

  const actionValues = actionRows.map(function(r) {
    return [
      r.bookingId,
      r.resident,
      r.flat,
      r.material,
      r.stage,
      r.amount,
      r.start,
      false
    ];
  });

  if (actionValues.length === 0) {
    actionValues.push(['', '', '', '', '', '', '', false]);
  }

  sheet.getRange(actionStartRow, 1, actionRenderCount, 8)
    .setValues(actionValues)
    .setBorder(true, true, true, true, true, true);

  // REAL CHECKBOXES.
  sheet.getRange(actionStartRow, 8, actionRenderCount, 1)
    .setDataValidation(
      SpreadsheetApp.newDataValidation()
        .requireCheckbox()
        .build()
    )
    .setBackground('#e8f0fe')
    .setHorizontalAlignment('center');

  // ------------------------------------------------------------
  // CURRENT / UPCOMING DISPLAYS
  // ------------------------------------------------------------

  const displayRows = records.filter(function(r) {
    return (
      r.stage === 'Displaying' ||
      r.stage === 'Scheduled'
    );
  });

  // Render every current/upcoming display.
  // There is deliberately NO fixed 2-row limit.
  const displayStartRow = actionEndRow + 4;
  const displayHeaderRow = displayStartRow;
  const displayColumnHeaderRow = displayStartRow + 1;
  const displayDataStartRow = displayStartRow + 2;
  const displayCount = displayRows.length;
  const displayRenderCount = Math.max(displayCount, 1);
  const displayEndRow = displayDataStartRow + displayRenderCount - 1;

  sheet.getRange(displayHeaderRow, 1, 1, 8).merge()
    .setValue('CURRENT / UPCOMING DISPLAYS')
    .setFontSize(12)
    .setFontWeight('bold');

  sheet.getRange(displayColumnHeaderRow, 1, 1, 8).setValues([[
    'Booking',
    'Resident',
    'Flat',
    'Material',
    'Start',
    'End',
    'Display Status',
    'Amount'
  ]])
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setBorder(true, true, true, true, true, true);

  const displayValues = displayRows.map(function(r) {
    return [
      r.bookingId,
      r.resident,
      r.flat,
      r.material,
      r.start,
      r.end,
      r.stage,
      r.amount
    ];
  });

  if (displayValues.length === 0) {
    displayValues.push(['', '', '', '', '', '', '', '']);
  }

  sheet.getRange(displayDataStartRow, 1, displayRenderCount, 8)
    .setValues(displayValues)
    .setBorder(true, true, true, true, true, true);

  // ------------------------------------------------------------
  // WORKFLOW
  // ------------------------------------------------------------

  const workflowHeaderRow = displayEndRow + 2;
  const workflowTextRow = workflowHeaderRow + 1;
  const workflowEndRow = workflowHeaderRow + 2;

  sheet.getRange(1, 1, workflowEndRow, 8)
    .setFontFamily('Arial')
    .setFontSize(10)
    .setVerticalAlignment('middle')
    .setWrap(true);

  sheet.getRange(workflowHeaderRow, 1, 1, 8).merge()
    .setValue(
      'WORKFLOW:  REVIEW  ->  PAYMENT  ->  SCHEDULE  ->  DISPLAY'
    )
    .setFontWeight('bold')
    .setHorizontalAlignment('center');

  sheet.getRange(workflowTextRow, 1, 2, 8).merge()
    .setValue(
      'Select OPEN for a booking to view its Booking Detail.'
    )
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setWrap(true);

  // ------------------------------------------------------------
  // ROW HEIGHTS
  // ------------------------------------------------------------

  sheet.setRowHeight(1, 27);
  sheet.setRowHeight(2, 22);
  sheet.setRowHeight(3, 19);
  sheet.setRowHeight(4, 24);
  sheet.setRowHeights(6, 2, 31);
  sheet.setRowHeight(9, 23);
  sheet.setRowHeight(10, 22);
  sheet.setRowHeights(11, 3, 23);
  sheet.setRowHeight(displayHeaderRow, 23);
  sheet.setRowHeight(displayColumnHeaderRow, 22);
  sheet.setRowHeights(displayDataStartRow, displayRenderCount, 23);
  sheet.setRowHeight(workflowHeaderRow, 22);
  sheet.setRowHeights(workflowTextRow, 2, 22);

  SpreadsheetApp.flush();

  Logger.log(
    'EDB Admin UI refreshed from Form Responses 1. Bookings: ' +
    records.length +
    ', Review: ' +
    reviewCount +
    ', Payment: ' +
    paymentCount +
    ', Received: ' +
    receivedCount +
    ', Displays: ' +
    displayingCount
  );
}


/* ============================================================
   SCREEN 2 - BOOKING DETAIL / ACTION
   ============================================================ */

/* ============================================================
   IFFG EDB - ADMIN UI
   SCREEN 2: BOOKING DETAIL / ACTION - V1
   ============================================================
   LIVE UI / NAVIGATION

   This file works alongside:
     EDB Admin UI - LIVE READONLY V1.gs

   It deliberately does NOT redeclare the V1 constants/helpers.

   TEST:
     Select REVIEW / VIEW / SCHEDULE on Screen 1.
     Or run showEDBBookingDetailLive() manually.

   IMPORTANT:
     This version does NOT change approval, payment, scheduling,
     or any Form Responses 1 data.

   The action area is state-aware:
     Awaiting Review  -> APPROVE BOOKING / REJECT
     Awaiting Payment -> SEND WHATSAPP
     Payment Received -> APPROVE & SCHEDULE
     Scheduled        -> SCHEDULED / VIEW STATUS
     Displaying       -> CURRENTLY DISPLAYING / VIEW STATUS
     Rejected         -> REJECTED / NO ACTION
     Completed        -> COMPLETED / VIEW HISTORY
   ============================================================ */

function showEDBBookingDetailLive(bookingId) {

  const ss = SpreadsheetApp.openById(
  '1hHdFRgj1YnBqQATLd94iEGuRDqxOIsQEd8w1DKmYQfQ'
);

const sheet = getEDBAdminUISheet_(ss);

  if (!sheet) {
    throw new Error('EDB Admin UI sheet could not be created or found.');
  }

  const responseSheet = getEDBResponseSheet(ss);
  const dataset = getEDBBookingRows(responseSheet);
  const headers = dataset.headers;
  const rows = dataset.rows;

  // Screen 1 passes the exact Booking ID. If run manually,
  // fall back to the first genuine Awaiting Review booking.
  let wantedId = String(bookingId || '').trim();

  if (!wantedId) {
    rows.some(function(row) {
      const id = String(
        getEDBValue(row, headers, 'Booking ID') || ''
      ).trim();

      const approval = String(
        getEDBValue(row, headers, 'Approval Status') || ''
      ).trim().toLowerCase();

      const payment = String(
        getEDBValue(row, headers, 'Payment Status') || ''
      ).trim().toLowerCase();

      const display = String(
        getEDBValue(row, headers, 'Display Status') || ''
      ).trim().toLowerCase();

      if (
        id &&
        approval !== 'approved' &&
        approval !== 'rejected' &&
        payment !== 'paid' &&
        display !== 'scheduled' &&
        display !== 'displaying' &&
        display !== 'currently displaying' &&
        display !== 'active' &&
        display !== 'completed' &&
        display !== 'complete' &&
        display !== 'rejected'
      ) {
        wantedId = id;
        return true;
      }
      return false;
    });
  }

  if (!wantedId) {
    throw new Error(
      'No Booking ID supplied and no live Awaiting Review booking exists.'
    );
  }

  // Locate the exact live booking row passed from Screen 1.
  let selectedRow = null;

  rows.some(function(row) {
    const id = String(
      getEDBValue(row, headers, 'Booking ID') || ''
    ).trim();

    if (id === wantedId) {
      selectedRow = row;
      return true;
    }

    return false;
  });

  if (!selectedRow) {
    throw new Error('Booking ID not found: ' + wantedId);
  }

  // ------------------------------------------------------------
  // DATA
  // ------------------------------------------------------------
  // These mappings use the exact Form Responses 1 headers supplied
  // for this EDB build. Do not replace them with guessed labels.

  let approval = String(
    getEDBValue(selectedRow, headers, 'Approval Status') || ''
  ).trim();

  let payment = String(
    getEDBValue(selectedRow, headers, 'Payment Status') || ''
  ).trim();

  let displayStatus = String(
    getEDBValue(selectedRow, headers, 'Display Status') || ''
  ).trim();

  // LIVE STATE - no preview override and no data write.
  const previewMode = false;

  const resident = getEDBValue(
    selectedRow,
    headers,
    ['2. Resident Name', 'Resident Name']
  );

  const flat = getEDBValue(
    selectedRow,
    headers,
    ['1. Flat No.', 'Flat No.', 'Flat No', 'Flat']
  );

  const mobile = getEDBValue(
    selectedRow,
    headers,
    [
      '3. WhatsApp-Registered Mobile Number',
      'Mobile Number',
      'Phone Number',
      'Mobile'
    ]
  );

  const material = getEDBValue(
    selectedRow,
    headers,
    [
      '4. What type of material are you submitting?',
      'Material Type',
      'Material'
    ]
  );

  const duration = getEDBValue(
    selectedRow,
    headers,
    [
      '4. Desired Display Duration',
      'Duration'
    ]
  );

  const advertisement = getEDBValue(
    selectedRow,
    headers,
    [
      'Media File Name',
      'Advertisement Text',
      'Advertisement',
      'Ad Text'
    ]
  );


const mediaDriveLink = getEDBValue(
  selectedRow,
  headers,
  [
    'Media Drive Link',
    'Media Drive URL',
    'File Link'
  ]
);

  const requirements = getEDBValue(
    selectedRow,
    headers,
    [
      '7. Display Instructions / Special Requirements',
      'Special Requirements',
      'Special Requirement'
    ]
  );

  const amount = getEDBValue(
    selectedRow,
    headers,
    [
      'Total Payable',
      'Amount Payable',
      'Amount'
    ]
  );

  const gst = getEDBValue(
    selectedRow,
    headers,
    [
      'GST',
      'GST Amount'
    ]
  );

  const utr = getEDBValue(
    selectedRow,
    headers,
    [
      'Payment UTR / Reference',
      'Payment UTR',
      'UTR',
      'Payment Reference'
    ]
  );

  const mediaValidation = getEDBValue(
    selectedRow,
    headers,
    [
      'Media Validation',
      'Validation'
    ]
  );

  const startDate = getEDBDisplayDate_UI2_(
    selectedRow,
    headers,
    [
      'Confirmed Start Date',
      'Confirmed Start',
      'Final Start Date',
      'Requested Start Date',
      '5. Preferred Start Date'
    ]
  );

  const endDate = getEDBDisplayDate_UI2_(
    selectedRow,
    headers,
    [
      'Confirmed End Date',
      'Confirmed End',
      'Final End Date',
      'Requested End Date'
    ]
  );

  console.log(
    'V11 DATE RESOLUTION ' +
    wantedId +
    ' | Start=' + startDate +
    ' | End=' + endDate
  );

  const paymentDate = getEDBDisplayDate_UI2_(
    selectedRow,
    headers,
    ['Payment Date']
  );

  const submissionDate = getEDBDisplayDate_UI2_(
    selectedRow,
    headers,
    [
      'Timestamp',
      'Submission Date'
    ]
  );

  // Google Sheets may store a numeric flat number using a date-formatted
  // cell. Force it to display as the actual flat number, not as a date.
  const flatDisplay = normalizeEDBFlat_UI2_(flat);

  // ------------------------------------------------------------
  // STATE
  // ------------------------------------------------------------

  const state = getEDBPrimaryState_UI2_(
    approval,
    payment,
    displayStatus,
    selectedRow,
    headers
  );

  // ------------------------------------------------------------
  // RESET
  // ------------------------------------------------------------

  sheet.setFrozenRows(0);

  sheet
    .getRange(1, 1, 35, 12)
    .getMergedRanges()
    .forEach(function(range) {
      range.breakApart();
    });

  sheet.getRange('A1:L35').clear();
  sheet.getRange('A1:L35').clearFormat();
  sheet.setHiddenGridlines(true);

  const widths = [
    112, 112, 100, 112, 112, 112,
    112, 112, 100, 112, 112, 112
  ];

  widths.forEach(function(width, i) {
    sheet.setColumnWidth(i + 1, width);
  });

  // ------------------------------------------------------------
  // HEADER
  // ------------------------------------------------------------

  sheet.getRange('A1:L1').merge()
    .setValue('BOOKING DETAIL')
    .setFontSize(15)
    .setFontWeight('bold')
    .setHorizontalAlignment('left');

  sheet.getRange('A2:H2').merge()
    .setValue(wantedId)
    .setFontSize(11)
    .setFontWeight('bold');

  sheet.getRange('I2:L2').merge()
    .setValue(state.label)
    .setFontSize(10)
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setBackground(state.background)
    .setBorder(true, true, true, true, true, true);

  // Back navigation.
  // A3 is the actual checkbox action control.
  // B3:C3 carries the visible label.
  sheet.getRange('A3')
    .setDataValidation(
      SpreadsheetApp.newDataValidation()
        .requireCheckbox()
        .build()
    )
    .setValue(false)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setBackground('#e8f0fe')
    .setBorder(true, true, true, true, true, true);

  sheet.getRange('B3:C3').merge()
    .setValue('<- BACK TO OPERATIONS')
    .setFontWeight('bold')
    .setHorizontalAlignment('left')
    .setVerticalAlignment('middle')
    .setBackground('#e8f0fe')
    .setBorder(true, true, true, true, true, true);

  // ------------------------------------------------------------
  // RESIDENT
  // ------------------------------------------------------------

  sheet.getRange('A4:F4').merge()
    .setValue('RESIDENT')
    .setFontSize(11)
    .setFontWeight('bold')
    .setBackground('#eaf2f8');

  sheet.getRange('A5:F6').setValues([
    ['Resident', resident, 'Flat', flatDisplay, 'Mobile', mobile],
    ['Submitted', submissionDate, 'Booking ID', wantedId, 'Status', approval]
  ]);

  // ------------------------------------------------------------
  // ADVERTISEMENT
  // ------------------------------------------------------------

  sheet.getRange('G4:L4').merge()
    .setValue('ADVERTISEMENT')
    .setFontSize(11)
    .setFontWeight('bold')
    .setBackground('#eaf2f8');

 sheet.getRange('G5:L6').setValues([
  ['Material', material, 'Duration', duration, 'File', 'VIEW FILE'],
  ['Advertisement', advertisement, 'Requirements', requirements, '', '']
]);

if (mediaDriveLink) {
  sheet.getRange('L5').setRichTextValue(
    SpreadsheetApp.newRichTextValue()
      .setText('VIEW FILE')
      .setLinkUrl(String(mediaDriveLink).trim())
      .build()
  );
} else {
  sheet.getRange('L5').setValue('FILE NOT AVAILABLE');
}

  // ------------------------------------------------------------
  // BOOKING / PAYMENT
  // ------------------------------------------------------------

  sheet.getRange('A8:L8').merge()
    .setValue('BOOKING & PAYMENT')
    .setFontSize(11)
    .setFontWeight('bold')
    .setBackground('#eaf2f8');

  sheet.getRange('A9:L11').setValues([
    [
      'Start', startDate,
      'End', endDate,
      'Duration', duration,
      'Validation', mediaValidation,
      '', '', '', ''
    ],
    [
      'Amount', amount,
      'GST', gst,
      'Payment', payment,
      'UTR', utr,
      '', '', '', ''
    ],
    [
      'Payment Date', paymentDate,
      'Approval', approval,
      'Display', displayStatus,
      '', '', '', '', '', ''
    ]
  ]);

  // ------------------------------------------------------------
  // CURRENT STATE
  // ------------------------------------------------------------

  sheet.getRange('A13:L13').merge()
    .setValue('CURRENT STATE')
    .setFontSize(11)
    .setFontWeight('bold')
    .setBackground('#eaf2f8');

  sheet.getRange('A14:L14').setValues([[
    'Workflow',
    state.label,
    'Approval',
    String(approval || '-').toUpperCase(),
    'Payment',
    String(payment || '-').toUpperCase(),
    'Display',
    String(displayStatus || '-').toUpperCase(),
    '', '', '', ''
  ]]);

  // ------------------------------------------------------------
  // ACTION
  // ------------------------------------------------------------

  sheet.getRange('A16:L16').merge()
    .setValue('ADMIN ACTION')
    .setFontSize(11)
    .setFontWeight('bold')
    .setBackground('#eaf2f8');

  sheet.getRange('A17:L17').merge()
    .setValue(state.instruction)
    .setFontSize(9);

  if (state.action === 'REVIEW') {

    // Functional action controls. The checkbox itself is the clickable
    // control; the adjacent merged cells provide the button label.
    sheet.getRange('D19')
      .setDataValidation(
        SpreadsheetApp.newDataValidation()
          .requireCheckbox()
          .build()
      )
      .setValue(false)
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle')
      .setBackground('#e6f4ea')
      .setBorder(true, true, true, true, true, true);

    sheet.getRange('E19:G19').merge()
      .setValue('\u2713  APPROVE BOOKING')
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle')
      .setFontWeight('bold')
      .setFontSize(9)
      .setBackground('#e6f4ea')
      .setBorder(true, true, true, true, true, true);

    sheet.getRange('H19')
      .setDataValidation(
        SpreadsheetApp.newDataValidation()
          .requireCheckbox()
          .build()
      )
      .setValue(false)
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle')
      .setBackground('#fce8e6')
      .setBorder(true, true, true, true, true, true);

    sheet.getRange('I19:K19').merge()
      .setValue('\u2715  REJECT')
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle')
      .setFontWeight('bold')
      .setFontSize(9)
      .setBackground('#fce8e6')
      .setBorder(true, true, true, true, true, true);

  } else if (state.action === 'WHATSAPP') {

    // The checkbox is the actual action control.
    // Apps Script cannot directly open a browser tab from an edit trigger,
    // so the checkbox click prepares a rich-text WhatsApp link in E19:I19.
    // The administrator then clicks the generated link to open WhatsApp.
    sheet.getRange('D19')
      .setDataValidation(
        SpreadsheetApp.newDataValidation()
          .requireCheckbox()
          .build()
      )
      .setValue(false)
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle')
      .setBackground('#e8f0fe')
      .setBorder(true, true, true, true, true, true);

    sheet.getRange('E19:I19').merge()
      .setValue('SEND WHATSAPP PAYMENT REQUEST')
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle')
      .setFontWeight('bold')
      .setFontSize(9)
      .setBackground('#e8f0fe')
      .setBorder(true, true, true, true, true, true);

  } else if (state.action === 'SCHEDULE') {

    // Payment has been received. D19 is the functional action control
    // for the next state: APPROVE & SCHEDULE.
    sheet.getRange('D19')
      .setDataValidation(
        SpreadsheetApp.newDataValidation()
          .requireCheckbox()
          .build()
      )
      .setValue(false)
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle')
      .setBackground('#e6f4ea')
      .setBorder(true, true, true, true, true, true);

    sheet.getRange('E19:I19').merge()
      .setValue('\u2713  APPROVE & SCHEDULE')
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle')
      .setFontWeight('bold')
      .setFontSize(9)
      .setBackground('#e6f4ea')
      .setBorder(true, true, true, true, true, true);

  } else {

    sheet.getRange('E19:I19').merge()
      .setValue(state.actionText)
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle')
      .setFontWeight('bold')
      .setFontSize(9)
      .setBackground(state.background)
      .setBorder(true, true, true, true, true, true);
  }

  // No second Back control is created here.
  // The authoritative Back control is A3:C3 above.

  // ------------------------------------------------------------
  // FORMATTING
  // ------------------------------------------------------------

  sheet.getRange('A1:L21')
    .setFontFamily('Arial')
    .setFontSize(10)
    .setVerticalAlignment('middle')
    .setWrap(true);

  sheet.getRange(
    'A5:F6'
  ).setBorder(false, false, true, false, false, false);

  sheet.getRange(
    'G5:L6'
  ).setBorder(false, false, true, false, false, false);

  sheet.getRange(
    'A9:L11'
  ).setBorder(false, false, true, false, false, false);

  [
    'A5','C5','E5',
    'A6','C6','E6',
    'G5','I5','K5',
    'G6','I6',
    'A9','C9','E9','G9',
    'A10','C10','E10','G10',
    'A11','C11','E11'
  ].forEach(function(r) {
    sheet.getRange(r).setFontWeight('bold');
  });

  sheet.getRange('B14')
    .setFontWeight('bold')
    .setBackground(state.background);

  sheet.setRowHeight(1, 27);
  sheet.setRowHeight(2, 22);
  sheet.setRowHeight(3, 20);
  sheet.setRowHeight(4, 22);
  sheet.setRowHeights(5, 2, 24);
  sheet.setRowHeight(8, 22);
  sheet.setRowHeights(9, 3, 24);
  sheet.setRowHeight(13, 22);
  sheet.setRowHeight(14, 27);
  sheet.setRowHeight(16, 21);
  sheet.setRowHeight(17, 21);
  sheet.setRowHeight(19, 25);
  sheet.setRowHeight(20, 18);

  sheet.setFrozenRows(2);

  SpreadsheetApp.flush();

  console.log(
    'Booking Detail displayed: ' +
    wantedId +
    ' | State: ' +
    state.label
  );
}


/* ============================================================
   PRIMARY STATE - SCREEN 2 ONLY
   ============================================================ */

function getEDBPrimaryState_UI2_(
  approval,
  payment,
  displayStatus,
  row,
  headers
) {

  const a = String(approval || '').trim().toLowerCase();
  const p = String(payment || '').trim().toLowerCase();
  const d = String(displayStatus || '').trim().toLowerCase();

  // Rejection is terminal for the operational workflow.
  if (
    a === 'rejected' ||
    d === 'rejected'
  ) {
    return {
      label: 'REJECTED',
      action: 'NONE',
      actionText: 'REJECTED - NO ACTION REQUIRED',
      instruction: 'This booking has been rejected.',
      background: '#fce8e6'
    };
  }

  // ------------------------------------------------------------
  // APPROVED + PAID: USE THE SAME AUTOMATIC DATE LIFECYCLE AS
  // SCREEN 1 AND THE DISPLAYBOARD.
  // ------------------------------------------------------------

  if (
    a === 'approved' &&
    p === 'paid' &&
    row &&
    headers
  ) {

    const automaticState =
      getEDBAutomaticDisplayState(
        row,
        headers
      );

    if (automaticState === 'scheduled') {
      return {
        label: 'SCHEDULED',
        action: 'NONE',
        actionText: 'SCHEDULED',
        instruction: 'This advertisement is scheduled for display.',
        background: '#e8f0fe'
      };
    }

    if (automaticState === 'currently displaying') {
      return {
        label: 'CURRENTLY DISPLAYING',
        action: 'NONE',
        actionText: 'CURRENTLY DISPLAYING',
        instruction: 'This advertisement is currently on the display board.',
        background: '#e8f0fe'
      };
    }

    if (automaticState === 'display period over') {
      return {
        label: 'DISPLAY PERIOD OVER',
        action: 'NONE',
        actionText: 'DISPLAY PERIOD OVER',
        instruction: 'The scheduled display period has ended. The booking is no longer eligible for display.',
        background: '#f1f3f4'
      };
    }

    // Paid + Approved but no usable dates.
    return {
      label: 'PAYMENT RECEIVED',
      action: 'SCHEDULE',
      actionText: 'APPROVE & SCHEDULE',
      instruction: 'Payment has been received. Confirm the display schedule.',
      background: '#e6f4ea'
    };
  }

  // ------------------------------------------------------------
  // APPROVED BUT NOT PAID
  // ------------------------------------------------------------

  if (a === 'approved') {
    return {
      label: 'AWAITING PAYMENT',
      action: 'WHATSAPP',
      actionText: 'SEND WHATSAPP PAYMENT REQUEST',
      instruction: 'Booking is approved. Send the payment request to the resident.',
      background: '#fff4ce'
    };
  }

  // ------------------------------------------------------------
  // PAID BUT NOT APPROVED
  // ------------------------------------------------------------

  if (p === 'paid') {
    return {
      label: 'PAYMENT RECEIVED',
      action: 'SCHEDULE',
      actionText: 'APPROVE & SCHEDULE',
      instruction: 'Payment has been received. Review the booking and confirm the display schedule.',
      background: '#e6f4ea'
    };
  }

  return {
    label: 'AWAITING REVIEW',
    action: 'REVIEW',
    actionText: 'APPROVE BOOKING',
    instruction: 'Review the advertisement, requested dates and booking details.',
    background: '#fce8e6'
  };
}

/* ============================================================
   FLAT NUMBER DISPLAY HELPER
   ============================================================ */

function normalizeEDBFlat_UI2_(value) {

  if (
    value === '' ||
    value === null ||
    value === undefined
  ) {
    return '';
  }

  // Google Sheets returns a date-formatted numeric cell as a Date object.
  // The EDB flat is actually the underlying serial number (for example
  // 40601), so recover that serial from the Date's UTC calendar date.
  if (
    Object.prototype.toString.call(value) === '[object Date]' &&
    !isNaN(value.getTime())
  ) {
    const utcDate = new Date(
      Date.UTC(
        value.getFullYear(),
        value.getMonth(),
        value.getDate()
      )
    );

    const excelSerial =
      Math.round(utcDate.getTime() / 86400000) + 25569;

    return String(excelSerial);
  }

  if (typeof value === 'number' && isFinite(value)) {
    return String(Math.trunc(value));
  }

  const text = String(value).trim();

  if (/^\d+$/.test(text)) {
    return text;
  }

  return text;
}


/* ============================================================
   UNIQUE DATE HELPER
   ============================================================ */

function getEDBDisplayDate_UI2_(row, headers, names) {

  const candidates = Array.isArray(names)
    ? names
    : [names];

  /*
   * V11 DATE RESOLUTION
   *
   * Do not depend on a secondary helper for this display field.
   * Read the supplied header map directly and accept a value only
   * when the cell actually contains a usable date/value.
   *
   * This is important for test bookings such as IFFG-EDB-00007,
   * where Confirmed and Final dates are blank but Requested dates
   * contain the resident's requested display period.
   */

  for (let i = 0; i < candidates.length; i++) {

    const candidate = String(candidates[i] || '').trim();

    if (!candidate) continue;

    const key = normaliseEDBHeader(candidate);

    if (
      headerMapHasEDBKey_UI11_(headers, key)
    ) {

      const index = getEDBHeaderIndex_UI11_(headers, key);
      const value = row[index];

      if (
        value !== '' &&
        value !== null &&
        value !== undefined
      ) {

        const date = parseEDBDate_UI11_(value);

        if (date) {
          return Utilities.formatDate(
            date,
            Session.getScriptTimeZone(),
            'dd-MMM-yyyy'
          );
        }

        const raw = String(value).trim();

        if (raw) return raw;
      }
    }
  }

  return '';
}


function headerMapHasEDBKey_UI11_(headerMap, wanted) {

  if (
    !headerMap ||
    typeof headerMap !== 'object'
  ) {
    return false;
  }

  return Object.prototype.hasOwnProperty.call(
    headerMap,
    wanted
  );
}


function getEDBHeaderIndex_UI11_(headerMap, wanted) {

  return Number(headerMap[wanted]);
}


function parseEDBDate_UI11_(value) {

  if (
    value === '' ||
    value === null ||
    value === undefined
  ) {
    return null;
  }

  if (
    Object.prototype.toString.call(value) === '[object Date]' &&
    !isNaN(value.getTime())
  ) {
    return new Date(value.getTime());
  }

  if (typeof value === 'number' && isFinite(value)) {

    const millis =
      Math.round(
        (value - 25569) * 86400000
      );

    const date = new Date(millis);

    return isNaN(date.getTime())
      ? null
      : date;
  }

  const raw = String(value).trim();

  if (!raw) return null;

  /*
   * Handle common Google Sheets text date forms without allowing
   * locale ambiguity to silently change the calendar day.
   *
   * Examples:
   *   8/31/2026
   *   31-Aug-2026
   *   31-Aug-26
   *   2026-08-31
   */

  let match = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);

  if (match) {

    let first = Number(match[1]);
    let second = Number(match[2]);
    let year = Number(match[3]);

    if (year < 100) year += 2000;

    let month;
    let day;

    if (first > 12) {
      day = first;
      month = second;
    } else {
      month = first;
      day = second;
    }

    const date = new Date(year, month - 1, day);

    if (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    ) {
      return date;
    }
  }

  match = raw.match(/^([0-9]{1,2})[- ]([A-Za-z]{3,9})[- ]([0-9]{2,4})$/);

  if (match) {

    let day = Number(match[1]);
    const monthText = match[2].toLowerCase();
    let year = Number(match[3]);

    if (year < 100) year += 2000;

    const months = [
      'jan','feb','mar','apr','may','jun',
      'jul','aug','sep','oct','nov','dec'
    ];

    const month = months.indexOf(monthText.substring(0, 3));

    if (month >= 0) {

      const date = new Date(year, month, day);

      if (
        date.getFullYear() === year &&
        date.getMonth() === month &&
        date.getDate() === day
      ) {
        return date;
      }
    }
  }

  match = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);

  if (match) {

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    const date = new Date(year, month - 1, day);

    if (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    ) {
      return date;
    }
  }

  const parsed = new Date(raw);

  return isNaN(parsed.getTime())
    ? null
    : parsed;
}


/* ============================================================
   SCREEN 2 ACTIONS - APPROVE / REJECT
   ============================================================ */

function updateEDBBookingApprovalLive_(bookingId, newApproval, newDisplayStatus) {

  const ss = SpreadsheetApp.openById(
    '1hHdFRgj1YnBqQATLd94iEGuRDqxOIsQEd8w1DKmYQfQ'
  );

  const responseSheet = getEDBResponseSheet(ss);
  if (!responseSheet) {
    throw new Error('Form Responses 1 not found.');
  }

  const lastColumn = responseSheet.getLastColumn();
  const lastRow = responseSheet.getLastRow();
  if (lastRow < 2) {
    throw new Error('No booking records found.');
  }

  const headers = responseSheet
    .getRange(1, 1, 1, lastColumn)
    .getValues()[0];

  function findColumn(headerName) {
    const wanted = String(headerName).trim().toLowerCase();
    for (let i = 0; i < headers.length; i++) {
      if (String(headers[i] || '').trim().toLowerCase() === wanted) {
        return i + 1;
      }
    }
    return 0;
  }

  const bookingCol = findColumn('Booking ID');
  const approvalCol = findColumn('Approval Status');
  const displayCol = findColumn('Display Status');

  if (!bookingCol || !approvalCol) {
    throw new Error('Booking ID or Approval Status column not found.');
  }

  const values = responseSheet
    .getRange(2, 1, lastRow - 1, lastColumn)
    .getValues();

  let targetRow = 0;
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][bookingCol - 1] || '').trim() === bookingId) {
      targetRow = i + 2;
      break;
    }
  }

  if (!targetRow) {
    throw new Error('Booking ID not found: ' + bookingId);
  }

  const currentApproval = String(
    values[targetRow - 2][approvalCol - 1] || ''
  ).trim().toLowerCase();

  if (currentApproval === 'approved' || currentApproval === 'rejected') {
    showEDBBookingDetailLive(bookingId);
    return;
  }

  responseSheet
    .getRange(targetRow, approvalCol)
    .setValue(newApproval);

  if (newDisplayStatus && displayCol) {
    responseSheet
      .getRange(targetRow, displayCol)
      .setValue(newDisplayStatus);
  }

  SpreadsheetApp.flush();

  showEDBBookingDetailLive(bookingId);
}

function scheduleEDBBookingLive_(bookingId) {

  const ss = SpreadsheetApp.openById(
    '1hHdFRgj1YnBqQATLd94iEGuRDqxOIsQEd8w1DKmYQfQ'
  );

  const responseSheet = getEDBResponseSheet(ss);
  const dataset = getEDBBookingRows(responseSheet);

  /*
   * getEDBBookingRows() returns a header MAP, not a simple
   * zero-based header array.  Use the same project helpers
   * used elsewhere in the EDB codebase.
   */
  const headerMap = dataset.headers;
  const rows = dataset.rows;

  if (!headerMap || typeof headerMap !== 'object') {
    throw new Error('Invalid EDB response header map.');
  }

  const bookingIndex =
    resolveEDBHeaderIndex_(headerMap, [
      'Booking ID',
      'Booking ID.'
    ]);

  const displayIndex =
    resolveEDBHeaderIndex_(headerMap, [
      'Display Status'
    ]);

  const paymentIndex =
    resolveEDBHeaderIndex_(headerMap, [
      'Payment Status'
    ]);

  const approvalIndex =
    resolveEDBHeaderIndex_(headerMap, [
      'Approval Status'
    ]);

  if (bookingIndex < 0) {
    throw new Error('Booking ID column not found.');
  }

  if (displayIndex < 0) {
    throw new Error('Display Status column not found.');
  }

  if (paymentIndex < 0) {
    throw new Error('Payment Status column not found.');
  }

  if (approvalIndex < 0) {
    throw new Error('Approval Status column not found.');
  }

  let targetRow = -1;

  for (let i = 0; i < rows.length; i++) {

    const id = String(
      rows[i][bookingIndex] || ''
    ).trim();

    if (
      id === String(bookingId).trim()
    ) {
      targetRow = i + 2;
      break;
    }
  }

  if (targetRow === -1) {
    throw new Error(
      'Booking ID not found: ' + bookingId
    );
  }

  const paymentStatus = String(
    responseSheet
      .getRange(
        targetRow,
        paymentIndex + 1
      )
      .getDisplayValue() || ''
  )
    .trim()
    .toLowerCase();

  const approvalStatus = String(
    responseSheet
      .getRange(
        targetRow,
        approvalIndex + 1
      )
      .getDisplayValue() || ''
  )
    .trim()
    .toLowerCase();

  if (paymentStatus !== 'paid') {
    throw new Error(
      'Cannot schedule ' +
      bookingId +
      ': Payment Status is not Paid.'
    );
  }

  if (approvalStatus !== 'approved') {
    throw new Error(
      'Cannot schedule ' +
      bookingId +
      ': Approval Status is not Approved.'
    );
  }

  responseSheet
    .getRange(
      targetRow,
      displayIndex + 1
    )
    .setValue('Scheduled');

  SpreadsheetApp.flush();

  showEDBBookingDetailLive(
    bookingId
  );
}


/*
 * Resolve a column index from the header MAP returned by
 * getEDBBookingRows().
 *
 * The map stores zero-based column indexes.  Matching is
 * normalised so harmless header punctuation/case differences
 * do not break the scheduling action.
 */
function resolveEDBHeaderIndex_(headerMap, candidates) {

  if (
    !headerMap ||
    typeof headerMap !== 'object'
  ) {
    return -1;
  }

  const keys = Object.keys(headerMap);

  for (let i = 0; i < candidates.length; i++) {

    const wanted =
      normaliseEDBHeader(
        candidates[i]
      );

    if (
      Object.prototype.hasOwnProperty.call(
        headerMap,
        wanted
      )
    ) {
      return Number(
        headerMap[wanted]
      );
    }
  }

  for (let i = 0; i < candidates.length; i++) {

    const wanted =
      normaliseEDBHeader(
        candidates[i]
      );

    for (let j = 0; j < keys.length; j++) {

      const actual = keys[j];

      if (
        actual === wanted ||
        actual.includes(wanted) ||
        wanted.includes(actual)
      ) {
        return Number(
          headerMap[actual]
        );
      }
    }
  }

  return -1;
}


function approveEDBBookingLive(bookingId) {
  updateEDBBookingApprovalLive_(bookingId, 'Approved', '');
}

function rejectEDBBookingLive(bookingId) {
  updateEDBBookingApprovalLive_(bookingId, 'Rejected', 'Rejected');
}


/* ============================================================
   SCREEN 2 - WHATSAPP PAYMENT REQUEST
   ============================================================

   The WhatsApp action is deliberately a two-step interaction:

     1. Admin ticks D19.
     2. The script prepares a rich-text WhatsApp link in E19:I19.
     3. Admin clicks that link to open WhatsApp with the payment
        request pre-filled.

   The action does NOT change Payment Status. Payment remains Pending
   until the existing payment process records an actual payment.
   ============================================================ */

function getEDBPaymentUPI_UI2_(sheet) {

  if (!sheet) {
    throw new Error('Payment request: UI sheet was not supplied.');
  }

  const configSheet = sheet.getParent().getSheetByName(
    'IFFG EDB - Admin Configuration'
  );

  if (!configSheet) {
    throw new Error(
      'Payment request: IFFG EDB - Admin Configuration sheet not found.'
    );
  }

  const lastRow = configSheet.getLastRow();

  if (lastRow < 4) {
    throw new Error(
      'Payment request: Admin Configuration does not contain settings.'
    );
  }

  const data = configSheet
    .getRange(4, 1, lastRow - 3, 2)
    .getValues();

  for (let i = 0; i < data.length; i++) {

    const setting = String(data[i][0] || '').trim();

    if (setting === 'Payment UPI ID') {
      const upiId = String(data[i][1] || '').trim();

      if (!upiId) {
        throw new Error(
          'Payment request: Payment UPI ID is not configured in IFFG EDB - Admin Configuration.'
        );
      }

      return upiId;
    }
  }

  throw new Error(
    'Payment request: Payment UPI ID setting was not found in Admin Configuration.'
  );
}


function createEDBPaymentRequestWhatsAppLink_(bookingId, sheet) {

  if (!sheet) {
    throw new Error('Payment request: UI sheet was not supplied.');
  }

  const responseSheet = getEDBResponseSheet(sheet.getParent());

  if (!responseSheet) {
    throw new Error('Payment request: Form Responses 1 not found.');
  }

  const dataset = getEDBBookingRows(responseSheet);
  const headers = dataset.headers;
  const rows = dataset.rows;

  let selectedRow = null;

  rows.some(function(row) {
    const id = String(
      getEDBValue(row, headers, 'Booking ID') || ''
    ).trim();

    if (id === bookingId) {
      selectedRow = row;
      return true;
    }

    return false;
  });

  if (!selectedRow) {
    throw new Error('Payment request: Booking ID not found: ' + bookingId);
  }

  const resident = String(
    getEDBValue(
      selectedRow,
      headers,
      ['2. Resident Name', 'Resident Name']
    ) || ''
  ).trim();

  const flat = normalizeEDBFlat_UI2_(
    getEDBValue(
      selectedRow,
      headers,
      ['1. Flat No', '1. Flat No.', 'Flat No.', 'Flat No', 'Flat']
    )
  );

  const mobileRaw = getEDBValue(
    selectedRow,
    headers,
    [
      '3. WhatsApp-Registered Mobile Number',
      'Mobile Number',
      'Phone Number',
      'Mobile'
    ]
  );

  const residentNumber = normalizeIndianWhatsApp(mobileRaw);

  if (!residentNumber) {
    throw new Error(
      'Payment request: Resident WhatsApp number is missing or invalid for ' +
      bookingId + '.'
    );
  }

  const material = String(
    getEDBValue(
      selectedRow,
      headers,
      [
        '4. What type of material are you submitting?',
        'Material Type',
        'Material'
      ]
    ) || ''
  ).trim();

  const duration = String(
    getEDBValue(
      selectedRow,
      headers,
      ['4. Desired Display Duration', 'Duration']
    ) || ''
  ).trim();

  const amount = getEDBValue(
    selectedRow,
    headers,
    ['Total Payable', 'Amount Payable', 'Amount']
  );

  const paymentStatus = String(
    getEDBValue(selectedRow, headers, 'Payment Status') || ''
  ).trim().toLowerCase();

  if (paymentStatus === 'paid') {
    throw new Error(
      'Payment request: Payment is already recorded as Paid for ' +
      bookingId + '.'
    );
  }

  const upiId = getEDBPaymentUPI_UI2_(sheet);

  const requestedStart = getEDBDisplayDate_UI2_(
    selectedRow,
    headers,
    [
      'Confirmed Start Date',
      'Confirmed Start',
      'Final Start Date',
      'Requested Start Date',
      '5. Preferred Start Date'
    ]
  );

  const requestedEnd = getEDBDisplayDate_UI2_(
    selectedRow,
    headers,
    [
      'Confirmed End Date',
      'Confirmed End',
      'Final End Date',
      'Requested End Date'
    ]
  );

  const message =
    'IFFG Electronic Display Board - Payment Request\n\n' +
    'Dear ' + resident + ',\n\n' +
    'Your IFFG Electronic Display Board booking has been approved. ' +
    'Please make the payment for the booking so that the display can be scheduled.\n\n' +
    'Booking ID: ' + bookingId + '\n' +
    'Flat No.: ' + flat + '\n' +
    'Material: ' + material + '\n' +
    'Duration: ' + duration + '\n' +
    (requestedStart ? 'Start Date: ' + requestedStart + '\n' : '') +
    (requestedEnd ? 'End Date: ' + requestedEnd + '\n' : '') +
    '\n' +
    'Amount Payable: Rs. ' + formatMoneyForWhatsApp(amount) + '\n' +
    'Payment UPI ID: ' + upiId + '\n\n' +
    'After making the payment, please share the UTR / payment reference with the IFFG-AOA team for confirmation.\n\n' +
    'Thank you,\n' +
    'IFFG-AOA';

  return createWhatsAppLink(
    residentNumber,
    message
  );
}


function prepareEDBWhatsAppPaymentRequestLive_(bookingId, sheet) {

  const link = createEDBPaymentRequestWhatsAppLink_(
    bookingId,
    sheet
  );

  const richText = SpreadsheetApp.newRichTextValue()
    .setText('OPEN WHATSAPP PAYMENT REQUEST')
    .setLinkUrl(link)
    .build();

  sheet.getRange('E19')
    .setRichTextValue(richText)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setFontWeight('bold')
    .setFontSize(9)
    .setBackground('#e8f0fe')
    .setBorder(true, true, true, true, true, true);

  sheet.getRange('D19').setValue(false);

  SpreadsheetApp.flush();

  console.log(
    'WhatsApp payment request prepared for ' + bookingId
  );
}


/* ============================================================
   EDB ADMIN UI - NAVIGATION / ACTION HANDLER
   ============================================================

   SCREEN 1
     H11:H13 checkbox -> exact Booking ID in column A -> Screen 2

   SCREEN 2
     A3 checkbox -> Screen 1
     D19 checkbox -> Approve when Awaiting Review
     D19 checkbox -> WhatsApp payment request when Awaiting Payment
     H19 checkbox -> Reject

   IMPORTANT
   ----------
   This is the ONLY EDB Admin UI spreadsheet edit handler.
   displayboard.gs has separate handlers for the B7 / payment areas.
   ============================================================ */

function handleEDBOperationsEdit(e) {

  if (!e || !e.range) return;

  const range = e.range;
  const sheet = range.getSheet();

  if (sheet.getName() !== 'EDB Admin UI') return;

  const row = range.getRow();
  const column = range.getColumn();
  const value = e.value;

  if (String(value).toUpperCase() !== 'TRUE') return;

  // ------------------------------------------------------------
  // SCREEN 1 - OPEN BOOKING
  // ------------------------------------------------------------

  if (column === 8 && row >= 11 &&
      String(sheet.getRange('A2').getDisplayValue() || '').trim().toUpperCase() === 'ADMIN CONSOLE') {

    // On Screen 1, column H checkboxes in the Action Required data area
    // open the selected booking. Because the number of rows is dynamic,
    // do not use a hard-coded upper row such as 13.
    const bookingId = String(
      sheet.getRange(row, 1).getDisplayValue() || ''
    ).trim();

    // Reset checkbox so it can be used again.
    range.setValue(false);

    if (!bookingId) return;

    showEDBBookingDetailLive(bookingId);
    return;
  }

  // ------------------------------------------------------------
  // SCREEN 2 - BACK TO OPERATIONS
  // ------------------------------------------------------------

  if (row === 3 && column === 1) {

    range.setValue(false);

    buildEDBAdminUICompact();
    return;
  }

  // ------------------------------------------------------------
  // SCREEN 2 - D19 ACTION
  // ------------------------------------------------------------
  // D19 is APPROVE when the booking is Awaiting Review.
  // D19 is WHATSAPP when the booking is Awaiting Payment.

  if (row === 19 && column === 4) {

    // D19 is an action control ONLY on Screen 2 (BOOKING DETAIL).
    // The same UI sheet is reused for Screen 1, where A2 contains
    // "ADMIN CONSOLE". Do not interpret Screen 1 edits as Screen 2 actions.
    const screenTitle = String(
      sheet.getRange('A1').getDisplayValue() || ''
    ).trim().toUpperCase();

    if (screenTitle !== 'BOOKING DETAIL') return;

    const bookingId = String(
      sheet.getRange('A2').getDisplayValue() || ''
    ).trim();

    range.setValue(false);

    if (!bookingId) return;

    const responseSheet = getEDBResponseSheet(sheet.getParent());
    const dataset = getEDBBookingRows(responseSheet);
    const headers = dataset.headers;
    const rows = dataset.rows;

    let selectedRow = null;

    rows.some(function(rowData) {
      const id = String(
        getEDBValue(rowData, headers, 'Booking ID') || ''
      ).trim();

      if (id === bookingId) {
        selectedRow = rowData;
        return true;
      }

      return false;
    });

    if (!selectedRow) {
      throw new Error('Booking ID not found: ' + bookingId);
    }

    const approvalStatus = String(
      getEDBValue(selectedRow, headers, 'Approval Status') || ''
    ).trim().toLowerCase();

    const paymentStatus = String(
      getEDBValue(selectedRow, headers, 'Payment Status') || ''
    ).trim().toLowerCase();

    const displayStatus = String(
      getEDBValue(selectedRow, headers, 'Display Status') || ''
    ).trim().toLowerCase();

    // D19 is state-dependent. Once payment is recorded as Paid, D19
    // must perform APPROVE & SCHEDULE - it must never fall back to the
    // earlier WhatsApp action.
    if (paymentStatus === 'paid') {
      scheduleEDBBookingLive_(bookingId);
      return;
    }

    if (approvalStatus === 'approved') {
      prepareEDBWhatsAppPaymentRequestLive_(
        bookingId,
        sheet
      );
      return;
    }

    approveEDBBookingLive(bookingId);
    return;
  }

  // ------------------------------------------------------------
  // SCREEN 2 - REJECT
  // ------------------------------------------------------------

  if (row === 19 && column === 8) {

    // H19 is an action control ONLY on Screen 2 (BOOKING DETAIL).
    const screenTitle = String(
      sheet.getRange('A1').getDisplayValue() || ''
    ).trim().toUpperCase();

    if (screenTitle !== 'BOOKING DETAIL') return;

    const bookingId = String(
      sheet.getRange('A2').getDisplayValue() || ''
    ).trim();

    range.setValue(false);

    if (!bookingId) return;

    rejectEDBBookingLive(bookingId);
    return;
  }
}


/* ============================================================
   INSTALL / REINSTALL THE ADMIN UI EDIT TRIGGER
   ============================================================ */

function installEDBOperationsEditTrigger() {

  const ss = SpreadsheetApp.openById(
    '1hHdFRgj1YnBqQATLd94iEGuRDqxOIsQEd8w1DKmYQfQ'
  );

  // Remove only the old EDB Admin UI handler trigger(s).
  ScriptApp.getProjectTriggers().forEach(function(trigger) {

    if (
      trigger.getHandlerFunction() ===
        'handleEDBOperationsEdit'
    ) {
      ScriptApp.deleteTrigger(trigger);
    }

  });

  ScriptApp.newTrigger('handleEDBOperationsEdit')
    .forSpreadsheet(ss)
    .onEdit()
    .create();

  Logger.log(
    'EDB Admin UI edit trigger installed successfully.'
  );
}


/* ============================================================
   DIAGNOSTIC - LIST EDB ADMIN UI TRIGGERS
   ============================================================ */

function diagnoseEDBOperationsEditTrigger() {

  const output = [];

  ScriptApp.getProjectTriggers().forEach(function(trigger) {

    output.push({
      handler: trigger.getHandlerFunction(),
      eventType: String(trigger.getEventType()),
      source: String(trigger.getTriggerSource())
    });

  });

  Logger.log(JSON.stringify(output, null, 2));

  return output;
}
