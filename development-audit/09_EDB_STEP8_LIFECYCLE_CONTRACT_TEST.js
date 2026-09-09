/*
 * IFFG EDB - STEP 8
 * AUTOMATIC LIFECYCLE CONTRACT REGRESSION
 *
 * Purpose:
 *   Verify the settled lifecycle contract independently of the live
 *   Response Sheet and without writing to any spreadsheet.
 *
 * Contract:
 *   - Approval must be Approved.
 *   - Payment must be Paid.
 *   - Confirmed/Final/Requested dates determine the automatic state.
 *   - Stored Display Status must NOT override the date-derived state
 *     once the booking is paid + approved and valid dates exist.
 *   - Rejected / Archived remains non-displayable.
 */

function runEDBStep8LifecycleContractTest() {

  if (typeof getEDBAutomaticDisplayState !== 'function') {
    throw new Error(
      'STEP 8 lifecycle test: getEDBAutomaticDisplayState is unavailable.'
    );
  }

  const headers = {
    'approval status': 0,
    'payment status': 1,
    'display status': 2,
    'confirmed start date': 3,
    'confirmed end date': 4,
    'requested start date': 5,
    'requested end date': 6
  };

  const row = [
    'Approved',
    'Paid',
    'Rejected',
    new Date(2026, 8, 10),
    new Date(2026, 8, 12),
    '',
    ''
  ];

  const before = JSON.stringify(row);

  const scheduled = getEDBAutomaticDisplayState(
    row,
    headers,
    new Date(2026, 8, 9)
  );

  const displaying = getEDBAutomaticDisplayState(
    row,
    headers,
    new Date(2026, 8, 11)
  );

  const completed = getEDBAutomaticDisplayState(
    row,
    headers,
    new Date(2026, 8, 13)
  );

  const after = JSON.stringify(row);

  if (scheduled !== 'scheduled') {
    throw new Error(
      'STEP 8 lifecycle test failed: expected scheduled, got ' + scheduled
    );
  }

  if (displaying !== 'currently displaying') {
    throw new Error(
      'STEP 8 lifecycle test failed: expected currently displaying, got ' + displaying
    );
  }

  if (completed !== 'display period over') {
    throw new Error(
      'STEP 8 lifecycle test failed: expected display period over, got ' + completed
    );
  }

  if (before !== after) {
    throw new Error(
      'STEP 8 lifecycle test failed: input row was modified.'
    );
  }

  console.log(
    'STEP 8 lifecycle contract PASS: date-derived state overrides stored Display Status and input remains read-only.'
  );

  return {
    status: 'PASS',
    scheduled: scheduled,
    displaying: displaying,
    completed: completed,
    readOnly: true
  };
}
