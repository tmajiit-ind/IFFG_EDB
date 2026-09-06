/*
============================================================
IFFG EDB - SHEET DEPENDENCY SCANNER
VERSION: V1
ASCII ONLY
============================================================

PURPOSE
-------
Check whether candidate sheets are referenced by formulas,
named ranges, and data validations in the spreadsheet.

This does NOT inspect Apps Script source code.
It therefore does NOT authorize deletion by itself.

Run:
runEDBSheetDependencyScannerV1_ASCII()

Output:
EDB SHEET DEPENDENCY SCAN V1

The scan is read-only.
No source/application data is changed.

============================================================
*/

var EDB_DEP_SCAN_SPREADSHEET_ID =
  '1hHdFRgj1YnBqQATLd94iEGuRDqxOIsQEd8w1DKmYQfQ';

var EDB_DEP_SCAN_OUTPUT =
  'EDB SHEET DEPENDENCY SCAN V1';


function runEDBSheetDependencyScannerV1_ASCII() {

  var ss =
    SpreadsheetApp.openById(
      EDB_DEP_SCAN_SPREADSHEET_ID
    );

  var candidateNames = [
    'EDB Lifecycle Test Results',
    'EDB Lifecycle 10 Scenario Audit',
    'EDB Booking Detail Diagnostic',
    'EDB Booking Detail Audit',
    'EDB Scenario V1 Backup',
    'EDB Scenario V1 Change Log',
    'EDB Dashboard',
    'IFFG EDB - Admin Configuration',
    '_EDB_B7D1_Lists'
  ];

  var output = [];

  output.push([
    'Candidate Sheet',
    'Formula References',
    'Formula Locations',
    'Data Validation References',
    'Named Range References',
    'Recommendation',
    'Reason'
  ]);

  var allNamedRanges =
    ss.getNamedRanges();

  var namedRangeHits = {};

  allNamedRanges.forEach(
    function(nr) {

      var name =
        nr.getName();

      var range =
        nr.getRange();

      var sheetName =
        range.getSheet().getName();

      candidateNames.forEach(
        function(candidate) {

          if (
            sheetName === candidate
          ) {

            if (!namedRangeHits[candidate]) {
              namedRangeHits[candidate] = [];
            }

            namedRangeHits[candidate].push(
              name +
              ' -> ' +
              sheetName +
              '!' +
              range.getA1Notation()
            );

          }
        }
      );
    }
  );

  for (
    var i = 0;
    i < candidateNames.length;
    i++
  ) {

    var candidate =
      candidateNames[i];

    var formulaHits = [];
    var validationHits = [];

    var sheets =
      ss.getSheets();

    for (
      var s = 0;
      s < sheets.length;
      s++
    ) {

      var sheet =
        sheets[s];

      var sheetName =
        sheet.getName();

      /*
       * Do not count a sheet referring to itself merely because
       * the candidate name occurs in its own name.
       */

      var range =
        sheet.getDataRange();

      var formulas =
        range.getFormulas();

      for (
        var r = 0;
        r < formulas.length;
        r++
      ) {

        for (
          var c = 0;
          c < formulas[r].length;
          c++
        ) {

          var formula =
            formulas[r][c];

          if (!formula) {
            continue;
          }

          if (
            formula.indexOf(
              candidate
            ) >= 0
          ) {

            formulaHits.push(
              sheetName +
              '!' +
              range
                .getCell(
                  r + 1,
                  c + 1
                )
                .getA1Notation()
            );

          }
        }
      }

      /*
       * Data validation formulas.
       */

      var validations =
        range.getDataValidations();

      for (
        var vr = 0;
        vr < validations.length;
        vr++
      ) {

        for (
          var vc = 0;
          vc < validations[vr].length;
          vc++
        ) {

          var rule =
            validations[vr][vc];

          if (!rule) {
            continue;
          }

          var criteria =
            rule.getCriteriaType();

          var args =
            rule.getCriteriaValues();

          var text =
            String(args);

          if (
            text.indexOf(
              candidate
            ) >= 0
          ) {

            validationHits.push(
              sheetName +
              '!' +
              range
                .getCell(
                  vr + 1,
                  vc + 1
                )
                .getA1Notation() +
              ' [' +
              criteria +
              ']'
            );

          }
        }
      }
    }

    var nrHits =
      namedRangeHits[candidate] || [];

    var recommendation =
      'REVIEW';

    var reason =
      'No spreadsheet dependency found; Apps Script code still needs review.';

    if (
      formulaHits.length > 0 ||
      validationHits.length > 0 ||
      nrHits.length > 0
    ) {

      recommendation =
        'KEEP';

      reason =
        'Spreadsheet dependency found. Do not delete.';

    }

    output.push([
      candidate,
      formulaHits.length,
      formulaHits.join('\n'),
      validationHits.length,
      nrHits.join('\n'),
      recommendation,
      reason
    ]);
  }

  var outputSheet =
    ss.getSheetByName(
      EDB_DEP_SCAN_OUTPUT
    );

  if (!outputSheet) {
    outputSheet =
      ss.insertSheet(
        EDB_DEP_SCAN_OUTPUT
      );
  }

  outputSheet.clear();
  outputSheet.clearFormats();

  outputSheet
    .getRange(
      1,
      1,
      output.length,
      output[0].length
    )
    .setValues(
      output
    );

  outputSheet
    .getRange(
      1,
      1,
      1,
      output[0].length
    )
    .setFontWeight(
      'bold'
    );

  outputSheet.setFrozenRows(1);

  outputSheet.setColumnWidth(1, 310);
  outputSheet.setColumnWidth(2, 130);
  outputSheet.setColumnWidth(3, 420);
  outputSheet.setColumnWidth(4, 170);
  outputSheet.setColumnWidth(5, 320);
  outputSheet.setColumnWidth(6, 130);
  outputSheet.setColumnWidth(7, 390);

  outputSheet
    .getDataRange()
    .setWrap(true);

  SpreadsheetApp.flush();

  Logger.log(
    'EDB sheet dependency scan complete. ' +
    'No sheets were deleted.'
  );

  return output;
}
