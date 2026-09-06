/*
============================================================
IFFG EDB - SHEET INVENTORY AND SAFE CLEANUP
VERSION: V1
ASCII ONLY
============================================================

PURPOSE
-------
Inventory every sheet in the EDB spreadsheet and classify it.

THIS VERSION DOES NOT DELETE ANY SHEET.

Run:
runEDBSheetInventoryV1_ASCII()

It creates/refreshes:
EDB SHEET INVENTORY V1

The inventory identifies:
- core/live sheets
- current test checkpoint sheets
- audit/test output sheets
- likely obsolete sheets

IMPORTANT:
No deletion is performed by this script.

After reviewing the inventory, the delete function can be
enabled deliberately for named sheets only.

============================================================
*/

var EDB_SHEET_INVENTORY_SPREADSHEET_ID =
  '1hHdFRgj1YnBqQATLd94iEGuRDqxOIsQEd8w1DKmYQfQ';

var EDB_SHEET_INVENTORY_OUTPUT =
  'EDB SHEET INVENTORY V1';


function runEDBSheetInventoryV1_ASCII() {

  var ss =
    SpreadsheetApp.openById(
      EDB_SHEET_INVENTORY_SPREADSHEET_ID
    );

  var sheets =
    ss.getSheets();

  var output = [];

  output.push([
    'Sheet Name',
    'Index',
    'Rows',
    'Columns',
    'Classification',
    'Action',
    'Reason'
  ]);

  for (
    var i = 0;
    i < sheets.length;
    i++
  ) {

    var sheet =
      sheets[i];

    var name =
      sheet.getName();

    var classification =
      classifyEDBSheetV1_(
        name
      );

    output.push([
      name,
      i + 1,
      sheet.getLastRow(),
      sheet.getLastColumn(),
      classification.classification,
      classification.action,
      classification.reason
    ]);
  }

  var inventory =
    ss.getSheetByName(
      EDB_SHEET_INVENTORY_OUTPUT
    );

  if (!inventory) {
    inventory =
      ss.insertSheet(
        EDB_SHEET_INVENTORY_OUTPUT
      );
  }

  inventory.clear();
  inventory.clearFormats();

  inventory
    .getRange(
      1,
      1,
      output.length,
      output[0].length
    )
    .setValues(
      output
    );

  inventory
    .getRange(
      1,
      1,
      1,
      output[0].length
    )
    .setFontWeight(
      'bold'
    );

  inventory.setFrozenRows(1);

  inventory.setColumnWidth(1, 330);
  inventory.setColumnWidth(2, 70);
  inventory.setColumnWidth(3, 80);
  inventory.setColumnWidth(4, 80);
  inventory.setColumnWidth(5, 180);
  inventory.setColumnWidth(6, 150);
  inventory.setColumnWidth(7, 420);

  SpreadsheetApp.flush();

  Logger.log(
    'EDB sheet inventory complete. ' +
    'No sheets were deleted.'
  );

  return output;
}


function classifyEDBSheetV1_(
  name
) {

  var upper =
    String(name)
      .toUpperCase();

  /*
   * Permanent/source sheets.
   */

  if (
    upper === 'FORM RESPONSES 1'
  ) {
    return {
      classification: 'CORE SOURCE',
      action: 'KEEP',
      reason: 'Resident submission source.'
    };
  }

  if (
    upper === 'EDB ADMIN UI' ||
    upper.indexOf('EDB ADMIN UI') === 0
  ) {
    return {
      classification: 'LIVE UI',
      action: 'KEEP',
      reason: 'Current Admin UI / Operations Console family.'
    };
  }

  /*
   * Protected test checkpoint.
   */

  if (
    upper === 'EDB SCENARIO V1 BACKUP'
  ) {
    return {
      classification: 'TEST BACKUP',
      action: 'KEEP',
      reason: 'Protected rollback checkpoint created by controlled harness.'
    };
  }

  if (
    upper === 'EDB SCENARIO V1 CHANGE LOG'
  ) {
    return {
      classification: 'TEST LOG',
      action: 'KEEP FOR NOW',
      reason: 'Records exactly what the controlled harness changed.'
    };
  }

  /*
   * Inventory sheet itself.
   */

  if (
    upper === EDB_SHEET_INVENTORY_OUTPUT.toUpperCase()
  ) {
    return {
      classification: 'ADMIN',
      action: 'KEEP',
      reason: 'Current sheet inventory.'
    };
  }

  /*
   * Do not automatically classify audit sheets as obsolete.
   * They must be reviewed because they contain evidence.
   */

  if (
    upper.indexOf('AUDIT') >= 0
  ) {
    return {
      classification: 'AUDIT EVIDENCE',
      action: 'REVIEW BEFORE DELETE',
      reason: 'May contain test evidence; exact version must be confirmed.'
    };
  }

  if (
    upper.indexOf('TEST') >= 0 ||
    upper.indexOf('SCENARIO') >= 0
  ) {
    return {
      classification: 'TEST / SCENARIO',
      action: 'REVIEW BEFORE DELETE',
      reason: 'May be an active test artifact or an obsolete checkpoint.'
    };
  }

  /*
   * Unknown sheets are deliberately preserved.
   */

  return {
    classification: 'UNCLASSIFIED',
    action: 'KEEP / REVIEW',
    reason: 'Not safe to classify from name alone.'
  };
}


/*
============================================================
CONTROLLED DELETE
============================================================

This function is intentionally disabled.

DO NOT change this function until the inventory has been
reviewed and the exact obsolete sheet names have been agreed.

============================================================
*/

function deleteEDBApprovedCleanupSheetsV1_ASCII() {

  throw new Error(
    'Deletion is intentionally locked. Review EDB SHEET INVENTORY V1 first.'
  );
}
