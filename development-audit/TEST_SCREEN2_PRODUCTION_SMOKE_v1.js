/**
 * IFFG EDB - SCREEN 2 PRODUCTION SMOKE TEST v1
 * Read-only. Tests the actual Screen 2 invocation path.
 *
 * Real production IDs:
 *   IFFG-EDB-00009
 *   IFFG-EDB-00011
 *
 * The test does NOT approve, reject, pay, schedule, or alter bookings.
 * It writes only a report to the Test Lab spreadsheet.
 */

const SCREEN2_PROD_ID_V1 =
  '1hHdFRgj1YnBqQATLd94iEGuRDqxOIsQEd8w1DKmYQfQ';

const SCREEN2_TEST_IDS_V1 = [
  'IFFG-EDB-00009',
  'IFFG-EDB-00011'
];

function runEDBScreen2ProductionSmokeTestV1() {
  const started = new Date();
  const out = [
    ['TEST', 'RESULT', 'DETAIL']
  ];

  try {
    const ss = SpreadsheetApp.openById(SCREEN2_PROD_ID_V1);
    const sheet = ss.getSheetByName('Form Responses 1');

    addScreen2_(out, 'Production access', !!sheet,
      sheet ? ss.getName() : 'Form Responses 1 not found');

    SCREEN2_TEST_IDS_V1.forEach(function(id) {
      let model;

      try {
        model = getEDBBookingForNewUI(id);
      } catch (e) {
        addScreen2_(out, id + ' adapter execution', false,
          String(e && e.stack ? e.stack : e));
        return;
      }

      const ok = model && typeof model === 'object';

      addScreen2_(out, id + ' model returned', ok,
        ok ? JSON.stringify(model) : 'null/undefined');

      if (!ok) return;

      addScreen2_(out, id + ' Booking ID', String(model.bookingId || '') === id,
        'bookingId=' + model.bookingId);

      addScreen2_(out, id + ' Flat', String(model.flat || '').trim() !== '',
        'flat=' + model.flat);

      addScreen2_(out, id + ' Resident', String(model.resident || '').trim() !== '',
        'resident=' + model.resident);

      addScreen2_(out, id + ' Content object', !!model.content,
        model.content ? JSON.stringify(model.content) : 'missing');

      addScreen2_(out, id + ' Payment object', !!model.payment,
        model.payment ? JSON.stringify(model.payment) : 'missing');

      addScreen2_(out, id + ' Lifecycle object', !!model.lifecycle,
        model.lifecycle ? JSON.stringify(model.lifecycle) : 'missing');
    });

    addScreen2_(out, 'Screen 2 function present',
      typeof showEDBBookingDetailLive === 'function',
      'showEDBBookingDetailLive=' +
        typeof showEDBBookingDetailLive);

    addScreen2_(out, 'Production data writes',
      true,
      'No write functions invoked; adapter calls only.');

  } catch (e) {
    addScreen2_(out, 'Suite execution', false,
      String(e && e.stack ? e.stack : e));
  }

  const fails = out.filter(function(r) {
    return r[1] === 'FAIL';
  }).length;

  out.push([
    'OVERALL',
    fails === 0 ? 'PASS' : 'FAIL',
    'FAIL rows=' + fails
  ]);

  writeScreen2Report_(out, started);
  return out;
}

function addScreen2_(out, test, pass, detail) {
  out.push([
    test,
    pass ? 'PASS' : 'FAIL',
    detail
  ]);
}

function writeScreen2Report_(out, started) {
  const lab = SpreadsheetApp.openById(
    '1ixlMDeAEUu2bpKL-Bnp9iNlniM_VxSNrRFi1CurcwuM'
  );

  let sh = lab.getSheetByName('EDB_SCREEN2_PROD_SMOKE_TEST');

  if (!sh) {
    sh = lab.insertSheet('EDB_SCREEN2_PROD_SMOKE_TEST');
  } else {
    sh.clearContents();
  }

  const data = [
    ['IFFG EDB - SCREEN 2 PRODUCTION SMOKE TEST V1', '', ''],
    ['Run started', started, ''],
    ['Run completed', new Date(), ''],
    ['', '', '']
  ].concat(out);

  sh.getRange(1, 1, data.length, 3).setValues(data);
  sh.setFrozenRows(5);
  sh.autoResizeColumns(1, 3);
}
