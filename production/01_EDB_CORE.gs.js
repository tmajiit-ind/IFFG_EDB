/*
 * IFFG ELECTRONIC DISPLAY BOARD
 *
 * MASTER MERGED PRODUCTION SCRIPT - V5 AUTOMATIC LIFECYCLE
 *
 * This file combines:
 *   - Existing IFFG Displayboard production code (B2/B5/B7)
 *   - EB-payment conf production code (B3-A/B3-B/B4/B6)
 *
 * Merge safety:
 *   - Existing displayboard.gs is the base.
 *   - Duplicate top-level functions already present in displayboard.gs
 *     are not duplicated from EB-payment conf.gs.
 *   - No business logic has intentionally been rewritten.
 *
 * MIGRATION NOTE:
 *   Replace the existing displayboard.gs contents with this file only
 *   after preserving a backup of the current production displayboard.gs.
 *   Keep the old EB-payment project intact until triggers and live
 *   payment processing have been verified.
 */
/***************************************************************
 * IFFG ELECTRONIC DISPLAY BOARD
 *
 * PART B2
 * BOOKING CAPTURE + MEDIA VALIDATION
 * + PRICING + GST
 * + AUTOMATIC REQUESTED DATES
 *
 * FORM-BOUND APPS SCRIPT
 *
 * NO RESPONSE SHEET ID / GID / SHEET NAME IS HARDCODED.
 *
 * B5 UPDATE:
 * -------------------------------------------------------------
 * Pricing and GST are now read from:
 *
 *   IFFG EDB - Admin Configuration
 *
 * Final rates:
 *
 * IMAGE
 *   1 Day    = Rs. 500
 *   1 Week   = Rs. 1,750
 *   1 Month  = Rs. 5,250
 *
 * PDF
 *   1 Day    = Rs. 800
 *   1 Week   = Rs. 2,800
 *   1 Month  = Rs. 8,400
 *
 * VIDEO
 *   1 Day    = Rs. 1,200
 *   1 Week   = Rs. 4,200
 *   1 Month  = Rs. 12,600
 *
 * GST = 18%
 *
 * WhatsApp / UPI settings are NOT yet read here.
 * Those will be handled in B6.
 ***************************************************************/


/* ============================================================
   1. CONFIGURATION
   ============================================================ */

const CONFIG = {

  /*
   * B5:
   *
   * GST is no longer directly used from this constant
   * for pricing.
   *
   * It is retained here only for backward compatibility
   * and will be superseded by Admin Configuration.
   */

  GST_RATE: 0.18,

  FM_WHATSAPP:
    '919391756155',

  ACCOUNTS_WHATSAPP:
    '919391756155',

  PAYMENT_UPI:
    '',

  MAX_FILE_SIZE_MB: {

    IMAGE: 2,

    PDF: 10,

    VIDEO: 3
  },

  BOOKING_PREFIX:
    'IFFG-EDB-'
};


/* ============================================================
   2. ADMIN CONFIGURATION
   ============================================================ */

const B5_ADMIN_CONFIG = {

  SHEET_NAME:
    'IFFG EDB - Admin Configuration',

  DEFAULT_GST_RATE:
    0.18,

  DEFAULT_RATES: {

    IMAGE: {

      '1 Day':
        500,

      '1 Week':
        1750,

      '1 Month':
        5250
    },

    PDF: {

      '1 Day':
        800,

      '1 Week':
        2800,

      '1 Month':
        8400
    },

    VIDEO: {

      '1 Day':
        1200,

      '1 Week':
        4200,

      '1 Month':
        12600
    }
  }

};


/* ============================================================
   3. MAIN FORM SUBMISSION
   ============================================================ */

function processDisplayBooking(e) {

  if (
    !e ||
    !e.response
  ) {

    throw new Error(
      'processDisplayBooking must be triggered by a Google Form submission.'
    );
  }


  const formResponse =
    e.response;


  const responseItems =
    formResponse.getItemResponses();


  const data =
    extractFormResponseData(
      responseItems
    );


  const bookingId =
    generateBookingId();


  const media =
    processMedia(
      data.mediaType,
      data.mediaResponse
    );


  const validation =
    validateMedia(
      data.mediaType,
      media
    );


  const sheet =
    getResponseSheet();


  const adminColumns =
    ensureAdminColumns(
      sheet
    );


  const rowNumber =
    findSubmittedRow(
      sheet,
      data
    );


  if (!rowNumber) {

    throw new Error(
      'Unable to locate the submitted response row.'
    );
  }


  /*
   * Calculate pricing and requested dates
   * only when the media is valid.
   */

  let pricing = {

    baseCharge: '',

    gst: '',

    totalPayable: ''
  };


  let requestedDates = {

    requestedStartDate: '',

    requestedEndDate: ''
  };


  if (
    validation.status === 'PASS'
  ) {

    pricing =
      calculatePricing(
        data.mediaType,
        data.duration
      );


    requestedDates =
      calculateRequestedDates(
        data.startDate,
        data.duration
      );
  }


  writeAdminData(

    sheet,

    rowNumber,

    adminColumns,

    {

      bookingId:
        bookingId,

      media:
        media,

      validation:
        validation,

      pricing:
        pricing,

      requestedDates:
        requestedDates
    }
  );


  console.log(
    'IFFG Display Booking processed: ' +
    bookingId
  );
}


/* ============================================================
   4. EXTRACT FORM RESPONSE DATA
   ============================================================ */

function extractFormResponseData(
  responseItems
) {

  const data = {

    flatNo: '',

    residentName: '',

    whatsapp: '',

    mediaType: '',

    duration: '',

    startDate: '',

    instructions: '',

    mediaResponse: ''
  };


  responseItems.forEach(
    itemResponse => {

      const title =
        itemResponse
          .getItem()
          .getTitle()
          .trim();


      const response =
        itemResponse.getResponse();


      const header =
        normaliseHeader(
          title
        );


      if (
        header.includes(
          'flat no'
        )
      ) {

        data.flatNo =
          String(
            response || ''
          ).trim();

        return;
      }


      if (
        header.includes(
          'resident name'
        )
      ) {

        data.residentName =
          String(
            response || ''
          ).trim();

        return;
      }


      if (
        header.includes(
          'whatsapp'
        )
      ) {

        data.whatsapp =
          String(
            response || ''
          ).trim();

        return;
      }


      if (
        header.includes(
          'what type of material'
        )
      ) {

        data.mediaType =
          normaliseMediaType(
            response
          );

        return;
      }


      if (
        header.includes(
          'desired display duration'
        )
      ) {

        data.duration =
          String(
            response || ''
          ).trim();

        return;
      }


      if (
        header.includes(
          'preferred start date'
        )
      ) {

        data.startDate =
          response;

        return;
      }


      if (
        header.includes(
          'display instructions'
        )
      ) {

        data.instructions =
          String(
            response || ''
          ).trim();

        return;
      }


      /*
       * File upload.
       */

      if (
        header.includes(
          'upload image'
        ) ||

        header.includes(
          'upload pdf'
        ) ||

        header.includes(
          'upload video'
        ) ||

        header.includes(
          'file upload'
        ) ||

        header.includes(
          'please upload'
        )
      ) {

        data.mediaResponse =
          extractMediaResponse(
            response
          );
      }

    }
  );


  return data;
}


/* ============================================================
   5. EXTRACT MEDIA RESPONSE
   ============================================================ */

function extractMediaResponse(
  response
) {

  if (!response) {

    return '';
  }


  if (
    Array.isArray(response)
  ) {

    if (
      response.length === 0
    ) {

      return '';
    }


    return String(
      response[0]
    ).trim();
  }


  return String(
    response
  ).trim();
}


/* ============================================================
   6. NORMALISE HEADER
   ============================================================ */

function normaliseHeader(
  value
) {

  return String(
    value || ''
  )

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
}


/* ============================================================
   7. NORMALISE MEDIA TYPE
   ============================================================ */

function normaliseMediaType(
  value
) {

  const v =
    String(
      value || ''
    )
      .trim()
      .toUpperCase();


  if (
    v === 'IMAGE'
  ) {

    return 'IMAGE';
  }


  if (
    v === 'PDF'
  ) {

    return 'PDF';
  }


  if (
    v === 'VIDEO'
  ) {

    return 'VIDEO';
  }


  return 'UNKNOWN';
}


/* ============================================================
   8. PROCESS MEDIA
   ============================================================ */

function processMedia(
  mediaType,
  mediaResponse
) {

  const result = {

    exists: false,

    fileId: '',

    fileName: '',

    fileSizeBytes: 0,

    fileSizeMB: 0,

    mimeType: '',

    url: '',

    error: ''
  };


  if (
    !mediaResponse
  ) {

    result.error =
      'No media file was submitted.';

    return result;
  }


  const fileId =
    extractDriveFileId(
      mediaResponse
    );


  if (!fileId) {

    result.error =
      'Could not extract Google Drive file ID from: ' +
      mediaResponse;

    return result;
  }


  try {

    const file =
      DriveApp.getFileById(
        fileId
      );


    result.exists = true;


    result.fileId =
      file.getId();


    result.fileName =
      file.getName();


    result.fileSizeBytes =
      file.getSize();


    result.fileSizeMB =
      Math.round(

        (
          file.getSize() /
          (1024 * 1024)
        ) * 100

      ) / 100;


    result.mimeType =
      file.getMimeType();


    result.url =
      file.getUrl();

  }


  catch (err) {

    result.error =
      'Unable to access uploaded Drive file: ' +
      err.message;
  }


  return result;
}


/* ============================================================
   9. EXTRACT DRIVE FILE ID
   ============================================================ */

function extractDriveFileId(
  value
) {

  const url =
    String(
      value || ''
    ).trim();


  let match =
    url.match(
      /[?&]id=([a-zA-Z0-9_-]+)/
    );


  if (match) {

    return match[1];
  }


  match =
    url.match(
      /\/file\/d\/([a-zA-Z0-9_-]+)/
    );


  if (match) {

    return match[1];
  }


  if (
    /^[a-zA-Z0-9_-]{20,}$/
      .test(url)
  ) {

    return url;
  }


  return '';
}


/* ============================================================
   10. VALIDATE MEDIA
   ============================================================ */

function validateMedia(
  mediaType,
  media
) {

  const result = {

    status: 'PASS',

    reason: ''
  };


  if (
    !media.exists
  ) {

    result.status =
      'FAIL';

    result.reason =
      media.error;

    return result;
  }


  const maxMB =
    CONFIG.MAX_FILE_SIZE_MB[
      mediaType
    ];


  if (!maxMB) {

    result.status =
      'FAIL';

    result.reason =
      'Unknown media type: ' +
      mediaType;

    return result;
  }


  if (
    media.fileSizeMB > maxMB
  ) {

    result.status =
      'FAIL';

    result.reason =
      'File size ' +
      media.fileSizeMB +
      ' MB exceeds permitted ' +
      maxMB +
      ' MB.';

    return result;
  }


  const mime =
    media.mimeType.toLowerCase();


  if (
    mediaType === 'IMAGE' &&
    !mime.startsWith('image/')
  ) {

    result.status =
      'FAIL';

    result.reason =
      'Selected Image but uploaded file is ' +
      media.mimeType;

    return result;
  }


  if (
    mediaType === 'PDF' &&
    mime !== 'application/pdf'
  ) {

    result.status =
      'FAIL';

    result.reason =
      'Selected PDF but uploaded file is ' +
      media.mimeType;

    return result;
  }


  if (
    mediaType === 'VIDEO' &&
    !mime.startsWith('video/')
  ) {

    result.status =
      'FAIL';

    result.reason =
      'Selected Video but uploaded file is ' +
      media.mimeType;

    return result;
  }


  return result;
}


/* ============================================================
   11. B5 PRICING
   ============================================================

   IMPORTANT:
   Pricing is now read from:

   IFFG EDB - Admin Configuration

   GST is also read from the same sheet.

   If the Admin Configuration sheet cannot be read,
   the function automatically creates/populates it
   with the final approved rates.
   ============================================================ */

function calculatePricing(
  mediaType,
  duration
) {

  const config =
    getEDBAdminPricing();


  const rates =
    config.rates;


  const gstRate =
    config.gstRate;


  if (
    !rates[mediaType]
  ) {

    throw new Error(
      'No rates configured for media type: ' +
      mediaType
    );
  }


  if (
    rates[mediaType][duration] ===
    undefined
  ) {

    throw new Error(
      'No rate configured for duration: ' +
      duration
    );
  }


  const baseCharge =
    Number(
      rates[mediaType][duration]
    );


  const gst =
    Math.round(

      baseCharge *
      gstRate *
      100

    ) / 100;


  const totalPayable =
    Math.round(

      (
        baseCharge +
        gst
      ) * 100

    ) / 100;


  return {

    baseCharge:
      baseCharge,

    gst:
      gst,

    totalPayable:
      totalPayable
  };
}


/* ============================================================
   12. READ ADMIN PRICING
   ============================================================ */

function getEDBAdminPricing() {

  const form =
    FormApp.getActiveForm();


  if (!form) {

    throw new Error(
      'Unable to access the active Google Form.'
    );
  }


  const destinationId =
    form.getDestinationId();


  if (!destinationId) {

    throw new Error(
      'The Form does not currently have a linked response spreadsheet.'
    );
  }


  const spreadsheet =
    SpreadsheetApp.openById(
      destinationId
    );


  let sheet =
    spreadsheet.getSheetByName(
      B5_ADMIN_CONFIG.SHEET_NAME
    );


  /*
   * Read GST.
   *
   * B7 is the GST value in the B4 layout.
   */

  let gstRate =
    Number(
      sheet
        .getRange('B7')
        .getValue()
    );


  /*
   * If GST is blank or invalid,
   * restore the approved 18%.
   */

  if (
    isNaN(gstRate) ||
    gstRate < 0
  ) {

    gstRate =
      B5_ADMIN_CONFIG.DEFAULT_GST_RATE;


    sheet
      .getRange('B7')
      .setValue(
        gstRate
      )
      .setNumberFormat(
        '0%'
      );
  }


  /*
   * Read the media rate table.
   *
   * B11:D13:
   *
   * Image
   * PDF
   * Video
   */

  const rateValues =
    sheet
      .getRange(
        'A11:D13'
      )
      .getValues();


  const rates = {};


  rateValues.forEach(
    row => {

      const mediaType =
        String(
          row[0] || ''
        )
          .trim()
          .toUpperCase();


      if (
        !mediaType
      ) {

        return;
      }


      rates[mediaType] = {

        '1 Day':
          Number(row[1]),

        '1 Week':
          Number(row[2]),

        '1 Month':
          Number(row[3])
      };

    }
  );


  /*
   * Check whether the rate table contains
   * valid values.
   *
   * If the B4 sheet still contains the initial
   * zero placeholders, populate the final
   * approved rates automatically.
   */

  const needsDefaults =
    !hasValidEDBRates(
      rates
    );


  if (
    needsDefaults
  ) {

    writeB5DefaultRates(
      sheet
    );


    return {

      rates:
        B5_ADMIN_CONFIG.DEFAULT_RATES,

      gstRate:
        gstRate
    };
  }


  return {

    rates:
      rates,

    gstRate:
      gstRate
  };
}


/* ============================================================
   13. CHECK ADMIN RATES
   ============================================================ */

function hasValidEDBRates(
  rates
) {

  const mediaTypes = [

    'IMAGE',
    'PDF',
    'VIDEO'
  ];


  const durations = [

    '1 Day',
    '1 Week',
    '1 Month'
  ];


  for (
    let i = 0;
    i < mediaTypes.length;
    i++
  ) {

    const mediaType =
      mediaTypes[i];


    if (
      !rates[mediaType]
    ) {

      return false;
    }


    for (
      let j = 0;
      j < durations.length;
      j++
    ) {

      const duration =
        durations[j];


      const value =
        Number(
          rates[mediaType][duration]
        );


      if (
        isNaN(value) ||
        value <= 0
      ) {

        return false;
      }

    }

  }


  return true;
}


/* ============================================================
   14. WRITE FINAL APPROVED DEFAULT RATES
   ============================================================ */

function writeB5DefaultRates(
  sheet
) {

  sheet
    .getRange(
      'A10:D13'
    )
    .setValues([

      [
        'MEDIA RATES',
        '1 Day',
        '1 Week',
        '1 Month'
      ],

      [
        'Image',
        500,
        1750,
        5250
      ],

      [
        'PDF',
        800,
        2800,
        8400
      ],

      [
        'Video',
        1200,
        4200,
        12600
      ]

    ]);


  sheet
    .getRange(
      'B11:D13'
    )
    .setNumberFormat(
      '\u20B9#,##0.00'
    );


  console.log(
    'B5: Final approved media rates written to Admin Configuration.'
  );
}


/* ============================================================
   15. CREATE B5 ADMIN CONFIGURATION IF NEEDED
   ============================================================ */

function createB5AdminConfiguration() {

  const form =
    FormApp.getActiveForm();


  if (!form) {

    throw new Error(
      'Unable to access the active Google Form.'
    );
  }


  /*
   * Get the Form's current response spreadsheet
   * dynamically.
   *
   * No Spreadsheet ID, GID or sheet name is
   * hardcoded.
   */

  const destinationId =
    form.getDestinationId();


  if (!destinationId) {

    throw new Error(
      'The Form does not currently have a linked response spreadsheet.'
    );
  }


  const spreadsheet =
    SpreadsheetApp.openById(
      destinationId
    );


  let sheet =
    spreadsheet.getSheetByName(
      B5_ADMIN_CONFIG.SHEET_NAME
    );


  /*
   * Create the Admin Configuration sheet
   * if it does not already exist.
   */

  if (!sheet) {

    sheet =
      spreadsheet.insertSheet(
        B5_ADMIN_CONFIG.SHEET_NAME
      );
  }


  /* ========================================================
     GENERAL SETTINGS
     ======================================================== */

  sheet
    .getRange(
      'A3:B8'
    )
    .setValues([

      [
        'GENERAL SETTINGS',
        'VALUE'
      ],

      [
        'FM Office WhatsApp',
        '919391756155'
      ],

      [
        'Accounts WhatsApp',
        '919391756155'
      ],

      [
        'Payment UPI ID',
        ''
      ],

      [
        'GST Rate',
        0.18
      ],

      [
        'Currency',
        'INR'
      ]

    ]);


  sheet
    .getRange(
      'B7'
    )
    .setNumberFormat(
      '0%'
    );


  /* ========================================================
     FINAL APPROVED MEDIA RATES
     ======================================================== */

  writeB5DefaultRates(
    sheet
  );


  /* ========================================================
     FORMATTING
     ======================================================== */

  sheet
    .getRange(
      'A3:B8'
    )
    .setBorder(
      true,
      true,
      true,
      true,
      true,
      true
    );


  sheet
    .getRange(
      'A10:D13'
    )
    .setBorder(
      true,
      true,
      true,
      true,
      true,
      true
    );


  sheet
    .setColumnWidth(
      1,
      240
    );


  sheet
    .setColumnWidth(
      2,
      180
    );


  sheet
    .setColumnWidth(
      3,
      130
    );


  sheet
    .setColumnWidth(
      4,
      130
    );


  console.log(
    'B5 Admin Configuration created/updated.'
  );
}


/* ============================================================
   16. REQUESTED DATE CALCULATION
   ============================================================ */

function calculateRequestedDates(
  startDate,
  duration
) {

  if (
    !startDate
  ) {

    return {

      requestedStartDate: '',

      requestedEndDate: ''
    };
  }


  const start =
    new Date(
      startDate
    );


  if (
    isNaN(
      start.getTime()
    )
  ) {

    return {

      requestedStartDate: '',

      requestedEndDate: ''
    };
  }


  /*
   * Normalise time to midnight.
   */

  start.setHours(
    0,
    0,
    0,
    0
  );


  const end =
    new Date(
      start
    );


  if (
    duration === '1 Day'
  ) {

    /*
     * Same day.
     */

    end.setDate(
      start.getDate()
    );
  }


  else if (
    duration === '1 Week'
  ) {

    /*
     * 7 inclusive days:
     *
     * Start + 6 days.
     */

    end.setDate(
      start.getDate() + 6
    );
  }


  else if (
    duration === '1 Month'
  ) {

    /*
     * One calendar month,
     * minus one day.
     */

    end.setMonth(
      start.getMonth() + 1
    );


    end.setDate(
      end.getDate() - 1
    );
  }


  else {

    return {

      requestedStartDate: '',

      requestedEndDate: ''
    };
  }


  return {

    requestedStartDate:
      start,

    requestedEndDate:
      end
  };
}

/* ============================================================
   17. GET CURRENT RESPONSE SHEET
   ============================================================ */

function getResponseSheet() {

  const form =
    FormApp.getActiveForm();


  if (!form) {

    throw new Error(
      'Unable to access the active Google Form.'
    );
  }


  /*
   * Get the response spreadsheet dynamically
   * from the Google Form.
   *
   * Nothing is hardcoded:
   *
   * - no Spreadsheet ID
   * - no GID
   * - no response Sheet name
   */

  const destinationId =
    form.getDestinationId();


  if (!destinationId) {

    throw new Error(
      'The Form does not currently have a linked response spreadsheet.'
    );
  }


  const spreadsheet =
    SpreadsheetApp.openById(
      destinationId
    );


  const sheets =
    spreadsheet.getSheets();


  /*
   * Identify the Google Forms response sheet
   * by its Timestamp column.
   */

  for (
    let i = 0;
    i < sheets.length;
    i++
  ) {

    const sheet =
      sheets[i];


    const lastColumn =
      Math.max(
        sheet.getLastColumn(),
        1
      );


    const headers =
      sheet
        .getRange(
          1,
          1,
          1,
          lastColumn
        )
        .getValues()[0];


    const isResponseSheet =
      headers.some(
        header =>
          normaliseHeader(
            header
          ) === 'timestamp'
      );


    if (
      isResponseSheet
    ) {

      return sheet;
    }
  }


  throw new Error(
    'Could not identify the Google Forms response sheet by its Timestamp column.'
  );
}


/* ============================================================
   18. ADMIN COLUMNS
   ============================================================ */

function ensureAdminColumns(
  sheet
) {

  const requiredColumns = [

    'Booking ID',

    'Media File Name',

    'Media Size (MB)',

    'Media MIME Type',

    'Media Drive Link',

    'Media Validation',

    'Validation Remarks',

    'Base Charge',

    'GST',

    'Total Payable',

    'Payment Status',

    'Payment UTR / Reference',

    'Payment Date',

    'Approval Status',

    'Requested Start Date',

    'Requested End Date',

    'Confirmed Start Date',

    'Confirmed End Date',

    'Display Status'
  ];


  let headers =
    sheet
      .getRange(
        1,
        1,
        1,
        Math.max(
          sheet.getLastColumn(),
          1
        )
      )
      .getValues()[0];


  requiredColumns.forEach(
    column => {

      if (
        headers.indexOf(
          column
        ) === -1
      ) {

        sheet
          .getRange(
            1,
            sheet.getLastColumn() + 1
          )
          .setValue(
            column
          );


        headers.push(
          column
        );
      }

    }
  );


  const result = {};


  headers.forEach(
    (header, index) => {

      if (header) {

        result[
          header
        ] =
          index + 1;
      }

    }
  );


  return result;
}


/* ============================================================
   19. FIND SUBMITTED ROW
   ============================================================ */

function findSubmittedRow(
  sheet,
  data
) {

  const lastRow =
    sheet.getLastRow();


  if (
    lastRow < 2
  ) {

    return null;
  }


  const values =
    sheet
      .getRange(
        2,
        1,
        lastRow - 1,
        sheet.getLastColumn()
      )
      .getValues();


  for (
    let i = values.length - 1;
    i >= 0;
    i--
  ) {

    const row =
      values[i];


    const flat =
      String(
        row[1] || ''
      ).trim();


    const resident =
      String(
        row[2] || ''
      ).trim();


    if (

      flat ===
        String(
          data.flatNo
        ).trim()

      &&

      resident ===
        String(
          data.residentName
        ).trim()

    ) {

      return i + 2;
    }
  }


  return lastRow;
}


/* ============================================================
   20. WRITE ADMIN DATA
   ============================================================ */

function writeAdminData(
  sheet,
  row,
  columns,
  data
) {

  const media =
    data.media;


  const validation =
    data.validation;


  const pricing =
    data.pricing;


  const requestedDates =
    data.requestedDates;


  /*
   * Media information.
   */

  setCell(
    sheet,
    row,
    columns['Booking ID'],
    data.bookingId
  );


  setCell(
    sheet,
    row,
    columns['Media File Name'],
    media.fileName
  );


  setCell(
    sheet,
    row,
    columns['Media Size (MB)'],
    media.fileSizeMB
  );


  setCell(
    sheet,
    row,
    columns['Media MIME Type'],
    media.mimeType
  );


  setCell(
    sheet,
    row,
    columns['Media Drive Link'],
    media.url
  );


  setCell(
    sheet,
    row,
    columns['Media Validation'],
    validation.status
  );


  setCell(
    sheet,
    row,
    columns['Validation Remarks'],
    validation.reason
  );


  /*
   * Pricing.
   *
   * Invalid media gets blank pricing.
   */

  setCell(
    sheet,
    row,
    columns['Base Charge'],
    pricing.baseCharge
  );


  setCell(
    sheet,
    row,
    columns['GST'],
    pricing.gst
  );


  setCell(
    sheet,
    row,
    columns['Total Payable'],
    pricing.totalPayable
  );


  /*
   * Requested dates.
   */

  setCell(
    sheet,
    row,
    columns['Requested Start Date'],
    requestedDates.requestedStartDate
  );


  setCell(
    sheet,
    row,
    columns['Requested End Date'],
    requestedDates.requestedEndDate
  );


  /*
   * Payment / approval state.
   */

  setCell(
    sheet,
    row,
    columns['Payment Status'],
    'Pending'
  );


  setCell(
    sheet,
    row,
    columns['Approval Status'],
    'Pending'
  );


  setCell(
    sheet,
    row,
    columns['Display Status'],
    'Pending'
  );


  /*
   * Confirmed dates deliberately remain blank
   * until payment is confirmed in B3.
   */

  setCell(
    sheet,
    row,
    columns['Confirmed Start Date'],
    ''
  );


  setCell(
    sheet,
    row,
    columns['Confirmed End Date'],
    ''
  );
}


/* ============================================================
   21. SAFE CELL WRITER
   ============================================================ */

function setCell(
  sheet,
  row,
  column,
  value
) {

  if (
    !column
  ) {

    return;
  }


  sheet
    .getRange(
      row,
      column
    )
    .setValue(
      value
    );
}


/* ============================================================
   22. BOOKING ID
   ============================================================ */

function generateBookingId() {

  const lock =
    LockService
      .getScriptLock();


  lock.waitLock(
    30000
  );


  try {

    const props =
      PropertiesService
        .getScriptProperties();


    let number =
      Number(
        props.getProperty(
          'LAST_BOOKING_NUMBER'
        ) || 0
      );


    number++;


    props.setProperty(
      'LAST_BOOKING_NUMBER',
      String(number)
    );


    return (

      CONFIG.BOOKING_PREFIX +

      String(number)
        .padStart(
          5,
          '0'
        )

    );

  }


  finally {

    lock.releaseLock();
  }
}


/* ============================================================
   23. REPROCESS LAST SUBMISSION
   ============================================================ */

function reprocessLastSubmission() {

  const sheet =
    getResponseSheet();


  const lastRow =
    sheet.getLastRow();


  if (
    lastRow < 2
  ) {

    throw new Error(
      'No Form submissions found.'
    );
  }


  const lastColumn =
    sheet.getLastColumn();


  const headers =
    sheet
      .getRange(
        1,
        1,
        1,
        lastColumn
      )
      .getValues()[0];


  const values =
    sheet
      .getRange(
        lastRow,
        1,
        1,
        lastColumn
      )
      .getValues()[0];


  const mediaType =
    normaliseMediaType(

      getValueByHeaderContains(
        headers,
        values,
        'what type of material'
      )
    );


  const mediaResponse =
    findMediaUrl(
      headers,
      values
    );


  const flatNo =
    getValueByHeaderContains(
      headers,
      values,
      'flat no'
    );


  const residentName =
    getValueByHeaderContains(
      headers,
      values,
      'resident name'
    );


  const duration =
    getValueByHeaderContains(
      headers,
      values,
      'desired display duration'
    );


  const startDate =
    getValueByHeaderContains(
      headers,
      values,
      'preferred start date'
    );


  const data = {

    flatNo:
      flatNo,

    residentName:
      residentName,

    mediaType:
      mediaType,

    duration:
      duration,

    startDate:
      startDate,

    mediaResponse:
      mediaResponse
  };


  const bookingId =
    generateBookingId();


  const media =
    processMedia(
      mediaType,
      mediaResponse
    );


  const validation =
    validateMedia(
      mediaType,
      media
    );


  let pricing = {

    baseCharge: '',

    gst: '',

    totalPayable: ''
  };


  let requestedDates = {

    requestedStartDate: '',

    requestedEndDate: ''
  };


  if (
    validation.status === 'PASS'
  ) {

    pricing =
      calculatePricing(
        mediaType,
        duration
      );


    requestedDates =
      calculateRequestedDates(
        startDate,
        duration
      );
  }


  const adminColumns =
    ensureAdminColumns(
      sheet
    );


  writeAdminData(

    sheet,

    lastRow,

    adminColumns,

    {

      bookingId:
        bookingId,

      media:
        media,

      validation:
        validation,

      pricing:
        pricing,

      requestedDates:
        requestedDates
    }
  );


  console.log(
    'Existing submission reprocessed: ' +
    bookingId
  );


  console.log(
    'Material Type: ' +
    mediaType
  );


  console.log(
    'Duration: ' +
    duration
  );


  console.log(
    'Base Charge: ' +
    pricing.baseCharge
  );


  console.log(
    'GST: ' +
    pricing.gst
  );


  console.log(
    'Total Payable: ' +
    pricing.totalPayable
  );


  console.log(
    'Requested Start: ' +
    requestedDates.requestedStartDate
  );


  console.log(
    'Requested End: ' +
    requestedDates.requestedEndDate
  );
}


/* ============================================================
   24. HEADER VALUE LOOKUP
   ============================================================ */

function getValueByHeaderContains(
  headers,
  values,
  searchText
) {

  const target =
    normaliseHeader(
      searchText
    );


  for (
    let i = 0;
    i < headers.length;
    i++
  ) {

    const current =
      normaliseHeader(
        headers[i]
      );


    if (
      current.includes(
        target
      )
    ) {

      return values[i];
    }
  }


  return '';
}


/* ============================================================
   25. FIND MEDIA URL
   ============================================================ */

function findMediaUrl(
  headers,
  values
) {

  /*
   * First search every response cell for
   * a Google Drive URL.
   */

  for (
    let i = 0;
    i < values.length;
    i++
  ) {

    const value =
      String(
        values[i] || ''
      ).trim();


    if (
      value.includes(
        'drive.google.com'
      )
    ) {

      return value;
    }
  }


  /*
   * Fallback to upload/media headers.
   */

  for (
    let i = 0;
    i < headers.length;
    i++
  ) {

    const header =
      normaliseHeader(
        headers[i]
      );


    if (
      header.includes(
        'upload'
      ) ||

      header.includes(
        'media'
      )
    ) {

      const value =
        String(
          values[i] || ''
        ).trim();


      if (value) {

        return value;
      }
    }
  }


  return '';
}

/* ============================================================
   B7 \u2014 EDB ADMIN DASHBOARD
   CLEAN REBUILD

   DESIGN PRINCIPLES
   ------------------------------------------------------------
   \u2022 Admin Quick Actions are permanently near the top.
   \u2022 Quick Actions are frozen with the dashboard header.
   \u2022 Recent Bookings and Current / Upcoming Displays grow below
     the Quick Actions area and never push it downward.
   \u2022 No onOpen trigger is used.
   \u2022 No SpreadsheetApp.getUi() is used from a trigger.
   \u2022 No B7 duplicate functions.
   \u2022 B2\u2013B6 processing remains untouched.
   ============================================================ */

const EDB_DASHBOARD_SHEET_NAME = 'EDB Dashboard';
const EDB_ADMIN_CONFIG_SHEET_NAME = 'IFFG EDB - Admin Configuration';

/* ============================================================
   B7.1 \u2014 RESPONSE SPREADSHEET HELPERS
   ============================================================ */

function getEDBResponseSheet(spreadsheetOverride) {

  /*
   * Trigger-safe resolver.
   * When a spreadsheet is supplied (e.source), never call
   * FormApp.getActiveForm().
   */

  if (spreadsheetOverride) {
    const sheets = spreadsheetOverride.getSheets();

    for (let i = 0; i < sheets.length; i++) {
      const sheet = sheets[i];
      const lastColumn = Math.max(sheet.getLastColumn(), 1);
      const headers = sheet
        .getRange(1, 1, 1, lastColumn)
        .getValues()[0];

      const isResponseSheet = headers.some(
        header =>
          normaliseHeader(header) === 'timestamp'
      );

      if (isResponseSheet) {
        return sheet;
      }
    }

    throw new Error(
      'B7: Could not identify the Google Forms response sheet by its Timestamp column.'
    );
  }

  return getResponseSheet();
}


function getEDBSpreadsheet(spreadsheetOverride) {

  if (spreadsheetOverride) {
    return spreadsheetOverride;
  }

  return getEDBResponseSheet().getParent();
}


/* ============================================================
   B7.1A \u2014 COMMON BOOKING DATA ACCESS
   ============================================================ */

function getB7BookingDataContext(spreadsheetOverride) {

  const spreadsheet =
    spreadsheetOverride ||
    getEDBSpreadsheet();

  if (!spreadsheet) {
    throw new Error(
      'B7: Unable to access the EDB spreadsheet.'
    );
  }

  const responseSheet =
    getEDBResponseSheet(spreadsheet);

  const lastColumn =
    Math.max(
      responseSheet.getLastColumn(),
      1
    );

  const headers =
    responseSheet
      .getRange(
        1,
        1,
        1,
        lastColumn
      )
      .getValues()[0];

  return {
    spreadsheet: spreadsheet,
    responseSheet: responseSheet,
    headers: headers
  };
}


/* ============================================================
   B7.2 \u2014 HEADER / VALUE HELPERS
   ============================================================ */

function getEDBHeaderMap(sheet) {

  const lastColumn = Math.max(
    sheet.getLastColumn(),
    1
  );

  const values = sheet
    .getRange(1, 1, 1, lastColumn)
    .getValues()[0];

  const map = {};

  values.forEach((header, index) => {

    const key = normaliseEDBHeader(header);

    if (key) {
      map[key] = index;
    }
  });

  return map;
}


function normaliseEDBHeader(value) {

  return String(value || '')
    .toLowerCase()
    .replace(/^\s*\d+\.\s*/, '')
    .replace(/\s+/g, ' ')
    .trim();
}


function getEDBValue(row, headerMap, names) {

  const candidates = Array.isArray(names)
    ? names
    : [names];

  for (let i = 0; i < candidates.length; i++) {

    const target = normaliseEDBHeader(candidates[i]);

    if (
      Object.prototype.hasOwnProperty.call(
        headerMap,
        target
      )
    ) {
      return row[headerMap[target]];
    }
  }

  const headerKeys = Object.keys(headerMap);

  for (let i = 0; i < candidates.length; i++) {

    const target = normaliseEDBHeader(candidates[i]);

    for (let j = 0; j < headerKeys.length; j++) {

      const actual = headerKeys[j];

      if (
        actual === target ||
        actual.includes(target)
      ) {
        return row[headerMap[actual]];
      }
    }
  }

  return '';
}


function normaliseEDBStatus(value) {

  return String(value || '')
    .trim()
    .toLowerCase();
}


function getEDBBookingRows(sheet) {

  const lastRow = sheet.getLastRow();
  const lastColumn = Math.max(sheet.getLastColumn(), 1);

  if (lastRow < 2) {
    return {
      headers: getEDBHeaderMap(sheet),
      rows: []
    };
  }

  const headerMap = getEDBHeaderMap(sheet);

  const rows = sheet
    .getRange(
      2,
      1,
      lastRow - 1,
      lastColumn
    )
    .getValues()
    .filter(row => {
      const bookingId = getEDBValue(
        row,
        headerMap,
        ['Booking ID', 'Booking ID.']
      );

      return String(bookingId || '').trim() !== '';
    });

  return {
    headers: headerMap,
    rows: rows
  };
}


/* ============================================================
   B7.3 \u2014 DASHBOARD DATA HELPERS
   ============================================================ */

function getEDBDisplayDate(row, headerMap, primaryNames, fallbackNames) {

  const primary = getEDBValue(
    row,
    headerMap,
    primaryNames
  );

  if (primary !== '' && primary !== null && primary !== undefined) {
    return primary;
  }

  return getEDBValue(
    row,
    headerMap,
    fallbackNames
  );
}


function getEDBRecentRows(rows, headerMap) {

  const recent = rows.slice();

  recent.reverse();

  return recent.slice(0, 10);
}


/* ============================================================
   B7.3A - AUTOMATIC DISPLAY LIFECYCLE
   ------------------------------------------------------------
   For paid + approved bookings, Start and End dates are
   authoritative for live display state.

   Priority:
     Confirmed Start/End
     Final Start/End
     Requested Start/End (fallback only)

   Date rule:
     today < start         -> scheduled
     start <= today <= end -> currently displaying
     today > end           -> display period over

   Rejected / Archived bookings never qualify for display.
   No Form Responses 1 values are changed by this helper.
   ============================================================ */

function getEDBAutomaticDisplayState(
  row,
  headerMap,
  nowOverride
) {

  const approval = normaliseEDBStatus(
    getEDBValue(
      row,
      headerMap,
      'Approval Status'
    )
  );

  const payment = normaliseEDBStatus(
    getEDBValue(
      row,
      headerMap,
      'Payment Status'
    )
  );

  const storedDisplay = normaliseEDBStatus(
    getEDBValue(
      row,
      headerMap,
      'Display Status'
    )
  );

  if (
    approval === 'rejected' ||
    storedDisplay === 'rejected' ||
    storedDisplay === 'archived'
  ) {
    return 'rejected';
  }

  if (
    payment !== 'paid' ||
    approval !== 'approved'
  ) {
    return storedDisplay || 'pending';
  }

  const startRaw = getEDBLifecycleDateFallback_(
    row,
    headerMap,
    [
      'Confirmed Start Date',
      'Final Start Date',
      'Requested Start Date'
    ]
  );

  const endRaw = getEDBLifecycleDateFallback_(
    row,
    headerMap,
    [
      'Confirmed End Date',
      'Final End Date',
      'Requested End Date'
    ]
  );

  const start = getEDBDateOnly_V5_(startRaw);
  const end = getEDBDateOnly_V5_(endRaw);

  if (!start || !end) {
    return storedDisplay || 'scheduled';
  }

  const now = getEDBDateOnly_V5_(
    nowOverride || new Date()
  );

  if (!now) {
    return storedDisplay || 'scheduled';
  }

  if (now < start) {
    return 'scheduled';
  }

  if (now > end) {
    return 'display period over';
  }

  return 'currently displaying';
}


function getEDBLifecycleDateFallback_(
  row,
  headerMap,
  names
) {

  const candidates = Array.isArray(names)
    ? names
    : [names];

  for (
    let i = 0;
    i < candidates.length;
    i++
  ) {

    const target =
      normaliseEDBHeader(
        candidates[i]
      );

    if (
      Object.prototype.hasOwnProperty.call(
        headerMap,
        target
      )
    ) {

      const value =
        row[
          headerMap[target]
        ];

      if (
        value !== '' &&
        value !== null &&
        value !== undefined
      ) {
        return value;
      }
    }
  }

  const headerKeys =
    Object.keys(headerMap);

  for (
    let i = 0;
    i < candidates.length;
    i++
  ) {

    const target =
      normaliseEDBHeader(
        candidates[i]
      );

    for (
      let j = 0;
      j < headerKeys.length;
      j++
    ) {

      const actual =
        headerKeys[j];

      if (
        actual === target ||
        actual.includes(target)
      ) {

        const value =
          row[
            headerMap[actual]
          ];

        if (
          value !== '' &&
          value !== null &&
          value !== undefined
        ) {
          return value;
        }
      }
    }
  }

  return '';
}


function getEDBDateOnly_V5_(value) {

  if (
    value === '' ||
    value === null ||
    value === undefined
  ) {
    return null;
  }

  let date;

  if (
    Object.prototype.toString.call(value) ===
    '[object Date]'
  ) {
    date = new Date(value.getTime());
  } else {
    date = new Date(value);
  }

  if (isNaN(date.getTime())) {
    return null;
  }

  date.setHours(0, 0, 0, 0);

  return date;
}


function getEDBCurrentUpcomingRows(rows, headerMap) {

  return rows.filter(row => {

    const state =
      getEDBAutomaticDisplayState(
        row,
        headerMap
      );

    return (
      state === 'scheduled' ||
      state === 'currently displaying'
    );
  });
}


function getEDBSummaryCounts(rows, headerMap) {

  const counts = {
    pendingReview: 0,
    awaitingPayment: 0,
    scheduled: 0,
    displaying: 0,
    completed: 0,
    rejected: 0
  };

  rows.forEach(row => {

    const payment = normaliseEDBStatus(
      getEDBValue(
        row,
        headerMap,
        'Payment Status'
      )
    );

    const approval = normaliseEDBStatus(
      getEDBValue(
        row,
        headerMap,
        'Approval Status'
      )
    );

    const display =
      getEDBAutomaticDisplayState(
        row,
        headerMap
      );

    if (approval === 'pending') {
      counts.pendingReview++;
    }

    if (payment === 'pending') {
      counts.awaitingPayment++;
    }

    if (display === 'scheduled') {
      counts.scheduled++;
    }

    if (display === 'currently displaying') {
      counts.displaying++;
    }

    if (display === 'completed') {
      counts.completed++;
    }

    if (
      approval === 'rejected' ||
      display === 'rejected'
    ) {
      counts.rejected++;
    }
  });

  return counts;
}


/* ============================================================
   B7.4 \u2014 MAIN DASHBOARD BUILDER
   ============================================================ */

function createEDBDashboard(spreadsheetOverride) {

  const spreadsheet = getEDBSpreadsheet(spreadsheetOverride);
  const responseSheet = getEDBResponseSheet(spreadsheet);

  let dashboard = spreadsheet.getSheetByName(
    EDB_DASHBOARD_SHEET_NAME
  );

  if (!dashboard) {
    dashboard = spreadsheet.insertSheet(
      EDB_DASHBOARD_SHEET_NAME
    );
  }

  /*
   * The dashboard is rebuilt from scratch on refresh.
   * Break all previous merges first; clear() alone does not
   * remove merged-cell structure.
   */

  dashboard
    .getRange(
      1,
      1,
      dashboard.getMaxRows(),
      dashboard.getMaxColumns()
    )
    .breakApart();

  dashboard.clear();
  dashboard.clearFormats();

  const dataset = getEDBBookingRows(responseSheet);
  const headerMap = dataset.headers;
  const rows = dataset.rows;

  const counts = getEDBSummaryCounts(
    rows,
    headerMap
  );

  /* ==========================================================
     FIXED TOP AREA
     ========================================================== */

  const TITLE_ROW = 1;
  const SUBTITLE_ROW = 2;
  const SUMMARY_TITLE_ROW = 3;
  const SUMMARY_LABEL_ROW = 4;
  const SUMMARY_VALUE_ROW = 5;
  const SUMMARY_SECOND_LABEL_ROW = 6;
  const SUMMARY_SECOND_VALUE_ROW = 7;

  const QUICK_TITLE_ROW = 8;
  const QUICK_ACTION_ROW = 9;

  const RECENT_TITLE_ROW = 10;
  const RECENT_HEADER_ROW = 11;
  const RECENT_DATA_START_ROW = 12;

  /* ==========================================================
     TITLE
     ========================================================== */

  dashboard
    .getRange(TITLE_ROW, 1, 1, 8)
    .merge();

  dashboard
    .getRange(TITLE_ROW, 1)
    .setValue('IFFG ELECTRONIC DISPLAY BOARD')
    .setFontSize(18)
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setBackground('#1F4E78')
    .setFontColor('#FFFFFF');

  dashboard.setRowHeight(TITLE_ROW, 36);


  /* ==========================================================
     SUBTITLE
     ========================================================== */

  dashboard
    .getRange(SUBTITLE_ROW, 1, 1, 8)
    .merge();

  dashboard
    .getRange(SUBTITLE_ROW, 1)
    .setValue(
      'ADMIN DASHBOARD \u2022 BOOKING & DISPLAY MANAGEMENT'
    )
    .setFontSize(9)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setFontColor('#666666');

  dashboard.setRowHeight(SUBTITLE_ROW, 20);


  /* ==========================================================
     BOOKING SUMMARY
     ========================================================== */

  dashboard
    .getRange(SUMMARY_TITLE_ROW, 1, 1, 8)
    .merge();

  dashboard
    .getRange(SUMMARY_TITLE_ROW, 1)
    .setValue('BOOKING SUMMARY')
    .setFontSize(10)
    .setFontWeight('bold')
    .setHorizontalAlignment('left');

  const summaryCards = [
    {
      label: 'PENDING REVIEW',
      value: counts.pendingReview,
      labelRange: 'A5:B5',
      valueRange: 'A6:B6',
      background: '#FFF2CC'
    },
    {
      label: 'AWAITING PAYMENT',
      value: counts.awaitingPayment,
      labelRange: 'C5:D5',
      valueRange: 'C6:D6',
      background: '#FCE4D6'
    },
    {
      label: 'SCHEDULED',
      value: counts.scheduled,
      labelRange: 'E5:F5',
      valueRange: 'E6:F6',
      background: '#E2F0D9'
    },
    {
      label: 'CURRENTLY DISPLAYING',
      value: counts.displaying,
      labelRange: 'G5:H5',
      valueRange: 'G6:H6',
      background: '#DDEBF7'
    },
    {
      label: 'COMPLETED',
      value: counts.completed,
      labelRange: 'A7:D7',
      valueRange: 'A8:D8',
      background: '#E7E6E6'
    },
    {
      label: 'REJECTED',
      value: counts.rejected,
      labelRange: 'E7:H7',
      valueRange: 'E8:H8',
      background: '#F4CCCC'
    }
  ];

  summaryCards.forEach(card => {

    dashboard
      .getRange(card.labelRange)
      .merge()
      .setValue(card.label)
      .setFontWeight('bold')
      .setFontSize(9)
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle')
      .setBackground(card.background)
      .setBorder(true, true, true, true, true, true);

    dashboard
      .getRange(card.valueRange)
      .merge()
      .setValue(card.value)
      .setFontWeight('bold')
      .setFontSize(16)
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle')
      .setBackground(card.background)
      .setBorder(true, true, true, true, true, true);
  });

  dashboard.setRowHeight(SUMMARY_LABEL_ROW, 22);
  dashboard.setRowHeight(SUMMARY_VALUE_ROW, 28);
  dashboard.setRowHeight(SUMMARY_SECOND_LABEL_ROW, 22);
  dashboard.setRowHeight(SUMMARY_SECOND_VALUE_ROW, 28);


  /* ==========================================================
     ADMIN QUICK ACTIONS \u2014 FIXED POSITION
     ==========================================================

     IMPORTANT:
     This block is intentionally BEFORE the data tables.
     Therefore the number of bookings can never push it down.

     The three navigation actions are real sheet hyperlinks.
     Refresh remains an Apps Script function because Google Sheets
     cells cannot directly execute an Apps Script function without
     an edit trigger or drawing/button.
     ========================================================== */

  dashboard
    .getRange(QUICK_TITLE_ROW, 1, 1, 8)
    .merge()
    .setValue('ADMIN QUICK ACTIONS')
    .setFontSize(10)
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setBackground('#D9EAF7')
    .setBorder(true, true, true, true, true, true);

  dashboard.setRowHeight(QUICK_TITLE_ROW, 22);

  const actionRanges = [
    'A11:B11',
    'C11:D11',
    'E11:F11',
    'G11:H11'
  ];

  actionRanges.forEach(range => {
    dashboard.getRange(range).merge();
  });

  const actionValues = [
    '\u1F504  REFRESH DASHBOARD',
    '\u1F4CB  FORM RESPONSES',
    '\u2699  ADMIN CONFIGURATION',
    '\u1F5A5  EDB DASHBOARD'
  ];

  const actionBackgrounds = [
    '#D9EAF7',
    '#E8F0FE',
    '#FFF2CC',
    '#E2F0D9'
  ];

  for (let i = 0; i < actionRanges.length; i++) {

    dashboard
      .getRange(actionRanges[i])
      .setValue(actionValues[i])
      .setFontWeight('bold')
      .setFontSize(9)
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle')
      .setWrap(true)
      .setBackground(actionBackgrounds[i])
      .setBorder(true, true, true, true, true, true);
  }

  dashboard.setRowHeight(QUICK_ACTION_ROW, 28);

  /* ----------------------------------------------------------
     Create real navigation hyperlinks.
     ---------------------------------------------------------- */

  setEDBSheetLink(
    dashboard.getRange('C11'),
    '\u1F4CB  FORM RESPONSES',
    spreadsheet,
    responseSheet
  );

  let adminSheet = spreadsheet.getSheetByName(
    EDB_ADMIN_CONFIG_SHEET_NAME
  );

  if (!adminSheet) {
    adminSheet = spreadsheet.insertSheet(
      EDB_ADMIN_CONFIG_SHEET_NAME
    );
  }

  setEDBSheetLink(
    dashboard.getRange('E11'),
    '\u2699  ADMIN CONFIGURATION',
    spreadsheet,
    adminSheet
  );

  setEDBSheetLink(
    dashboard.getRange('G11'),
    '\u1F5A5  EDB DASHBOARD',
    spreadsheet,
    dashboard
  );


  /* ==========================================================
     RECENT BOOKINGS
     ========================================================== */

  dashboard
    .getRange(RECENT_TITLE_ROW, 1, 1, 8)
    .merge()
    .setValue('RECENT BOOKINGS')
    .setFontSize(10)
    .setFontWeight('bold')
    .setHorizontalAlignment('left');

  const recentHeaders = [
    'Booking ID',
    'Flat No.',
    'Resident',
    'Material',
    'Duration',
    'Amount',
    'Payment',
    'Display Status'
  ];

  dashboard
    .getRange(RECENT_HEADER_ROW, 1, 1, 8)
    .setValues([recentHeaders])
    .setFontWeight('bold')
    .setFontSize(9)
    .setBackground('#D9EAF7')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setBorder(true, true, true, true, true, true);

  const recentRows = getEDBRecentRows(
    rows,
    headerMap
  );

  if (recentRows.length > 0) {

    const recentOutput = recentRows.map(row => [
      getEDBValue(row, headerMap, 'Booking ID'),
      getEDBValue(row, headerMap, ['Flat No.', 'Flat No']),
      getEDBValue(row, headerMap, 'Resident Name'),
      getEDBValue(row, headerMap, ['Material Type', 'What Type of Material']),
      getEDBValue(row, headerMap, 'Duration'),
      getEDBValue(row, headerMap, 'Total Payable'),
      getEDBValue(row, headerMap, 'Payment Status'),
      getEDBAutomaticDisplayState(row, headerMap)
    ]);

    dashboard
      .getRange(
        RECENT_DATA_START_ROW,
        1,
        recentOutput.length,
        8
      )
      .setValues(recentOutput)
      .setFontSize(9)
      .setVerticalAlignment('middle')
      .setWrap(true)
      .setBorder(true, true, true, true, true, true);

    dashboard
      .getRange(
        RECENT_DATA_START_ROW,
        6,
        recentOutput.length,
        1
      )
      .setNumberFormat('\u20B9#,##0.00');

    applyEDBRecentStatusFormatting(
      dashboard,
      RECENT_DATA_START_ROW,
      recentOutput.length
    );
  }


  /* ==========================================================
     CURRENT / UPCOMING DISPLAYS
     ========================================================== */

  const displayTitleRow =
    RECENT_DATA_START_ROW + Math.max(recentRows.length, 1) + 1;

  dashboard
    .getRange(displayTitleRow, 1, 1, 8)
    .merge()
    .setValue('CURRENT / UPCOMING DISPLAYS')
    .setFontSize(10)
    .setFontWeight('bold')
    .setHorizontalAlignment('left');

  const displayHeaderRow = displayTitleRow + 1;
  const displayDataStartRow = displayTitleRow + 2;

  const displayHeaders = [
    'Booking ID',
    'Flat No.',
    'Resident',
    'Material',
    'Start',
    'End',
    'Display Status',
    'Amount'
  ];

  dashboard
    .getRange(displayHeaderRow, 1, 1, 8)
    .setValues([displayHeaders])
    .setFontWeight('bold')
    .setFontSize(9)
    .setBackground('#D9EAF7')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setBorder(true, true, true, true, true, true);

  const displayRows = getEDBCurrentUpcomingRows(
    rows,
    headerMap
  );

  if (displayRows.length > 0) {

    const displayOutput = displayRows.map(row => [
      getEDBValue(row, headerMap, 'Booking ID'),
      getEDBValue(row, headerMap, ['Flat No.', 'Flat No']),
      getEDBValue(row, headerMap, 'Resident Name'),
      getEDBValue(row, headerMap, ['Material Type', 'What Type of Material']),
      getEDBDisplayDate(
        row,
        headerMap,
        ['Confirmed Start Date', 'Final Start Date'],
        'Requested Start Date'
      ),
      getEDBDisplayDate(
        row,
        headerMap,
        ['Confirmed End Date', 'Final End Date'],
        'Requested End Date'
      ),
      getEDBAutomaticDisplayState(row, headerMap),
      getEDBValue(row, headerMap, 'Total Payable')
    ]);

    dashboard
      .getRange(
        displayDataStartRow,
        1,
        displayOutput.length,
        8
      )
      .setValues(displayOutput)
      .setFontSize(9)
      .setWrap(true)
      .setVerticalAlignment('middle')
      .setBorder(true, true, true, true, true, true);

    dashboard
      .getRange(
        displayDataStartRow,
        5,
        displayOutput.length,
        2
      )
      .setNumberFormat('dd-mmm-yyyy');

    dashboard
      .getRange(
        displayDataStartRow,
        8,
        displayOutput.length,
        1
      )
      .setNumberFormat('\u20B9#,##0.00');

    applyEDBDisplayStatusFormatting(
      dashboard,
      displayDataStartRow,
      displayOutput.length
    );
  }


  /* ==========================================================
     FOOTER
     ========================================================== */

  const footerRow = displayDataStartRow +
    Math.max(displayRows.length, 1) +
    2;

  dashboard
    .getRange(footerRow, 1, 1, 8)
    .merge()
    .setValue(
      'Last refreshed: ' +
      Utilities.formatDate(
        new Date(),
        Session.getScriptTimeZone(),
        'dd-MMM-yyyy HH:mm'
      )
    )
    .setHorizontalAlignment('right')
    .setFontSize(9)
    .setFontColor('#777777');


  /* ==========================================================
     GLOBAL FORMATTING
     ========================================================== */

  const widths = [
    155,
    90,
    170,
    105,
    110,
    110,
    145,
    125
  ];

  widths.forEach((width, index) => {
    dashboard.setColumnWidth(
      index + 1,
      width
    );
  });

  dashboard
    .getRange(1, 1, footerRow, 8)
    .setVerticalAlignment('middle');

  dashboard.setRowHeight(
    RECENT_TITLE_ROW,
    26
  );

  dashboard.setRowHeight(
    displayTitleRow,
    22
  );

  /*
   * Freeze only the compact control area.
   * This keeps Quick Actions visible without consuming unnecessary
   * screen space.
   */

  dashboard.setFrozenRows(
    QUICK_ACTION_ROW
  );

  dashboard.setFrozenColumns(0);

  /*
   * Keep the dashboard visually clean when the sheet is opened.
   */

  spreadsheet.setActiveSheet(dashboard);

  console.log(
    'B7: EDB Dashboard rebuilt successfully. Quick Actions remain fixed at the top.'
  );
}


/* ============================================================
   B7.5 — REFRESH FUNCTION
   ============================================================ */

function refreshEDBDashboard(
  spreadsheetOverride,
  selectedBookingId
) {

  const spreadsheet =
    spreadsheetOverride ||
    getEDBSpreadsheet();

  if (!spreadsheet) {

    throw new Error(
      'B7: Unable to access the EDB spreadsheet.'
    );

  }


  /*
   * ----------------------------------------------------------
   * REMEMBER CURRENT SELECTION
   * ----------------------------------------------------------
   *
   * K3 may contain a Booking ID from an earlier dashboard
   * state. That ID is only restored if it still exists in
   * the freshly rebuilt Booking ID list.
   *
   * This prevents a deleted/obsolete Booking ID from being
   * written back into K3 after the data-validation rule has
   * been rebuilt.
   */

  const existingDashboard =
    spreadsheet.getSheetByName(
      EDB_DASHBOARD_SHEET_NAME
    );


  const requestedBookingId =
    String(
      selectedBookingId ||
      (
        existingDashboard
          ? existingDashboard
              .getRange('K3')
              .getValue()
          : ''
      ) ||
      ''
    ).trim();


  /*
   * ----------------------------------------------------------
   * REBUILD MAIN DASHBOARD
   * ----------------------------------------------------------
   */

  createEDBDashboard(
    spreadsheet
  );


  /*
   * ----------------------------------------------------------
   * REBUILD BOOKING SELECTOR
   * ----------------------------------------------------------
   *
   * This rebuilds _EDB_B7D1_Lists from the CURRENT response
   * spreadsheet data and recreates K3 data validation.
   */

  setupB7D1BookingControl(
    spreadsheet
  );


  /*
   * ----------------------------------------------------------
   * REBUILD ADMIN ACTION PANEL
   * ----------------------------------------------------------
   */

  setupB7D2BookingActions(
    spreadsheet
  );


  const dashboard =
    spreadsheet.getSheetByName(
      EDB_DASHBOARD_SHEET_NAME
    );


  /*
   * ----------------------------------------------------------
   * VALIDATE OLD SELECTION BEFORE RESTORING IT
   * ----------------------------------------------------------
   *
   * IMPORTANT:
   * Never write requestedBookingId directly into K3.
   *
   * The Booking ID must first be confirmed to exist in the
   * freshly rebuilt _EDB_B7D1_Lists sheet.
   */

  let validBookingId = '';


  if (requestedBookingId) {

    const listSheet =
      spreadsheet.getSheetByName(
        B7_D1_CONFIG.LIST_SHEET
      );


    if (listSheet) {

      const lastRow =
        listSheet.getLastRow();


      if (lastRow >= 2) {

        const validIds =
          listSheet
            .getRange(
              2,
              1,
              lastRow - 1,
              1
            )
            .getValues()
            .map(
              row =>
                String(
                  row[0] || ''
                ).trim()
            )
            .filter(
              id => id !== ''
            );


        if (
          validIds.indexOf(
            requestedBookingId
          ) !== -1
        ) {

          validBookingId =
            requestedBookingId;

        }

      }

    }

  }


  /*
   * ----------------------------------------------------------
   * RESTORE SELECTION ONLY IF STILL VALID
   * ----------------------------------------------------------
   */

  if (validBookingId) {

    dashboard
      .getRange(
        B7_D1_CONFIG.SELECTOR_CELL
      )
      .setValue(
        validBookingId
      );


    refreshB7SelectionPanels(
      spreadsheet,
      validBookingId
    );

  } else {

    /*
     * No valid previous selection exists.
     *
     * Leave K3 blank and ensure the detail/action panels
     * are also blank.
     */

    dashboard
      .getRange(
        B7_D1_CONFIG.SELECTOR_CELL
      )
      .clearContent();


    refreshB7SelectionPanels(
      spreadsheet,
      ''
    );

  }


  console.log(
    'B7: Dashboard refreshed with spreadsheet context preserved.'
  );

}


/* ============================================================
   B7.6 \u2014 ONE-TIME SETUP
   ============================================================

   Run this manually once after installing the new Displayboard.gs.
   It creates/rebuilds the dashboard and the fixed Quick Actions
   area. No trigger is created.
   ============================================================ */

function setupEDBDashboard() {

  createEDBDashboard();

  console.log(
    'B7: Initial dashboard setup completed.'
  );
}


/* ============================================================
   B7.7 \u2014 OPEN RESPONSE SHEET
   ============================================================ */

function openEDBResponseSheet() {

  const spreadsheet = getEDBSpreadsheet();
  const responseSheet = getEDBResponseSheet();

  spreadsheet.setActiveSheet(
    responseSheet
  );
}


/* ============================================================
   B7.8 \u2014 OPEN ADMIN CONFIGURATION
   ============================================================ */

function openEDBAdminConfiguration() {

  const spreadsheet = getEDBSpreadsheet();

  let sheet = spreadsheet.getSheetByName(
    EDB_ADMIN_CONFIG_SHEET_NAME
  );

  if (!sheet) {
    sheet = spreadsheet.insertSheet(
      EDB_ADMIN_CONFIG_SHEET_NAME
    );
  }

  spreadsheet.setActiveSheet(sheet);
}


/* ============================================================
   B7.9 \u2014 OPEN EDB DASHBOARD
   ============================================================ */

function openEDBDashboard() {

  const spreadsheet = getEDBSpreadsheet();

  let dashboard = spreadsheet.getSheetByName(
    EDB_DASHBOARD_SHEET_NAME
  );

  if (!dashboard) {
    createEDBDashboard();
    dashboard = spreadsheet.getSheetByName(
      EDB_DASHBOARD_SHEET_NAME
    );
  }

  spreadsheet.setActiveSheet(dashboard);
}


/* ============================================================
   B7.10 \u2014 SHEET NAVIGATION LINK
   ============================================================ */

function setEDBSheetLink(
  cell,
  text,
  spreadsheet,
  targetSheet
) {

  const url =
    spreadsheet.getUrl() +
    '#gid=' +
    targetSheet.getSheetId();

  const richText =
    SpreadsheetApp
      .newRichTextValue()
      .setText(text)
      .setLinkUrl(url)
      .build();

  cell.setRichTextValue(richText);
}


/* ============================================================
   B7.11 \u2014 RECENT BOOKING STATUS FORMATTING
   ============================================================ */

function applyEDBRecentStatusFormatting(
  dashboard,
  startRow,
  rowCount
) {

  for (let i = 0; i < rowCount; i++) {

    const row = startRow + i;

    const payment = normaliseEDBStatus(
      dashboard
        .getRange(row, 7)
        .getValue()
    );

    const display = normaliseEDBStatus(
      dashboard
        .getRange(row, 8)
        .getValue()
    );

    if (payment === 'paid') {
      dashboard
        .getRange(row, 7)
        .setBackground('#E2F0D9')
        .setFontWeight('bold');
    }

    if (payment === 'pending') {
      dashboard
        .getRange(row, 7)
        .setBackground('#FFF2CC');
    }

    if (display === 'scheduled') {
      dashboard
        .getRange(row, 8)
        .setBackground('#E2F0D9')
        .setFontWeight('bold');
    }

    if (display === 'currently displaying') {
      dashboard
        .getRange(row, 8)
        .setBackground('#DDEBF7')
        .setFontWeight('bold');
    }

    if (display === 'completed') {
      dashboard
        .getRange(row, 8)
        .setBackground('#E7E6E6');
    }

    if (display === 'rejected') {
      dashboard
        .getRange(row, 8)
        .setBackground('#F4CCCC')
        .setFontWeight('bold');
    }
  }
}


/* ============================================================
   B7.12 \u2014 CURRENT / UPCOMING STATUS FORMATTING
   ============================================================ */

function applyEDBDisplayStatusFormatting(
  dashboard,
  startRow,
  rowCount
) {

  for (let i = 0; i < rowCount; i++) {

    const row = startRow + i;

    const status = normaliseEDBStatus(
      dashboard
        .getRange(row, 7)
        .getValue()
    );

    if (status === 'scheduled') {
      dashboard
        .getRange(row, 7)
        .setBackground('#E2F0D9')
        .setFontWeight('bold');
    }

    if (status === 'currently displaying') {
      dashboard
        .getRange(row, 7)
        .setBackground('#DDEBF7')
        .setFontWeight('bold');
    }
  }
}


/* ============================================================
   END OF B7
   ============================================================ */

/* ============================================================
   B7-D1
   BOOKING CONTROL PANEL
   ============================================================

   PURPOSE
   -------
   Provides a compact administrative booking lookup panel
   to the right of the main EDB Dashboard.

   DESIGN
   ------
   - Main dashboard remains in columns A:H.
   - Booking Control Panel uses columns J:N.
   - No dashboard rows are added.
   - No existing dashboard data is displaced.
   - No additional frozen rows are required.
   - Booking ID is selected from a dropdown.
   - Selecting a Booking ID displays its complete details.

   B7-D1 IS READ-ONLY.

   It does NOT:
   - approve bookings
   - reject bookings
   - change payment status
   - change dates
   - change display status
   ============================================================ */


/* ============================================================
   B7-D1 CONFIGURATION
   ============================================================ */

const B7_D1_CONFIG = {

  DASHBOARD_SHEET:
    'EDB Dashboard',

  LIST_SHEET:
    '_EDB_B7D1_Lists',

  SELECTOR_CELL:
    'K3',

  PANEL_START_COLUMN:
    10,

  PANEL_WIDTH:
    5,

  DETAIL_START_ROW:
    7,

  DETAIL_START_COL:
    10,

  DETAIL_ROW_COUNT:
    14,

  DETAIL_COL_COUNT:
    5

};


/* ============================================================
   B7-D1.1
   SETUP BOOKING CONTROL PANEL
   ============================================================ */

function setupB7D1BookingControl(spreadsheetOverride) {

  /*
   * Use the already-established B7 spreadsheet resolver.
   *
   * IMPORTANT:
   * Do NOT use getB7Spreadsheet().
   */

  const spreadsheet =
    getEDBSpreadsheet(spreadsheetOverride);


  if (!spreadsheet) {

    throw new Error(
      'B7-D1: Unable to access the EDB spreadsheet.'
    );

  }


  const dashboard =
    spreadsheet.getSheetByName(
      B7_D1_CONFIG.DASHBOARD_SHEET
    );


  if (!dashboard) {

    throw new Error(
      'B7-D1: EDB Dashboard sheet not found.'
    );

  }


  /* ==========================================================
     CREATE / GET HIDDEN BOOKING LIST SHEET
     ========================================================== */

  let listSheet =
    spreadsheet.getSheetByName(
      B7_D1_CONFIG.LIST_SHEET
    );


  if (!listSheet) {

    listSheet =
      spreadsheet.insertSheet(
        B7_D1_CONFIG.LIST_SHEET
      );

  }


  /* ==========================================================
     READ RESPONSE SHEET
     ========================================================== */

  const responseSheet =
    getEDBResponseSheet(spreadsheet);


  const lastColumn =
    Math.max(
      responseSheet.getLastColumn(),
      1
    );


  const headers =
    responseSheet
      .getRange(
        1,
        1,
        1,
        lastColumn
      )
      .getValues()[0];


  const bookingColumn =
    findB7D1Column(
      headers,
      'Booking ID'
    );


  if (!bookingColumn) {

    throw new Error(
      'B7-D1: Booking ID column not found.'
    );

  }


  /* ==========================================================
     BUILD BOOKING ID LIST
     ========================================================== */

  listSheet.clearContents();


  listSheet
    .getRange('A1')
    .setValue(
      'Booking ID'
    );


  const lastRow =
    responseSheet.getLastRow();


  const bookingIds = [];


  if (
    lastRow >= 2
  ) {

    const values =
      responseSheet
        .getRange(
          2,
          bookingColumn,
          lastRow - 1,
          1
        )
        .getValues();


    values.forEach(
      row => {

        const bookingId =
          String(
            row[0] || ''
          ).trim();


        if (
          bookingId
        ) {

          bookingIds.push([
            bookingId
          ]);

        }

      }
    );

  }


  if (
    bookingIds.length > 0
  ) {

    listSheet
      .getRange(
        2,
        1,
        bookingIds.length,
        1
      )
      .setValues(
        bookingIds
      );

  }


  /*
   * Hide helper sheet.
   */

  if (
    !listSheet.isSheetHidden()
  ) {

    listSheet.hideSheet();

  }


  /* ==========================================================
     CLEAR ONLY B7-D1 PANEL
     ========================================================== */

  dashboard
    .getRange(
      'J1:N30'
    )
    .breakApart();


  dashboard
    .getRange(
      'J1:N30'
    )
    .clearContent();


  dashboard
    .getRange(
      'J1:N30'
    )
    .clearFormat();


  /* ==========================================================
     PANEL TITLE
     ========================================================== */

  dashboard
    .getRange(
      'J1:N1'
    )
    .merge();


  dashboard
    .getRange(
      'J1'
    )
    .setValue(
      'BOOKING CONTROL'
    )
    .setFontSize(
      12
    )
    .setFontWeight(
      'bold'
    )
    .setHorizontalAlignment(
      'center'
    )
    .setVerticalAlignment(
      'middle'
    )
    .setBackground(
      '#1F4E78'
    )
    .setFontColor(
      '#FFFFFF'
    );


  dashboard
    .setRowHeight(
      1,
      28
    );


  /* ==========================================================
     BOOKING ID SELECTOR
     ========================================================== */

  dashboard
    .getRange(
      'J3'
    )
    .setValue(
      'Booking ID'
    )
    .setFontWeight(
      'bold'
    )
    .setFontSize(
      9
    );


  dashboard
    .getRange(
      'K3:N3'
    )
    .merge();


  dashboard
    .getRange(
      'K3'
    )
    .setValue(
      ''
    );


  /*
   * Dropdown.
   *
   * If there are bookings, use the actual list range.
   */

  if (
    bookingIds.length > 0
  ) {

    const validation =
      SpreadsheetApp
        .newDataValidation()
        .requireValueInRange(
          listSheet.getRange(
            2,
            1,
            bookingIds.length,
            1
          ),
          true
        )
        .setAllowInvalid(
          false
        )
        .build();


    dashboard
      .getRange(
        'K3'
      )
      .setDataValidation(
        validation
      );

  }


  dashboard
    .getRange(
      'K3:N3'
    )
    .setBackground(
      '#FFF2CC'
    )
    .setFontWeight(
      'bold'
    )
    .setHorizontalAlignment(
      'center'
    );


  dashboard
    .getRange(
      'J3:N3'
    )
    .setBorder(
      true,
      true,
      true,
      true,
      true,
      true
    );


  /* ==========================================================
     DETAILS HEADER
     ========================================================== */

  dashboard
    .getRange(
      'J5:N5'
    )
    .merge();


  dashboard
    .getRange(
      'J5'
    )
    .setValue(
      'BOOKING DETAILS'
    )
    .setFontWeight(
      'bold'
    )
    .setFontSize(
      10
    )
    .setHorizontalAlignment(
      'center'
    )
    .setBackground(
      '#D9EAF7'
    );


  /* ==========================================================
     EMPTY DETAIL MESSAGE
     ========================================================== */

  dashboard
    .getRange(
      'J7:N7'
    )
    .merge();


  dashboard
    .getRange(
      'J7'
    )
    .setValue(
      'Select a Booking ID above.'
    )
    .setFontSize(
      9
    )
    .setFontStyle(
      'italic'
    )
    .setFontColor(
      '#666666'
    )
    .setHorizontalAlignment(
      'center'
    );


  /* ==========================================================
     PANEL WIDTHS
     ========================================================== */

  dashboard
    .setColumnWidth(
      10,
      105
    );


  dashboard
    .setColumnWidth(
      11,
      105
    );


  dashboard
    .setColumnWidth(
      12,
      105
    );


  dashboard
    .setColumnWidth(
      13,
      105
    );


  dashboard
    .setColumnWidth(
      14,
      105
    );


  dashboard
    .getRange(
      'J1:N30'
    )
    .setVerticalAlignment(
      'middle'
    );


  console.log(
    'B7-D1: Booking Control Panel created successfully.'
  );

}


/* ============================================================
   B7-D1.2
   DISPLAY SELECTED BOOKING
   ============================================================ */


/* ============================================================
   B7-D3 \u2014 COMMON SELECTED BOOKING LOOKUP
   ============================================================ */

function getB7SelectedBooking(
  bookingDataContext,
  bookingId
) {

  const sheet =
    bookingDataContext.responseSheet;

  const lastRow =
    sheet.getLastRow();

  const lastColumn =
    sheet.getLastColumn();

  if (
    lastRow < 2 ||
    lastColumn < 1
  ) {
    return null;
  }

  const values =
    sheet
      .getRange(
        2,
        1,
        lastRow - 1,
        lastColumn
      )
      .getValues();

  const headers =
    bookingDataContext.headers;

  const bookingIdIndex =
    headers.findIndex(
      header =>
        String(
          header || ''
        ).trim().toLowerCase() ===
        'booking id'
    );

  if (
    bookingIdIndex < 0
  ) {
    throw new Error(
      'B7: Booking ID column not found.'
    );
  }

  const target =
    String(
      bookingId || ''
    ).trim();

  if (!target) {
    return null;
  }

  for (
    let i = 0;
    i < values.length;
    i++
  ) {

    if (
      String(
        values[i][bookingIdIndex] || ''
      ).trim() === target
    ) {

      return {
        rowNumber: i + 2,
        values: values[i],
        headers: headers,
        spreadsheet:
          bookingDataContext.spreadsheet,
        responseSheet:
          bookingDataContext.responseSheet
      };
    }
  }

  return null;
}


function displayB7D1Booking(spreadsheetOverride, bookingIdOverride, selectedBookingOverride) {

  /*
   * Use the spreadsheet supplied by the trigger when available.
   * This avoids FormApp.getActiveForm() inside an installable
   * spreadsheet trigger.
   */

  const spreadsheet =
    spreadsheetOverride ||
    getEDBSpreadsheet();


  if (!spreadsheet) {

    throw new Error(
      'B7-D1: Unable to access the EDB spreadsheet.'
    );

  }


  const dashboard =
    spreadsheet.getSheetByName(
      B7_D1_CONFIG.DASHBOARD_SHEET
    );


  if (!dashboard) {

    throw new Error(
      'B7-D1: EDB Dashboard sheet not found.'
    );

  }


  const bookingId =
    String(
      bookingIdOverride ||
      dashboard
        .getRange(
          B7_D1_CONFIG.SELECTOR_CELL
        )
        .getValue() ||
      ''
    ).trim();


  /*
   * Clear previous details only.
   */

  dashboard
    .getRange(
      'J7:N20'
    )
    .breakApart();


  dashboard
    .getRange(
      'J7:N20'
    )
    .clearContent();


  if (
    !bookingId
  ) {

    dashboard
      .getRange(
        'J7:N7'
      )
      .merge();


    dashboard
      .getRange(
        'J7'
      )
      .setValue(
        'Select a Booking ID above.'
      )
      .setFontSize(
        9
      )
      .setFontStyle(
        'italic'
      )
      .setFontColor(
        '#666666'
      )
      .setHorizontalAlignment(
        'center'
      );


    return;

  }


  /* ==========================================================
     RESPONSE DATA
     ========================================================== */

  /*
   * Stage 3.2:
   * When called from the K3 selection path, the selected booking
   * snapshot is already available. Do not reread the response
   * sheet or search for the Booking ID again.
   *
   * The fallback path remains intact for direct/legacy callers.
   */

  let responseSheet = null;
  let lastColumn = 0;
  let headers = [];
  let selectedRow = null;

  if (selectedBookingOverride) {

    responseSheet =
      selectedBookingOverride.responseSheet;

    headers =
      selectedBookingOverride.headers || [];

    selectedRow =
      selectedBookingOverride.values;

  } else {

    responseSheet =
      getEDBResponseSheet(spreadsheet);

    if (!responseSheet) {
      throw new Error(
        'B7-D1: Unable to identify the Form Responses sheet.'
      );
    }

    lastColumn =
      Math.max(
        responseSheet.getLastColumn(),
        1
      );

    headers =
      responseSheet
        .getRange(
          1,
          1,
          1,
          lastColumn
        )
        .getValues()[0];

    const bookingColumn =
      findB7D1Column(
        headers,
        'Booking ID'
      );

    if (!bookingColumn) {
      throw new Error(
        'B7-D1: Booking ID column not found.'
      );
    }

    const lastRow =
      responseSheet.getLastRow();

    if (
      lastRow < 2
    ) {

      showB7D1Message(
        dashboard,
        'No bookings found.'
      );

      return;

    }

    const data =
      responseSheet
        .getRange(
          2,
          1,
          lastRow - 1,
          lastColumn
        )
        .getValues();

    for (
      let i = 0;
      i < data.length;
      i++
    ) {

      const currentId =
        String(
          data[i][
            bookingColumn - 1
          ] || ''
        ).trim();

      if (
        currentId ===
        bookingId
      ) {

        selectedRow =
          data[i];

        break;

      }

    }
  }

  if (!selectedRow) {

    showB7D1Message(
      dashboard,
      'Booking not found: ' +
      bookingId
    );

    return;

  }


  /* ==========================================================
     BOOKING DETAILS
     ========================================================== */

  const details = [

    [
      'Flat',
      getB7D1Value(
        headers,
        selectedRow,
        'Flat No.'
      )
    ],

    [
      'Resident',
      getB7D1Value(
        headers,
        selectedRow,
        'Resident Name'
      )
    ],

    [
      'Material',
      getB7D1Value(
        headers,
        selectedRow,
        ['Material Type', 'What Type of Material']
      )
    ],

    [
      'Duration',
      getB7D1Value(
        headers,
        selectedRow,
        ['Duration', 'Desired Display Duration']
      )
    ],

    [
      'Amount',
      getB7D1Value(
        headers,
        selectedRow,
        ['Total Payable', 'Total Amount']
      )
    ],

    [
      'Payment',
      getB7D1Value(
        headers,
        selectedRow,
        'Payment Status'
      )
    ],

    [
      'Approval',
      getB7D1Value(
        headers,
        selectedRow,
        'Approval Status'
      )
    ],

    [
      'Display',
      getB7D1Value(
        headers,
        selectedRow,
        'Display Status'
      )
    ],

    [
      'Start',
      getB7D1Value(
        headers,
        selectedRow,
        ['Confirmed Start Date', 'Final Start Date']
      ) ||
      getB7D1Value(
        headers,
        selectedRow,
        'Requested Start Date'
      )
    ],

    [
      'End',
      getB7D1Value(
        headers,
        selectedRow,
        ['Confirmed End Date', 'Final End Date']
      ) ||
      getB7D1Value(
        headers,
        selectedRow,
        'Requested End Date'
      )
    ],

    [
      'UTR',
      getB7D1Value(
        headers,
        selectedRow,
        'Payment UTR / Reference'
      )
    ],

    [
      'Validation',
      getB7D1Value(
        headers,
        selectedRow,
        'Media Validation'
      )
    ]

  ];


  /* ==========================================================
     WRITE DETAILS
     ========================================================== */

  dashboard
    .getRange(
      7,
      10,
      details.length,
      2
    )
    .setValues(
      details
    )
    .setFontSize(
      9
    )
    .setVerticalAlignment(
      'middle'
    )
    .setWrap(
      true
    )
    .setBorder(
      true,
      true,
      true,
      true,
      true,
      true
    );


  dashboard
    .getRange(
      7,
      10,
      details.length,
      1
    )
    .setFontWeight(
      'bold'
    )
    .setBackground(
      '#F3F6F9'
    );


  /*
   * Amount.
   */

  dashboard
    .getRange(
      11,
      11
    )
    .setNumberFormat(
      '\u20B9#,##0.00'
    );


  /*
   * Start and End dates.
   */

  dashboard
    .getRange(
      15,
      11,
      2,
      1
    )
    .setNumberFormat(
      'dd-mmm-yyyy'
    );


  /* ==========================================================
     MEDIA LINK
     ========================================================== */

  const mediaLink =
    getB7D1Value(
      headers,
      selectedRow,
      'Media Drive Link'
    );


  if (
    mediaLink
  ) {

    dashboard
      .getRange(
        'J20:N20'
      )
      .merge();


    dashboard
      .getRange(
        'J20'
      )
      .setFormula(
        '=HYPERLINK("' +
        String(
          mediaLink
        ).replace(
          /"/g,
          '""'
        ) +
        '","\u1F4CE OPEN MEDIA FILE")'
      )
      .setHorizontalAlignment(
        'center'
      )
      .setFontWeight(
        'bold'
      )
      .setBackground(
        '#E2F0D9'
      )
      .setBorder(
        true,
        true,
        true,
        true,
        true,
        true
      );

  }


  console.log(
    'B7-D1: Booking details displayed for ' +
    bookingId
  );

}


/* ============================================================
   B7-D1.3
   SHOW MESSAGE
   ============================================================ */

function showB7D1Message(
  dashboard,
  message
) {

  dashboard
    .getRange(
      'J7:N7'
    )
    .merge();


  dashboard
    .getRange(
      'J7'
    )
    .setValue(
      message
    )
    .setFontSize(
      9
    )
    .setFontStyle(
      'italic'
    )
    .setFontColor(
      '#666666'
    )
    .setHorizontalAlignment(
      'center'
    );

}


/* ============================================================
   B7-D1.4
   GET VALUE FROM RESPONSE ROW
   ============================================================ */

function getB7D1Value(
  headers,
  row,
  headerName
) {

  /*
   * B7-D1 supports either a single header name
   * or an ordered list of acceptable aliases.
   *
   * First try an exact normalized header match.
   * If that fails, try a normalized CONTAINS match.
   *
   * This makes D1 tolerant of response-form headers
   * such as:
   *   What Type of Material?
   *   What Type of Material (Image/PDF)
   *   Total Payable (including GST)
   *   Confirmed Start Date / Final Start Date
   */

  const candidates =
    Array.isArray(headerName)
      ? headerName
      : [headerName];


  /*
   * PASS 1: exact normalized match
   */

  for (
    let i = 0;
    i < candidates.length;
    i++
  ) {

    const column =
      findB7D1Column(
        headers,
        candidates[i]
      );


    if (column) {

      return row[
        column - 1
      ];

    }

  }


  /*
   * PASS 2: partial / contains match
   */

  for (
    let c = 0;
    c < candidates.length;
    c++
  ) {

    const target =
      normaliseHeader(
        candidates[c]
      );


    if (!target) {
      continue;
    }


    for (
      let i = 0;
      i < headers.length;
      i++
    ) {

      const current =
        normaliseHeader(
          headers[i]
        );


      if (
        current.includes(target)
      ) {

        return row[i];

      }

    }

  }


  return '';

}


/* ============================================================
   B7-D1.5
   FIND COLUMN BY HEADER
   ============================================================ */

function findB7D1Column(
  headers,
  headerName
) {

  const target =
    normaliseHeader(
      headerName
    );


  for (
    let i = 0;
    i < headers.length;
    i++
  ) {

    if (
      normaliseHeader(
        headers[i]
      ) ===
      target
    ) {

      return i + 1;

    }

  }


  return 0;

}


/* ============================================================
   B7-D1.6
   INSTALL BOOKING SELECTOR TRIGGER
   ============================================================ */

function installB7D1BookingTrigger() {

  /*
   * Use the existing B7 spreadsheet resolver.
   */

  const spreadsheet =
    getEDBSpreadsheet();


  if (!spreadsheet) {

    throw new Error(
      'B7-D1: Unable to access the EDB spreadsheet.'
    );

  }


  /*
   * Remove old copies of this trigger.
   */

  const triggers =
    ScriptApp.getProjectTriggers();


  triggers.forEach(
    trigger => {

      if (
        trigger.getHandlerFunction() ===
        'handleB7D1BookingEdit'
      ) {

        ScriptApp.deleteTrigger(
          trigger
        );

      }

    }
  );


  /*
   * Install the spreadsheet on-edit trigger.
   */

  ScriptApp
    .newTrigger(
      'handleB7D1BookingEdit'
    )
    .forSpreadsheet(
      spreadsheet
    )
    .onEdit()
    .create();


  console.log(
    'B7-D1: Booking selector trigger installed successfully.'
  );

}


/* ============================================================
   B7-D1.7
   EDIT TRIGGER HANDLER
   ============================================================ */

function refreshB7SelectionPanels(
  spreadsheet,
  bookingId
) {

  const dashboard =
    spreadsheet.getSheetByName(
      B7_D1_CONFIG.DASHBOARD_SHEET
    );

  if (!dashboard) {
    throw new Error(
      'B7-D1: Dashboard sheet not found.'
    );
  }

  const bookingDataContext =
    getB7BookingDataContext(
      spreadsheet
    );

  if (!bookingId) {

  dashboard
    .getRange('J7:N20')
    .clearContent();

  loadB7D2BookingActions(
    spreadsheet,
    null
  );

  return;
}

  const selectedBooking =
    getB7SelectedBooking(
      bookingDataContext,
      bookingId
    );

  if (!selectedBooking) {

    throw new Error(
      'B7: Booking ID not found: ' +
      bookingId
    );
  }

  /*
   * Stage 3:
   * ONE response-sheet read/lookup is shared by D1 and D2.
   *
   * The rendering functions may use this snapshot rather than
   * independently searching for the same Booking ID.
   */

  displayB7D1Booking(
    spreadsheet,
    bookingId,
    selectedBooking
  );

  loadB7D2BookingActions(
    spreadsheet,
    selectedBooking
  );

  console.log(
    'B7: Common selected-booking lookup completed for ' +
    bookingId
  );
}



function handleB7D1BookingEdit(e) {

  if (
    !e ||
    !e.range
  ) {
    return;
  }

  const sheet =
    e.range.getSheet();

  if (
    sheet.getName() !==
    B7_D1_CONFIG.DASHBOARD_SHEET
  ) {
    return;
  }

  const row =
    e.range.getRow();

  const column =
    e.range.getColumn();

  /*
   * K3 is the master Booking selector.
   *
   * Stage 2:
   * Do NOT rebuild the entire dashboard.
   * Refresh only D1 + D2.
   */

  if (
    row === 3 &&
    column === 11
  ) {

    const spreadsheet =
      e.source;

    const bookingId =
      String(
        e.range.getValue() || ''
      ).trim();

    refreshB7SelectionPanels(
      spreadsheet,
      bookingId
    );

    return;
  }
}

/* ============================================================
   B7-D2
   BOOKING ACTION CONTROL PANEL
   ============================================================

   PURPOSE
   -------
   Adds administrative controls to the existing B7-D1
   Booking Control Panel.

   D2 CONTROLS ONLY:

   - Approval Status
   - Confirmed Start Date
   - Confirmed End Date
   - Display Status

   D2 DOES NOT MODIFY:

   - Payment Status
   - Payment UTR / Reference
   - Payment Date
   - Media Validation
   - Pricing
   - WhatsApp processing

   D2 is therefore an administrative UI layer only.

   ============================================================ */


/* ============================================================
   B7-D2 CONFIGURATION
   ============================================================ */

const B7_D2_CONFIG = {

  DASHBOARD_SHEET:
    'EDB Dashboard',

  BOOKING_SELECTOR:
    'K3',

  APPROVAL_CELL:
    'K23',

  START_DATE_CELL:
    'K24',

  END_DATE_CELL:
    'K25',

  DISPLAY_STATUS_CELL:
    'K26',

  ACTION_CELL:
    'K28',

  STATUS_CELL:
    'K29'

};


/* ============================================================
   B7-D2.1
   CREATE ACTION PANEL
   ============================================================ */

function setupB7D2BookingActions(spreadsheetOverride) {

  const spreadsheet =
    getEDBSpreadsheet(spreadsheetOverride);


  if (!spreadsheet) {

    throw new Error(
      'B7-D2: Unable to access the EDB spreadsheet.'
    );

  }


  const dashboard =
    spreadsheet.getSheetByName(
      B7_D2_CONFIG.DASHBOARD_SHEET
    );


  if (!dashboard) {

    throw new Error(
      'B7-D2: EDB Dashboard sheet not found.'
    );

  }


  /*
   * ----------------------------------------------------------
   * ACTION PANEL HEADER
   * ----------------------------------------------------------
   */

  dashboard
    .getRange(
      'J22:N22'
    )
    .breakApart();


  dashboard
    .getRange(
      'J22:N22'
    )
    .merge();


  dashboard
    .getRange(
      'J22'
    )
    .setValue(
      'ADMIN ACTIONS'
    );


  dashboard
    .getRange(
      'J22:N22'
    )
    .setFontWeight(
      'bold'
    )
    .setFontSize(
      10
    )
    .setHorizontalAlignment(
      'center'
    )
    .setBackground(
      '#D9EAF7'
    );


  /*
   * ----------------------------------------------------------
   * APPROVAL
   * ----------------------------------------------------------
   */

  dashboard
    .getRange(
      'J23'
    )
    .setValue(
      'Approval'
    );


  dashboard
    .getRange(
      'J23'
    )
    .setFontWeight(
      'bold'
    )
    .setFontSize(
      9
    );


  dashboard
    .getRange(
      'K23:N23'
    )
    .breakApart();


  dashboard
    .getRange(
      'K23:N23'
    )
    .merge();


  dashboard
    .getRange(
      B7_D2_CONFIG.APPROVAL_CELL
    )
    .setValue(
      'Pending'
    );


  const approvalValidation =
    SpreadsheetApp
      .newDataValidation()
      .requireValueInList(
        [
          'Pending',
          'Approved',
          'Rejected'
        ],
        true
      )
      .setAllowInvalid(
        false
      )
      .build();


  dashboard
    .getRange(
      B7_D2_CONFIG.APPROVAL_CELL
    )
    .setDataValidation(
      approvalValidation
    );


  /*
   * ----------------------------------------------------------
   * CONFIRMED START DATE
   * ----------------------------------------------------------
   */

  dashboard
    .getRange(
      'J24'
    )
    .setValue(
      'Confirmed Start'
    );


  dashboard
    .getRange(
      'J24'
    )
    .setFontWeight(
      'bold'
    )
    .setFontSize(
      9
    );


  dashboard
    .getRange(
      'K24:N24'
    )
    .breakApart();

dashboard
  .getRange(
    'K24:N24'
  )
  .clearDataValidations();


  dashboard
    .getRange(
      'K24:N24'
    )
    .merge();


  dashboard
    .getRange(
      B7_D2_CONFIG.START_DATE_CELL
    )
    .setNumberFormat(
      'dd-mmm-yyyy'
    );


  /*
   * ----------------------------------------------------------
   * CONFIRMED END DATE
   * ----------------------------------------------------------
   */

  dashboard
    .getRange(
      'J25'
    )
    .setValue(
      'Confirmed End'
    );


  dashboard
    .getRange(
      'J25'
    )
    .setFontWeight(
      'bold'
    )
    .setFontSize(
      9
    );


  dashboard
  .getRange(
    'K25:N25'
  )
  .breakApart();

dashboard
  .getRange(
    'K25:N25'
  )
  .merge();

/*
 * K25 is Confirmed End Date.
 * Remove any stale validation inherited
 * from the previous dashboard layout.
 */
dashboard
  .getRange(
    'K25:N25'
  )
  .clearDataValidations();

dashboard
  .getRange(
    B7_D2_CONFIG.END_DATE_CELL
  )
  .setNumberFormat(
    'dd-mmm-yyyy'
  );


  /*
   * ----------------------------------------------------------
   * DISPLAY STATUS
   * ----------------------------------------------------------
   */

  dashboard
    .getRange(
      'J26'
    )
    .setValue(
      'Display Status'
    );


  dashboard
    .getRange(
      'J26'
    )
    .setFontWeight(
      'bold'
    )
    .setFontSize(
      9
    );


  dashboard
    .getRange(
      'K26:N26'
    )
    .breakApart();


  dashboard
    .getRange(
      'K26:N26'
    )
    .merge();


  dashboard
    .getRange(
      B7_D2_CONFIG.DISPLAY_STATUS_CELL
    )
    .setValue(
      'Scheduled'
    );


  const displayValidation =
    SpreadsheetApp
      .newDataValidation()
      .requireValueInList(
        [
          'Pending',
          'Scheduled',
          'Currently Displaying',
          'Completed',
          'Rejected'
        ],
        true
      )
      .setAllowInvalid(
        false
      )
      .build();


  dashboard
    .getRange(
      B7_D2_CONFIG.DISPLAY_STATUS_CELL
    )
    .setDataValidation(
      displayValidation
    );


  /*
   * ----------------------------------------------------------
   * ACTION SELECTOR
   * ----------------------------------------------------------
   */

  dashboard
    .getRange(
      'J28'
    )
    .setValue(
      'Action'
    );


  dashboard
    .getRange(
      'J28'
    )
    .setFontWeight(
      'bold'
    )
    .setFontSize(
      9
    );


  dashboard
    .getRange(
      'K28:N28'
    )
    .breakApart();


  dashboard
    .getRange(
      'K28:N28'
    )
    .merge();


  dashboard
    .getRange(
      B7_D2_CONFIG.ACTION_CELL
    )
    .setValue(
      ''
    );


  const actionValidation =
    SpreadsheetApp
      .newDataValidation()
      .requireValueInList(
        [
          'Save Changes',
          'Approve Booking',
          'Reject Booking'
        ],
        true
      )
      .setAllowInvalid(
        false
      )
      .build();


  dashboard
    .getRange(
      B7_D2_CONFIG.ACTION_CELL
    )
    .setDataValidation(
      actionValidation
    );


  dashboard
    .getRange(
      B7_D2_CONFIG.ACTION_CELL
    )
    .setBackground(
      '#FFF2CC'
    )
    .setFontWeight(
      'bold'
    )
    .setHorizontalAlignment(
      'center'
    );


  /*
   * ----------------------------------------------------------
   * ACTION STATUS
   * ----------------------------------------------------------
   */

  dashboard
    .getRange(
      'J29'
    )
    .setValue(
      'Result'
    );


  dashboard
    .getRange(
      'J29'
    )
    .setFontWeight(
      'bold'
    )
    .setFontSize(
      9
    );


  dashboard
    .getRange(
      'K29:N29'
    )
    .breakApart();


  dashboard
    .getRange(
      'K29:N29'
    )
    .merge();


  dashboard
    .getRange(
      B7_D2_CONFIG.STATUS_CELL
    )
    .setValue(
      'Ready'
    );


  dashboard
    .getRange(
      'K29:N29'
    )
    .setFontSize(
      9
    )
    .setFontStyle(
      'italic'
    )
    .setHorizontalAlignment(
      'center'
    );


  /*
   * ----------------------------------------------------------
   * PANEL FORMATTING
   * ----------------------------------------------------------
   */

  dashboard
    .getRange(
      'J23:N29'
    )
    .setBorder(
      true,
      true,
      true,
      true,
      true,
      true
    );


  dashboard
    .getRange(
      'J23:J29'
    )
    .setBackground(
      '#F3F6F9'
    );


  dashboard
    .getRange(
      'K23:N28'
    )
    .setBackground(
      '#FFFDF2'
    );


  dashboard
    .getRange(
      'J23:N29'
    )
    .setVerticalAlignment(
      'middle'
    );


  /*
   * NOTE:
   *
   * K23 = Approval
   * K24 = Confirmed Start
   * K25 = Confirmed End
   * K26 = Display Status
   * K28 = Action
   * K29 = Result
   *
   * Dates are formatted below.
   */

  dashboard
    .getRange(
      'K24'
    )
    .setNumberFormat(
      'dd-mmm-yyyy'
    );


  dashboard
    .getRange(
      'K25'
    )
    .setNumberFormat(
      'dd-mmm-yyyy'
    );


  console.log(
    'B7-D2: Booking Action Panel created successfully.'
  );

}


/* ============================================================
   B7-D2.2
   LOAD SELECTED BOOKING INTO ACTION PANEL
   ============================================================ */

function loadB7D2BookingActions(spreadsheetOverride, selectedBookingOverride) {

  const spreadsheet =
    spreadsheetOverride ||
    getEDBSpreadsheet();

  if (!spreadsheet) {

    throw new Error(
      'B7-D2: Unable to access the EDB spreadsheet.'
    );

  }


  const dashboard =
    spreadsheet.getSheetByName(
      B7_D2_CONFIG.DASHBOARD_SHEET
    );


  if (!dashboard) {

    throw new Error(
      'B7-D2: EDB Dashboard sheet not found.'
    );

  }


  const bookingId =
    String(
      dashboard
        .getRange(
          B7_D2_CONFIG.BOOKING_SELECTOR
        )
        .getValue() ||
      ''
    ).trim();


  if (
    !bookingId
  ) {

    return;

  }


  /*
   * Stage 3.2:
   * Reuse the selected booking snapshot supplied by the K3
   * selection path. Do not reread/search the response sheet.
   *
   * The fallback path remains intact for direct/legacy callers.
   */

  let responseSheet = null;
  let lastColumn = 0;
  let headers = [];
  let selectedRow = null;

  if (selectedBookingOverride) {

    responseSheet =
      selectedBookingOverride.responseSheet;

    headers =
      selectedBookingOverride.headers || [];

    selectedRow =
      selectedBookingOverride.values;

  } else {

    responseSheet =
      getEDBResponseSheet(spreadsheet);

    if (!responseSheet) {
      throw new Error(
        'B7-D2: Unable to identify the Form Responses sheet.'
      );
    }

    lastColumn =
      Math.max(
        responseSheet.getLastColumn(),
        1
      );

    headers =
      responseSheet
        .getRange(
          1,
          1,
          1,
          lastColumn
        )
        .getValues()[0];

    const bookingColumn =
      findB7D2Column(
        headers,
        'Booking ID'
      );

    if (!bookingColumn) {
      throw new Error(
        'B7-D2: Booking ID column not found.'
      );
    }

    const lastRow =
      responseSheet.getLastRow();

    if (
      lastRow < 2
    ) {
      return;
    }

    const values =
      responseSheet
        .getRange(
          2,
          1,
          lastRow - 1,
          lastColumn
        )
        .getValues();

    for (
      let i = 0;
      i < values.length;
      i++
    ) {

      const currentId =
        String(
          values[i][
            bookingColumn - 1
          ] || ''
        ).trim();

      if (
        currentId ===
        bookingId
      ) {

        selectedRow =
          values[i];

        break;

      }

    }
  }

  if (!selectedRow) {
    return;
  }


  /*
   * ----------------------------------------------------------
   * LOAD CURRENT VALUES
   * ----------------------------------------------------------
   */

  const approval =
    getB7D2Value(
      headers,
      selectedRow,
      'Approval Status'
    );


  const confirmedStart =
    getB7D2Value(
      headers,
      selectedRow,
      'Confirmed Start Date'
    );


  const confirmedEnd =
    getB7D2Value(
      headers,
      selectedRow,
      'Confirmed End Date'
    );


  const requestedStart =
    getB7D2Value(
      headers,
      selectedRow,
      'Requested Start Date'
    );


  const requestedEnd =
    getB7D2Value(
      headers,
      selectedRow,
      'Requested End Date'
    );


  const displayStatus =
    getB7D2Value(
      headers,
      selectedRow,
      'Display Status'
    );


  /*
   * ----------------------------------------------------------
   * POPULATE ACTION PANEL
   * ----------------------------------------------------------
   */

  dashboard
    .getRange(
      B7_D2_CONFIG.APPROVAL_CELL
    )
    .setValue(
      approval ||
      'Pending'
    );


  dashboard
    .getRange(
      B7_D2_CONFIG.START_DATE_CELL
    )
    .setValue(
      confirmedStart ||
      requestedStart ||
      ''
    );


  dashboard
    .getRange(
      B7_D2_CONFIG.END_DATE_CELL
    )
    .setValue(
      confirmedEnd ||
      requestedEnd ||
      ''
    );


  dashboard
    .getRange(
      B7_D2_CONFIG.DISPLAY_STATUS_CELL
    )
    .setValue(
      displayStatus ||
      'Pending'
    );


  dashboard
    .getRange(
      B7_D2_CONFIG.ACTION_CELL
    )
    .setValue(
      ''
    );


  dashboard
    .getRange(
      B7_D2_CONFIG.STATUS_CELL
    )
    .setValue(
      'Ready'
    );


  console.log(
    'B7-D2: Action panel loaded for ' +
    bookingId
  );

}


/* ============================================================
   B7-D2.3
   SAVE ADMIN ACTIONS
   ============================================================ */


/* ============================================================
   B7-D2.6 \u2014 TARGETED POST-SAVE DASHBOARD REFRESH
   ============================================================ */

function refreshB7AdminActionDashboardData(spreadsheet) {

  const dashboard =
    spreadsheet.getSheetByName(
      EDB_DASHBOARD_SHEET_NAME
    );

  if (!dashboard) {
    throw new Error(
      'B7: Dashboard sheet not found.'
    );
  }

  const responseSheet =
    getEDBResponseSheet(
      spreadsheet
    );

  const dataset =
    getEDBBookingRows(
      responseSheet
    );

  const rows =
    dataset.rows;

  const headerMap =
    dataset.headers;

  const counts =
    getEDBSummaryCounts(
      rows,
      headerMap
    );

  /*
   * Summary values only. Existing merged cells and formatting
   * remain untouched.
   */

  dashboard.getRange('A6').setValue(counts.pendingReview);
  dashboard.getRange('C6').setValue(counts.awaitingPayment);
  dashboard.getRange('E6').setValue(counts.scheduled);
  dashboard.getRange('G6').setValue(counts.displaying);
  dashboard.getRange('A8').setValue(counts.completed);
  dashboard.getRange('E8').setValue(counts.rejected);

  /*
   * Recent Bookings \u2014 same fixed block, no dashboard rebuild.
   */

  const recentTitle =
    dashboard
      .createTextFinder('RECENT BOOKINGS')
      .matchEntireCell(true)
      .findNext();

  if (recentTitle) {

    const startRow =
      recentTitle.getRow() + 2;

    const recent =
      getEDBRecentRows(
        rows,
        headerMap
      );

    const output =
      recent.map(row => [
        getEDBValue(row, headerMap, 'Booking ID'),
        getEDBValue(row, headerMap, ['Flat No.', 'Flat No']),
        getEDBValue(row, headerMap, 'Resident Name'),
        getEDBValue(row, headerMap, ['Material Type', 'What Type of Material']),
        getEDBValue(row, headerMap, 'Duration'),
        getEDBValue(row, headerMap, 'Total Payable'),
        getEDBValue(row, headerMap, 'Payment Status'),
        getEDBAutomaticDisplayState(row, headerMap)
      ]);

    dashboard
      .getRange(startRow, 1, 10, 8)
      .clearContent();

    if (output.length) {

      dashboard
        .getRange(startRow, 1, output.length, 8)
        .setValues(output)
        .setFontSize(9)
        .setVerticalAlignment('middle')
        .setWrap(true)
        .setBorder(true, true, true, true, true, true);

      dashboard
        .getRange(startRow, 6, output.length, 1)
        .setNumberFormat('\u20B9#,##0.00');

      dashboard
        .getRange(startRow, 7, output.length, 2)
        .setBackground(null)
        .setFontWeight('normal');

      applyEDBRecentStatusFormatting(
        dashboard,
        startRow,
        output.length
      );

    }
  }

  /*
   * Current / Upcoming Displays.
   *
   * The number of bookings does not change during an Admin
   * Action, so the section's existing position is retained.
   */

  const displayTitle =
    dashboard
      .createTextFinder('CURRENT / UPCOMING DISPLAYS')
      .matchEntireCell(true)
      .findNext();

  if (displayTitle) {

    const startRow =
      displayTitle.getRow() + 2;

    const footer =
      dashboard
        .createTextFinder('Last refreshed:')
        .matchCase(false)
        .findNext();

    if (footer) {

      const capacity =
        Math.max(
          footer.getRow() - startRow - 1,
          0
        );

      const displayRows =
        getEDBCurrentUpcomingRows(
          rows,
          headerMap
        );

      if (displayRows.length <= capacity) {

        dashboard
          .getRange(
            startRow,
            1,
            capacity,
            8
          )
          .clearContent();

        if (displayRows.length) {

          const output =
            displayRows.map(row => [
              getEDBValue(row, headerMap, 'Booking ID'),
              getEDBValue(row, headerMap, ['Flat No.', 'Flat No']),
              getEDBValue(row, headerMap, 'Resident Name'),
              getEDBValue(row, headerMap, ['Material Type', 'What Type of Material']),
              getEDBDisplayDate(row, headerMap, ['Confirmed Start Date', 'Final Start Date'], 'Requested Start Date'),
              getEDBDisplayDate(row, headerMap, ['Confirmed End Date', 'Final End Date'], 'Requested End Date'),
              getEDBAutomaticDisplayState(row, headerMap),
              getEDBValue(row, headerMap, 'Total Payable')
            ]);

          dashboard
            .getRange(startRow, 1, output.length, 8)
            .setValues(output)
            .setFontSize(9)
            .setWrap(true)
            .setVerticalAlignment('middle')
            .setBorder(true, true, true, true, true, true);

          dashboard
            .getRange(startRow, 5, output.length, 2)
            .setNumberFormat('dd-mmm-yyyy');

          dashboard
            .getRange(startRow, 8, output.length, 1)
            .setNumberFormat('\u20B9#,##0.00');

          dashboard
            .getRange(startRow, 7, output.length, 1)
            .setBackground(null)
            .setFontWeight('normal');

          applyEDBDisplayStatusFormatting(
            dashboard,
            startRow,
            output.length
          );
        }

      } else {

        console.log(
          'B7: Targeted refresh did not expand Current/Upcoming Displays because existing capacity is ' +
          capacity +
          ' and required rows are ' +
          displayRows.length
        );

      }
    }
  }

  /*
   * Timestamp only \u2014 no dashboard rebuild.
   */

  const footer =
    dashboard
      .createTextFinder('Last refreshed:')
      .matchCase(false)
      .findNext();

  if (footer) {

    footer
      .setValue(
        'Last refreshed: ' +
        Utilities.formatDate(
          new Date(),
          Session.getScriptTimeZone(),
          'dd-MMM-yyyy HH:mm'
        )
      )
      .setHorizontalAlignment('right')
      .setFontSize(9)
      .setFontColor('#777777');

  }

}


/* ============================================================
   B7-D2.7 \u2014 TARGETED POST-SAVE PANEL REFRESH
   ============================================================ */

function refreshB7AdminActionPanels(
  spreadsheet,
  bookingId
) {

  refreshB7AdminActionDashboardData(
    spreadsheet
  );

  /*
   * Reuse the proven common selected-booking path.
   * This loads D1 and D2 without rebuilding the dashboard.
   */

  refreshB7SelectionPanels(
    spreadsheet,
    bookingId
  );

  console.log(
    'B7: Targeted Admin Action refresh completed for ' +
    bookingId
  );

}


function saveB7D2BookingActions(spreadsheetOverride) {

  const spreadsheet =
  spreadsheetOverride ||
  getEDBSpreadsheet();

  if (!spreadsheet) {

    throw new Error(
      'B7-D2: Unable to access the EDB spreadsheet.'
    );

  }


  const dashboard =
    spreadsheet.getSheetByName(
      B7_D2_CONFIG.DASHBOARD_SHEET
    );


  if (!dashboard) {

    throw new Error(
      'B7-D2: EDB Dashboard sheet not found.'
    );

  }


  const bookingId =
    String(
      dashboard
        .getRange(
          B7_D2_CONFIG.BOOKING_SELECTOR
        )
        .getValue() ||
      ''
    ).trim();


  if (
    !bookingId
  ) {

    setB7D2Result(
      dashboard,
      'ERROR: Select a Booking ID first.'
    );

    return;

  }


  const action =
    String(
      dashboard
        .getRange(
          B7_D2_CONFIG.ACTION_CELL
        )
        .getValue() ||
      ''
    ).trim();


  if (
    !action
  ) {

    setB7D2Result(
      dashboard,
      'Select an action first.'
    );

    return;

  }


  /*
   * ----------------------------------------------------------
   * RESPONSE SHEET
   * ----------------------------------------------------------
   */

  const responseSheet =
    getEDBResponseSheet(spreadsheet);

  if (!responseSheet) {
    throw new Error(
      'B7-D2: Unable to identify the Form Responses sheet.'
    );
  }


  const lastColumn =
    Math.max(
      responseSheet.getLastColumn(),
      1
    );


  const headers =
    responseSheet
      .getRange(
        1,
        1,
        1,
        lastColumn
      )
      .getValues()[0];


  const bookingColumn =
    findB7D2Column(
      headers,
      'Booking ID'
    );


  const paymentStatusColumn =
    findB7D2Column(
      headers,
      'Payment Status'
    );


  const approvalColumn =
    findB7D2Column(
      headers,
      'Approval Status'
    );


  const startColumn =
    findB7D2Column(
      headers,
      'Confirmed Start Date'
    );


  const endColumn =
    findB7D2Column(
      headers,
      'Confirmed End Date'
    );


  const displayColumn =
    findB7D2Column(
      headers,
      'Display Status'
    );


  if (
    !bookingColumn ||
    !paymentStatusColumn ||
    !approvalColumn ||
    !startColumn ||
    !endColumn ||
    !displayColumn
  ) {

    throw new Error(
      'B7-D2: One or more required administrative columns are missing.'
    );

  }


  /*
   * ----------------------------------------------------------
   * FIND BOOKING ROW
   * ----------------------------------------------------------
   */

  const lastRow =
    responseSheet.getLastRow();


  const values =
    responseSheet
      .getRange(
        2,
        1,
        Math.max(
          lastRow - 1,
          1
        ),
        lastColumn
      )
      .getValues();


  let rowNumber =
    0;


  let rowValues =
    null;


  for (
    let i = 0;
    i < values.length;
    i++
  ) {

    const currentId =
      String(
        values[i][
          bookingColumn - 1
        ] || ''
      ).trim();


    if (
      currentId ===
      bookingId
    ) {

      rowNumber =
        i + 2;

      rowValues =
        values[i];

      break;

    }

  }


  if (
    !rowNumber
  ) {

    setB7D2Result(
      dashboard,
      'ERROR: Booking not found.'
    );

    return;

  }


  /*
   * ----------------------------------------------------------
   * PAYMENT SAFETY CHECK
   * ----------------------------------------------------------
   */

  const paymentStatus =
    String(
      rowValues[
        paymentStatusColumn - 1
      ] || ''
    ).trim();


  /*
   * APPROVE / SCHEDULED actions require Paid.
   */

  if (
  action === 'Approve Booking' &&
  paymentStatus.toLowerCase() !== 'paid'
) {

  setB7D2Result(
    dashboard,
    'BLOCKED: Booking cannot be Approved until Payment Status is Paid.'
  );

  return;

}


  /*
   * ----------------------------------------------------------
   * READ PANEL VALUES
   * ----------------------------------------------------------
   */

  const approvalValue =
    String(
      dashboard
        .getRange(
          B7_D2_CONFIG.APPROVAL_CELL
        )
        .getValue() ||
      ''
    ).trim();


  const startValue =
    dashboard
      .getRange(
        B7_D2_CONFIG.START_DATE_CELL
      )
      .getValue();


  const endValue =
    dashboard
      .getRange(
        B7_D2_CONFIG.END_DATE_CELL
      )
      .getValue();


  const displayValue =
    String(
      dashboard
        .getRange(
          B7_D2_CONFIG.DISPLAY_STATUS_CELL
        )
        .getValue() ||
      ''
    ).trim();


  /*
   * ----------------------------------------------------------
   * DETERMINE FINAL VALUES
   * ----------------------------------------------------------
   */

  let finalApproval =
    approvalValue;


  let finalDisplay =
    displayValue;


  if (
    action ===
      'Approve Booking'
  ) {

    finalApproval =
      'Approved';

  }


  if (
    action ===
      'Reject Booking'
  ) {

    finalApproval =
      'Rejected';

    finalDisplay =
      'Rejected';

  }


  /*
   * ----------------------------------------------------------
   * WRITE ONLY D2 FIELDS
   * ----------------------------------------------------------
   */

  responseSheet
    .getRange(
      rowNumber,
      approvalColumn
    )
    .setValue(
      finalApproval
    );


  if (
    startValue
  ) {

    responseSheet
      .getRange(
        rowNumber,
        startColumn
      )
      .setValue(
        startValue
      );

  }


  if (
    endValue
  ) {

    responseSheet
      .getRange(
        rowNumber,
        endColumn
      )
      .setValue(
        endValue
      );

  }


  if (
    finalDisplay
  ) {

    responseSheet
      .getRange(
        rowNumber,
        displayColumn
      )
      .setValue(
        finalDisplay
      );

  }


  /*
   * Date formatting in response sheet.
   */

  responseSheet
    .getRange(
      rowNumber,
      startColumn
    )
    .setNumberFormat(
      'dd-mmm-yyyy'
    );


  responseSheet
    .getRange(
      rowNumber,
      endColumn
    )
    .setNumberFormat(
      'dd-mmm-yyyy'
    );


  /*
   * ----------------------------------------------------------
   * TARGETED POST-SAVE REFRESH
   * ----------------------------------------------------------
   *
   * Do NOT rebuild the entire dashboard here.
   */

  refreshB7AdminActionPanels(
    spreadsheet,
    bookingId
  );


  /*
   * Clear action selector after successful save.
   */

  dashboard
    .getRange(
      B7_D2_CONFIG.ACTION_CELL
    )
    .setValue(
      ''
    );


  setB7D2Result(
    dashboard,
    'Saved successfully: ' +
    bookingId
  );


  console.log(
    'B7-D2: Booking updated successfully: ' +
    bookingId
  );

}


/* ============================================================
   B7-D2.4
   SET RESULT MESSAGE
   ============================================================ */

function setB7D2Result(
  dashboard,
  message
) {

  dashboard
    .getRange(
      B7_D2_CONFIG.STATUS_CELL
    )
    .setValue(
      message
    );


  dashboard
    .getRange(
      'K29:N29'
    )
    .setFontSize(
      9
    )
    .setFontWeight(
      'bold'
    )
    .setHorizontalAlignment(
      'center'
    );


}


/* ============================================================
   B7-D2.5
   GET RESPONSE VALUE
   ============================================================ */

function getB7D2Value(
  headers,
  row,
  headerName
) {

  const column =
    findB7D2Column(
      headers,
      headerName
    );


  if (!column) {

    return '';

  }


  return row[
    column - 1
  ];

}


/* ============================================================
   B7-D2.6
   FIND RESPONSE COLUMN
   ============================================================ */

function findB7D2Column(
  headers,
  headerName
) {

  const target =
    normaliseHeader(
      headerName
    );


  for (
    let i = 0;
    i < headers.length;
    i++
  ) {

    if (
      normaliseHeader(
        headers[i]
      ) ===
      target
    ) {

      return i + 1;

    }

  }


  return 0;

}


/* ============================================================
   B7-D2.7
   INSTALL D2 EDIT TRIGGER
   ============================================================ */

function installB7D2BookingTrigger() {

  const spreadsheet =
    getEDBSpreadsheet();


  if (!spreadsheet) {

    throw new Error(
      'B7-D2: Unable to access the EDB spreadsheet.'
    );

  }


  const triggers =
    ScriptApp.getProjectTriggers();


  triggers.forEach(
    trigger => {

      if (
        trigger.getHandlerFunction() ===
        'handleB7D2BookingEdit'
      ) {

        ScriptApp.deleteTrigger(
          trigger
        );

      }

    }
  );


  ScriptApp
    .newTrigger(
      'handleB7D2BookingEdit'
    )
    .forSpreadsheet(
      spreadsheet
    )
    .onEdit()
    .create();


  console.log(
    'B7-D2: Booking action trigger installed successfully.'
  );

}


/* ============================================================
   B7-D2.8
   EDIT TRIGGER HANDLER
   ============================================================ */

function handleB7D2BookingEdit(e) {

  if (!e || !e.range) {
    return;
  }

  const spreadsheet = e.source;
  const sheet = e.range.getSheet();

  if (
    sheet.getName() !==
    B7_D2_CONFIG.DASHBOARD_SHEET
  ) {
    return;
  }

  const row = e.range.getRow();
  const column = e.range.getColumn();


  /*
   * ----------------------------------------------------------
   * ACTION SELECTOR ONLY
   *
   * K28:N28 belongs exclusively to B7-D2.
   * K3 belongs exclusively to B7-D1.
   * ----------------------------------------------------------
   */

  if (
    row === 28 &&
    column === 11
  ) {

    const action =
      String(
        e.range.getValue() || ''
      ).trim();


    if (
      action === 'Save Changes' ||
      action === 'Approve Booking' ||
      action === 'Reject Booking'
    ) {

      saveB7D2BookingActions(
        spreadsheet
      );

    }

  }

}

/* ============================================================
   MERGED B3/B3-B/B4 PAYMENT + WHATSAPP MODULE
   ============================================================ */

/***************************************************************
 * IFFG ELECTRONIC DISPLAY BOARD
 *
 * PART B3-A
 * PAYMENT CONFIRMATION + AUTOMATIC BOOKING DATES
 *
 * BOUND TO THE RESPONSE SPREADSHEET
 *
 * PROCESSING RULE:
 *
 * Payment Status = Paid
 * AND
 * Payment UTR / Reference is present
 * AND
 * Payment Date is present
 * AND
 * Media Validation = PASS
 *
 * THEN:
 *
 * Confirmed Start Date =
 *   later of:
 *   - Preferred Start Date
 *   - Payment Date + 1 day
 *
 * Confirmed End Date =
 *   based on selected duration
 *
 * Display Status = Scheduled
 ***************************************************************/


const B3_CONFIG = {

  PAID_STATUS: 'Paid',

  DISPLAY_STATUS_SCHEDULED: 'Scheduled'
};


/* ============================================================
   MAIN EDIT TRIGGER
   ============================================================ */

function processPaymentEdit(e) {

  console.log('======================================');

  console.log('B3-A triggered');


  /*
   * Safety check.
   */

  if (!e || !e.range) {

    console.log(
      'No edit event supplied. Exiting.'
    );

    return;
  }


  const sheet =
    e.range.getSheet();


  const row =
    e.range.getRow();


  const editedColumn =
    e.range.getColumn();


  console.log(
    'Sheet: ' +
    sheet.getName()
  );


  console.log(
    'Edited row: ' +
    row
  );


  console.log(
    'Edited column: ' +
    editedColumn
  );


  /*
   * IMPORTANT SAFETY GUARD
   * ----------------------
   * processPaymentEdit() is a spreadsheet On Edit handler.
   * It must process ONLY edits made on the live EDB
   * Google Forms response sheet.
   *
   * The Admin UI, dashboard and other sheets can also
   * generate edit events. Those edits must never be passed
   * to processPaidBooking(), because those sheets do not
   * contain the response/payment columns.
   *
   * Use the existing trigger-safe response-sheet resolver
   * rather than hard-coding a sheet name.
   */

  let responseSheet;

  try {

    responseSheet =
      getEDBResponseSheet(
        e.source || sheet.getParent()
      );

  } catch (error) {

    console.log(
      'Unable to resolve EDB response sheet. ' +
      'Payment processing skipped. ' +
      error.message
    );

    return;
  }


  if (
    sheet.getSheetId() !==
    responseSheet.getSheetId()
  ) {

    console.log(
      'Non-response sheet edit detected: ' +
      sheet.getName() +
      '. Payment processing skipped.'
    );

    return;
  }


  /*
   * Ignore header row.
   */

  if (row <= 1) {

    console.log(
      'Header row edited. Exiting.'
    );

    return;
  }


  /*
   * Read headers.
   */

  const headers =
    getHeaders(sheet);


  /*
   * Locate columns.
   */

  const paymentStatusColumn =
    findColumn(
      headers,
      'Payment Status'
    );


  const paymentUTRColumn =
    findColumn(
      headers,
      'Payment UTR / Reference'
    );


  const paymentDateColumn =
    findColumn(
      headers,
      'Payment Date'
    );


  console.log(
    'Payment Status column: ' +
    paymentStatusColumn
  );


  console.log(
    'Payment UTR column: ' +
    paymentUTRColumn
  );


  console.log(
    'Payment Date column: ' +
    paymentDateColumn
  );


  /*
   * IMPORTANT:
   *
   * We deliberately DO NOT restrict processing
   * to edits in payment columns.
   *
   * Every edit to a response row checks whether
   * that row is now ready for payment processing.
   *
   * This means the order in which Accounts enters:
   *
   * UTR
   * Payment Date
   * Paid
   *
   * does not matter.
   */


  processPaidBooking(
    sheet,
    row
  );
}


/* ============================================================
   PROCESS ONE ROW
   ============================================================ */

function processPaidBooking(
  sheet,
  row
) {

  console.log(
    '--------------------------------------'
  );


  console.log(
    'Checking row: ' +
    row
  );


  const headers =
    getHeaders(sheet);


  const lastColumn =
    sheet.getLastColumn();


  const values =
    sheet
      .getRange(
        row,
        1,
        1,
        lastColumn
      )
      .getValues()[0];


  /*
   * Locate important columns.
   */

  const bookingIdColumn =
    requireColumn(
      headers,
      'Booking ID'
    );


  const paymentStatusColumn =
    requireColumn(
      headers,
      'Payment Status'
    );


  const paymentUTRColumn =
    requireColumn(
      headers,
      'Payment UTR / Reference'
    );


  const paymentDateColumn =
    requireColumn(
      headers,
      'Payment Date'
    );


  const mediaValidationColumn =
    requireColumn(
      headers,
      'Media Validation'
    );


  const durationColumn =
    requireColumnContaining(
      headers,
      'desired display duration'
    );


  const preferredStartColumn =
    requireColumnContaining(
      headers,
      'preferred start date'
    );


  const requestedStartColumn =
    requireColumn(
      headers,
      'Requested Start Date'
    );


  const requestedEndColumn =
    requireColumn(
      headers,
      'Requested End Date'
    );


  const confirmedStartColumn =
    requireColumn(
      headers,
      'Confirmed Start Date'
    );


  const confirmedEndColumn =
    requireColumn(
      headers,
      'Confirmed End Date'
    );


  const displayStatusColumn =
    requireColumn(
      headers,
      'Display Status'
    );


  /*
   * Read values.
   */

  const bookingId =
    String(
      values[
        bookingIdColumn - 1
      ] || ''
    ).trim();


  const paymentStatus =
    String(
      values[
        paymentStatusColumn - 1
      ] || ''
    ).trim();


  const paymentUTR =
    String(
      values[
        paymentUTRColumn - 1
      ] || ''
    ).trim();


  const paymentDateRaw =
    values[
      paymentDateColumn - 1
    ];


  const mediaValidation =
    String(
      values[
        mediaValidationColumn - 1
      ] || ''
    ).trim();


  const duration =
    String(
      values[
        durationColumn - 1
      ] || ''
    ).trim();


  const preferredStartRaw =
    values[
      preferredStartColumn - 1
    ];


  const currentDisplayStatus =
    String(
      values[
        displayStatusColumn - 1
      ] || ''
    ).trim();


  console.log(
    'Booking ID: ' +
    bookingId
  );


  console.log(
    'Payment Status: [' +
    paymentStatus +
    ']'
  );


  console.log(
    'Payment UTR: [' +
    paymentUTR +
    ']'
  );


  console.log(
    'Payment Date raw: [' +
    paymentDateRaw +
    ']'
  );


  console.log(
    'Media Validation: [' +
    mediaValidation +
    ']'
  );


  console.log(
    'Duration: [' +
    duration +
    ']'
  );


  console.log(
    'Preferred Start raw: [' +
    preferredStartRaw +
    ']'
  );


  /*
   * Is it Paid?
   */

  if (
    paymentStatus.toLowerCase() !==
    B3_CONFIG.PAID_STATUS.toLowerCase()
  ) {

    console.log(
      'Not processing: Payment Status is not Paid.'
    );

    return;
  }


  /*
   * Is UTR present?
   */

  if (!paymentUTR) {

    console.log(
      'WAITING: Payment UTR / Reference is missing.'
    );

    return;
  }


  /*
   * Is payment date present?
   */

  if (!paymentDateRaw) {

    console.log(
      'WAITING: Payment Date is missing.'
    );

    return;
  }


  /*
   * Validate payment date.
   */

  const paymentDate =
    normaliseDate(
      paymentDateRaw
    );


  if (!paymentDate) {

    console.log(
      'WAITING: Payment Date is invalid.'
    );

    return;
  }


  /*
   * Media must have passed validation.
   */

  if (
    mediaValidation.toUpperCase() !==
    'PASS'
  ) {

    console.log(
      'BLOCKED: Media Validation is not PASS.'
    );


    console.log(
      'Media Validation currently = ' +
      mediaValidation
    );


    return;
  }


  /*
   * Don't process an already scheduled booking.
   */

  if (
    currentDisplayStatus.toLowerCase() ===
    B3_CONFIG.DISPLAY_STATUS_SCHEDULED.toLowerCase()
  ) {

    console.log(
      'Booking is already Scheduled.'
    );


    return;
  }


  /*
   * Preferred start date.
   */

  const preferredStart =
    normaliseDate(
      preferredStartRaw
    );


  if (!preferredStart) {

    console.log(
      'WAITING: Preferred Start Date is missing or invalid.'
    );


    return;
  }


  /*
   * Earliest legal start:
   *
   * Payment Date + 1 day.
   */

  const earliestStart =
    addDays(
      paymentDate,
      1
    );


  console.log(
    'Earliest permitted start: ' +
    formatDate(
      earliestStart
    )
  );


  /*
   * Final confirmed start:
   *
   * MAX(
   *   Preferred Start Date,
   *   Payment Date + 1
   * )
   */

  let confirmedStart;


  if (
    preferredStart.getTime() >=
    earliestStart.getTime()
  ) {

    confirmedStart =
      preferredStart;

  } else {

    confirmedStart =
      earliestStart;
  }


  console.log(
    'Confirmed Start: ' +
    formatDate(
      confirmedStart
    )
  );


  /*
   * Calculate end date.
   */

  const confirmedEnd =
    calculateEndDate(
      confirmedStart,
      duration
    );


  if (!confirmedEnd) {

    console.log(
      'ERROR: Cannot calculate End Date for duration: ' +
      duration
    );


    return;
  }


  console.log(
    'Confirmed End: ' +
    formatDate(
      confirmedEnd
    )
  );


  /*
   * Calculate requested end date too.
   */

  const requestedEnd =
    calculateEndDate(
      preferredStart,
      duration
    );


  /*
   * Write requested dates.
   */

  setCell(
    sheet,
    row,
    requestedStartColumn,
    preferredStart
  );


  setCell(
    sheet,
    row,
    requestedEndColumn,
    requestedEnd
  );


  /*
   * Write confirmed dates.
   */

  setCell(
    sheet,
    row,
    confirmedStartColumn,
    confirmedStart
  );


  setCell(
    sheet,
    row,
    confirmedEndColumn,
    confirmedEnd
  );


  /*
   * Ensure payment date is stored
   * as a proper Date value.
   */

  setCell(
    sheet,
    row,
    paymentDateColumn,
    paymentDate
  );


  /*
   * Display status.
   */

  setCell(
    sheet,
    row,
    displayStatusColumn,
    B3_CONFIG.DISPLAY_STATUS_SCHEDULED
  );


  /*
   * Create confirmation message.
   */

  const confirmation =
    createBookingConfirmation(
      sheet,
      row,
      headers,
      values,
      confirmedStart,
      confirmedEnd
    );


  /*
   * Add confirmation column if required.
   */

  const confirmationColumn =
    ensureColumn(
      sheet,
      'Booking Confirmation Text'
    );


  setCell(
    sheet,
    row,
    confirmationColumn,
    confirmation
  );


  /*
   * Add processing timestamp.
   */

  const processedColumn =
    ensureColumn(
      sheet,
      'Payment Processed At'
    );


  setCell(
    sheet,
    row,
    processedColumn,
    new Date()
  );


  /*
   * FINAL LOG.
   */

    /*
   * FINAL LOG.
   */

  console.log(
    '======================================'
  );


  console.log(
    'PAYMENT PROCESSING SUCCESSFUL'
  );


  console.log(
    'Booking ID: ' +
    bookingId
  );


  console.log(
    'Payment Date: ' +
    formatDate(
      paymentDate
    )
  );


  console.log(
    'Confirmed Start: ' +
    formatDate(
      confirmedStart
    )
  );


  console.log(
    'Confirmed End: ' +
    formatDate(
      confirmedEnd
    )
  );


  console.log(
    'Display Status: Scheduled'
  );


  console.log(
    '======================================'
  );


  /* ============================================================
     B6 - AUTOMATIC B3-A \u2192 B3-B CONNECTION
     ============================================================ */

  try {

    console.log(
      'B6: Payment confirmed. Generating WhatsApp links.'
    );


    generateWhatsAppLinksAfterPayment(
      sheet,
      row
    );


    console.log(
      'B6: WhatsApp links generated successfully.'
    );

  }

  catch (err) {

    /*
     * WhatsApp link generation must NOT undo
     * a successful payment confirmation.
     *
     * Therefore the error is logged, but the
     * booking remains confirmed.
     */

    console.error(
      'B6: WhatsApp link generation failed: ' +
      err.message
    );
  }
}


/* ============================================================
   CALCULATE END DATE
   ============================================================ */

function calculateEndDate(
  startDate,
  duration
) {

  if (!startDate) {

    return null;
  }


  const end =
    new Date(
      startDate
    );


  end.setHours(
    0,
    0,
    0,
    0
  );


  if (
    duration === '1 Day'
  ) {

    return end;
  }


  if (
    duration === '1 Week'
  ) {

    end.setDate(
      end.getDate() + 6
    );


    return end;
  }


  if (
    duration === '1 Month'
  ) {

    end.setMonth(
      end.getMonth() + 1
    );


    end.setDate(
      end.getDate() - 1
    );


    return end;
  }


  return null;
}


/* ============================================================
   DATE NORMALISATION
   ============================================================ */

function normaliseDate(
  value
) {

  if (!value) {

    return null;
  }


  const date =
    new Date(
      value
    );


  if (
    isNaN(
      date.getTime()
    )
  ) {

    return null;
  }


  date.setHours(
    0,
    0,
    0,
    0
  );


  return date;
}


/* ============================================================
   ADD DAYS
   ============================================================ */

function addDays(
  date,
  days
) {

  const result =
    new Date(
      date
    );


  result.setDate(
    result.getDate() +
    days
  );


  result.setHours(
    0,
    0,
    0,
    0
  );


  return result;
}


/* ============================================================
   CREATE CONFIRMATION TEXT
   ============================================================ */

function createBookingConfirmation(
  sheet,
  row,
  headers,
  values,
  confirmedStart,
  confirmedEnd
) {

  const bookingId =
    getValue(
      values,
      headers,
      'Booking ID'
    );


  const flatNo =
    getValueContaining(
      values,
      headers,
      'flat no'
    );


  const residentName =
    getValueContaining(
      values,
      headers,
      'resident name'
    );


  const mediaType =
    getValueContaining(
      values,
      headers,
      'what type of material'
    );


  const duration =
    getValueContaining(
      values,
      headers,
      'desired display duration'
    );


  const totalPayable =
    getValue(
      values,
      headers,
      'Total Payable'
    );


  return (

    'IFFG Electronic Display Board \u2013 Booking Confirmation\n\n' +

    'Dear ' +
    residentName +
    ',\n\n' +

    'Your IFFG Electronic Display Board booking has been confirmed.\n\n' +

    'Booking ID: ' +
    bookingId +
    '\n' +

    'Flat No.: ' +
    flatNo +
    '\n' +

    'Material: ' +
    mediaType +
    '\n' +

    'Duration: ' +
    duration +
    '\n' +

    'Display Start: ' +
    formatDate(
      confirmedStart
    ) +
    '\n' +

    'Display End: ' +
    formatDate(
      confirmedEnd
    ) +
    '\n' +

    'Amount Paid: Rs. ' +
    formatMoney(
      totalPayable
    ) +
    '\n\n' +

    'Your media has been scheduled for display during the above period.\n\n' +

    'Thank you,\n' +

    'IFFG-AOA'
  );
}


/* ============================================================
   GET VALUE
   ============================================================ */

function getValue(
  values,
  headers,
  columnName
) {

  const column =
    findColumn(
      headers,
      columnName
    );


  if (!column) {

    return '';
  }


  return values[
    column - 1
  ];
}


/* ============================================================
   GET VALUE CONTAINING TEXT
   ============================================================ */

function getValueContaining(
  values,
  headers,
  searchText
) {

  const column =
    findColumnContaining(
      headers,
      searchText
    );


  if (!column) {

    return '';
  }


  return values[
    column - 1
  ];
}


/* ============================================================
   FORMAT DATE
   ============================================================ */

function formatDate(
  date
) {

  if (!date) {

    return '';
  }


  return Utilities.formatDate(

    date,

    Session.getScriptTimeZone(),

    'dd-MMM-yyyy'
  );
}


/* ============================================================
   FORMAT MONEY
   ============================================================ */

function formatMoney(
  value
) {

  if (
    value === '' ||
    value === null ||
    value === undefined
  ) {

    return '';
  }


  const number =
    Number(
      value
    );


  if (
    isNaN(number)
  ) {

    return String(
      value
    );
  }


  return number.toFixed(2);
}


/* ============================================================
   GET HEADERS
   ============================================================ */

function getHeaders(
  sheet
) {

  const lastColumn =
    Math.max(
      sheet.getLastColumn(),
      1
    );


  return sheet
    .getRange(
      1,
      1,
      1,
      lastColumn
    )
    .getValues()[0];
}


/* ============================================================
   FIND EXACT COLUMN
   ============================================================ */

function findColumn(
  headers,
  name
) {

  const target =
    normaliseHeader(
      name
    );


  for (
    let i = 0;
    i < headers.length;
    i++
  ) {

    if (
      normaliseHeader(
        headers[i]
      ) === target
    ) {

      return i + 1;
    }
  }


  return 0;
}


/* ============================================================
   FIND COLUMN CONTAINING
   ============================================================ */

function findColumnContaining(
  headers,
  searchText
) {

  const target =
    normaliseHeader(
      searchText
    );


  for (
    let i = 0;
    i < headers.length;
    i++
  ) {

    const current =
      normaliseHeader(
        headers[i]
      );


    if (
      current.includes(
        target
      )
    ) {

      return i + 1;
    }
  }


  return 0;
}


/* ============================================================
   REQUIRE COLUMN
   ============================================================ */

function requireColumn(
  headers,
  name
) {

  const column =
    findColumn(
      headers,
      name
    );


  if (!column) {

    throw new Error(
      'Required column not found: ' +
      name
    );
  }


  return column;
}


/* ============================================================
   REQUIRE COLUMN CONTAINING
   ============================================================ */

function requireColumnContaining(
  headers,
  searchText
) {

  const column =
    findColumnContaining(
      headers,
      searchText
    );


  if (!column) {

    throw new Error(
      'Required column containing "' +
      searchText +
      '" not found.'
    );
  }


  return column;
}


/* ============================================================
   ENSURE COLUMN
   ============================================================ */

function ensureColumn(
  sheet,
  columnName
) {

  const headers =
    getHeaders(
      sheet
    );


  const existing =
    findColumn(
      headers,
      columnName
    );


  if (existing) {

    return existing;
  }


  const newColumn =
    sheet.getLastColumn() + 1;


  sheet
    .getRange(
      1,
      newColumn
    )
    .setValue(
      columnName
    );


  return newColumn;
}


/* ============================================================
   SET CELL
   ============================================================ */

function generateWhatsAppLinksForRow(
  sheet,
  row
) {

  console.log(
    '--------------------------------------'
  );

  console.log(
    'B3-B: Generating WhatsApp links'
  );

  console.log(
    'Row: ' + row
  );


  /*
   * Get headers and row data.
   */

  const headers =
    getHeaders(sheet);


  const values =
    sheet
      .getRange(
        row,
        1,
        1,
        sheet.getLastColumn()
      )
      .getValues()[0];


  /* ========================================================
     3. READ BOOKING INFORMATION
     ======================================================== */

  const bookingId =
    getValue(
      values,
      headers,
      'Booking ID'
    );


  const flatNo =
    getValueContaining(
      values,
      headers,
      'flat no'
    );


  const residentName =
    getValueContaining(
      values,
      headers,
      'resident name'
    );


  const residentWhatsApp =
    getValueContaining(
      values,
      headers,
      'whatsapp'
    );


  const mediaType =
    getValueContaining(
      values,
      headers,
      'what type of material'
    );


  const duration =
    getValueContaining(
      values,
      headers,
      'desired display duration'
    );


  const confirmedStart =
    getValue(
      values,
      headers,
      'Confirmed Start Date'
    );


  const confirmedEnd =
    getValue(
      values,
      headers,
      'Confirmed End Date'
    );


  const totalPayable =
    getValue(
      values,
      headers,
      'Total Payable'
    );


  const paymentUTR =
    getValue(
      values,
      headers,
      'Payment UTR / Reference'
    );


  const paymentDate =
    getValue(
      values,
      headers,
      'Payment Date'
    );


  const mediaFileName =
    getValue(
      values,
      headers,
      'Media File Name'
    );


  const mediaSize =
    getValue(
      values,
      headers,
      'Media Size (MB)'
    );


  const mediaDriveLink =
    getValue(
      values,
      headers,
      'Media Drive Link'
    );


  /* ========================================================
     4. VALIDATE FLAT NUMBER
     ======================================================== */

  const flat =
    String(
      flatNo || ''
    ).trim();


  /*
   * Production safety check:
   *
   * Exactly five numeric digits.
   */

  if (
    !/^[0-9]{5}$/.test(flat)
  ) {

    console.log(
      'B3-B BLOCKED: Invalid 5-digit flat number: ' +
      flat
    );

    return;
  }


  /* ========================================================
     5. NORMALIZE RESIDENT WHATSAPP NUMBER
     ======================================================== */

  const residentNumber =
    normalizeIndianWhatsApp(
      residentWhatsApp
    );


  if (!residentNumber) {

    console.log(
      'B3-B BLOCKED: Invalid resident WhatsApp number.'
    );

    return;
  }


  console.log(
    'Resident WhatsApp: ' +
    residentNumber
  );


  /* ========================================================
     6. CREATE RESIDENT MESSAGE
     ======================================================== */

  const residentMessage =

    'IFFG Electronic Display Board \u2013 Booking Confirmation\n\n' +

    'Dear ' +
    residentName +
    ',\n\n' +

    'Your IFFG Electronic Display Board booking has been confirmed.\n\n' +

    'Booking ID: ' +
    bookingId +
    '\n' +

    'Flat No.: ' +
    flat +
    '\n' +

    'Material: ' +
    mediaType +
    '\n' +

    'Duration: ' +
    duration +
    '\n' +

    'Display Start: ' +
    formatDateForWhatsApp(
      confirmedStart
    ) +
    '\n' +

    'Display End: ' +
    formatDateForWhatsApp(
      confirmedEnd
    ) +
    '\n' +

    'Amount Paid: Rs. ' +
    formatMoneyForWhatsApp(
      totalPayable
    ) +

    '\n\n' +

    'Your media has been scheduled for display during the above period.' +

    '\n\n' +

    'Thank you,\n' +

    'IFFG-AOA';


  /* ========================================================
     7. CREATE FM / ACCOUNTS MESSAGE
     ======================================================== */

  const fmMessage =

    'IFFG Electronic Display Board \u2013 Booking Update\n\n' +

    'Booking ID: ' +
    bookingId +
    '\n' +

    'Flat No.: ' +
    flat +
    '\n' +

    'Resident: ' +
    residentName +
    '\n' +

    'Resident WhatsApp: ' +
    residentNumber +
    '\n\n' +

    'Material: ' +
    mediaType +
    '\n' +

    'File: ' +
    mediaFileName +
    '\n' +

    'Media Size: ' +
    mediaSize +
    ' MB\n' +

    'Duration: ' +
    duration +
    '\n' +

    'Confirmed Start: ' +
    formatDateForWhatsApp(
      confirmedStart
    ) +
    '\n' +

    'Confirmed End: ' +
    formatDateForWhatsApp(
      confirmedEnd
    ) +

    '\n\n' +

    'Total Paid: Rs. ' +
    formatMoneyForWhatsApp(
      totalPayable
    ) +
    '\n' +

    'Payment Date: ' +
    formatDateForWhatsApp(
      paymentDate
    ) +
    '\n' +

    'Payment UTR / Reference: ' +
    paymentUTR +

    '\n\n' +

    'Media Drive Link:\n' +
    mediaDriveLink +

    '\n\n' +

    'Display Status: Scheduled';


  /* ========================================================
     8. CREATE WHATSAPP URLS
     ======================================================== */

  const residentLink =
    createWhatsAppLink(
      residentNumber,
      residentMessage
    );


  const whatsappConfig =
  getB6WhatsAppConfiguration(
    sheet
  );

const fmLink =
  createWhatsAppLink(
    whatsappConfig.ACCOUNTS_WHATSAPP,
    fmMessage
  );


  console.log(
    'Resident WhatsApp URL created.'
  );


  console.log(
    'FM/Accounts WhatsApp URL created.'
  );


  /* ========================================================
     9. CREATE / FIND SHEET COLUMNS
     ======================================================== */

  const residentLinkColumn =
    ensureColumn(
      sheet,
      'WhatsApp \u2013 Resident Confirmation'
    );


  const fmLinkColumn =
    ensureColumn(
      sheet,
      'WhatsApp \u2013 FM/Accounts Notification'
    );


  /* ========================================================
     10. WRITE RESIDENT HYPERLINK
     ========================================================

     IMPORTANT:
     We use setFormula(), NOT setValue().

     This makes Google Sheets interpret HYPERLINK()
     as an actual clickable hyperlink.
     ======================================================== */

  const residentFormula =
    '=HYPERLINK("' +
    escapeForFormula(
      residentLink
    ) +
    '","Send to Resident WhatsApp")';


  sheet
    .getRange(
      row,
      residentLinkColumn
    )
    .setFormula(
      residentFormula
    );


  /* ========================================================
     11. WRITE FM / ACCOUNTS HYPERLINK
     ======================================================== */

  const fmFormula =
    '=HYPERLINK("' +
    escapeForFormula(
      fmLink
    ) +
    '","Send to FM/Accounts WhatsApp")';


  sheet
    .getRange(
      row,
      fmLinkColumn
    )
    .setFormula(
      fmFormula
    );


  /* ========================================================
     12. LOG SUCCESS
     ======================================================== */

  console.log(
    'B3-B: Resident WhatsApp link created.'
  );


  console.log(
    'B3-B: FM/Accounts WhatsApp link created.'
  );


  console.log(
    'B3-B completed successfully.'
  );
}


/* ============================================================
   13. NORMALIZE INDIAN WHATSAPP NUMBER
   ============================================================ */

function normalizeIndianWhatsApp(
  value
) {

  let number =
    String(
      value || ''
    ).trim();


  /*
   * Remove spaces, hyphens and brackets.
   */

  number =
    number.replace(
      /[\s\-\(\)]/g,
      ''
    );


  /*
   * 91XXXXXXXXXX
   */

  if (
    /^91[6-9][0-9]{9}$/.test(number)
  ) {

    return number;
  }


  /*
   * +91XXXXXXXXXX
   */

  if (
    /^\+91[6-9][0-9]{9}$/.test(number)
  ) {

    return number.substring(1);
  }


  /*
   * 10-digit Indian mobile number.
   */

  if (
    /^[6-9][0-9]{9}$/.test(number)
  ) {

    return '91' + number;
  }


  return '';
}

/* ============================================================
   B6 - READ WHATSAPP SETTINGS FROM ADMIN CONFIGURATION
   ============================================================ */

function getB6WhatsAppConfiguration(sheet) {

  if (!sheet) {

    throw new Error(
      'B6: Response sheet was not supplied.'
    );
  }


  /*
   * The Admin Configuration sheet belongs to the
   * same spreadsheet as the response sheet.
   *
   * No Spreadsheet ID is hardcoded.
   */

  const spreadsheet =
    sheet.getParent();


  const configSheet =
    spreadsheet.getSheetByName(
      'IFFG EDB - Admin Configuration'
    );


  if (!configSheet) {

    throw new Error(
      'B6: Admin Configuration sheet not found.'
    );
  }


  const lastRow =
    configSheet.getLastRow();


  if (lastRow < 4) {

    throw new Error(
      'B6: Admin Configuration does not contain WhatsApp settings.'
    );
  }


  const data =
    configSheet
      .getRange(
        4,
        1,
        lastRow - 3,
        2
      )
      .getValues();


  let fmOfficeWhatsApp = '';
  let accountsWhatsApp = '';


  for (
    let i = 0;
    i < data.length;
    i++
  ) {

    const setting =
      String(
        data[i][0] || ''
      ).trim();


    const value =
      String(
        data[i][1] || ''
      ).trim();


    if (
      setting ===
      'FM Office WhatsApp'
    ) {

      fmOfficeWhatsApp =
        normalizeIndianWhatsApp(
          value
        );
    }


    if (
      setting ===
      'Accounts WhatsApp'
    ) {

      accountsWhatsApp =
        normalizeIndianWhatsApp(
          value
        );
    }
  }


  if (!fmOfficeWhatsApp) {

    throw new Error(
      'B6: FM Office WhatsApp number is missing or invalid.'
    );
  }


  if (!accountsWhatsApp) {

    throw new Error(
      'B6: Accounts WhatsApp number is missing or invalid.'
    );
  }


  console.log(
    'B6: FM Office WhatsApp = ' +
    fmOfficeWhatsApp
  );


  console.log(
    'B6: Accounts WhatsApp = ' +
    accountsWhatsApp
  );


  return {

    FM_OFFICE_WHATSAPP:
      fmOfficeWhatsApp,

    ACCOUNTS_WHATSAPP:
      accountsWhatsApp

  };
}
/* ============================================================
   14. CREATE WHATSAPP LINK
   ============================================================ */

function createWhatsAppLink(
  phoneNumber,
  message
) {

  return (

    'https://wa.me/' +

    phoneNumber +

    '?text=' +

    encodeURIComponent(
      message
    )

  );
}


/* ============================================================
   15. ESCAPE FORMULA TEXT
   ============================================================ */

function escapeForFormula(
  value
) {

  return String(
    value || ''
  )
    .replace(
      /"/g,
      '""'
    );
}


/* ============================================================
   16. FORMAT DATE FOR WHATSAPP
   ============================================================ */

function formatDateForWhatsApp(
  value
) {

  if (!value) {

    return '';
  }


  const date =
    normaliseDate(
      value
    );


  if (!date) {

    return String(
      value
    );
  }


  return Utilities.formatDate(

    date,

    Session.getScriptTimeZone(),

    'dd-MMM-yyyy'
  );
}


/* ============================================================
   17. FORMAT MONEY FOR WHATSAPP
   ============================================================ */

function formatMoneyForWhatsApp(
  value
) {

  if (
    value === '' ||
    value === null ||
    value === undefined
  ) {

    return '';
  }


  const number =
    Number(
      value
    );


  if (
    isNaN(number)
  ) {

    return String(
      value
    );
  }


  return number.toFixed(2);
}


/* ============================================================
   18. TEST B3-B ON LAST BOOKING
   ============================================================ */

function testB3BForLastBooking() {

  const spreadsheet =
    SpreadsheetApp
      .getActiveSpreadsheet();


  const sheet =
    spreadsheet
      .getActiveSheet();


  const row =
    sheet.getLastRow();


  if (
    row <= 1
  ) {

    throw new Error(
      'No booking rows found.'
    );
  }


  console.log(
    'Testing B3-B on row: ' +
    row
  );


  generateWhatsAppLinksForRow(
    sheet,
    row
  );
}


/* ============================================================
   19. GENERATE LINKS AFTER PAYMENT
   ============================================================

   B3-A can call this after successful payment
   processing.

   We will connect this to B3-A after the link
   test is confirmed.
   ============================================================ */

function generateWhatsAppLinksAfterPayment(
  sheet,
  row
) {

  generateWhatsAppLinksForRow(
    sheet,
    row
  );
}

/***************************************************************
 * IFFG ELECTRONIC DISPLAY BOARD
 *
 * B4 \u2014 ADMIN CONFIGURATION
 *
 * Creates a dedicated configuration sheet for:
 *
 * - FM Office WhatsApp
 * - Accounts WhatsApp
 * - Payment UPI ID
 * - GST Rate
 * - Media rates
 *
 * B4 DOES NOT CHANGE B2 OR B3.
 *
 * It only creates/populates the configuration sheet.
 ***************************************************************/


const B4_CONFIG = {

  SHEET_NAME:
    'IFFG EDB - Admin Configuration'

};


/* ============================================================
   CREATE ADMIN CONFIGURATION
   ============================================================ */

function createIFFGEDBAdminConfiguration() {

  const spreadsheet =
    SpreadsheetApp
      .getActiveSpreadsheet();


  /*
   * Check whether the configuration sheet
   * already exists.
   */

  let sheet =
    spreadsheet.getSheetByName(
      B4_CONFIG.SHEET_NAME
    );


  /*
   * Create it if it doesn't exist.
   */

  if (!sheet) {

    sheet =
      spreadsheet.insertSheet(
        B4_CONFIG.SHEET_NAME
      );

  }


  /*
   * Clear only the configuration sheet.
   *
   * This function is intended to be run during
   * initial setup.
   */

  sheet.clear();


  /* ========================================================
     TITLE
     ======================================================== */

  sheet
    .getRange(
      'A1:D1'
    )
    .merge();


  sheet
    .getRange(
      'A1'
    )
    .setValue(
      'IFFG Electronic Display Board \u2013 Admin Configuration'
    );


  sheet
    .getRange(
      'A1'
    )
    .setFontWeight(
      'bold'
    );


  sheet
    .getRange(
      'A1'
    )
    .setFontSize(
      14
    );


  /* ========================================================
     GENERAL SETTINGS
     ======================================================== */

  sheet
    .getRange(
      'A3:B3'
    )
    .setValues([
      [
        'GENERAL SETTINGS',
        'VALUE'
      ]
    ]);


  sheet
    .getRange(
      'A3:B3'
    )
    .setFontWeight(
      'bold'
    );


  sheet
    .getRange(
      'A4:B8'
    )
    .setValues([

      [
        'FM Office WhatsApp',
        '919391756155'
      ],

      [
        'Accounts WhatsApp',
        '919391756155'
      ],

      [
        'Payment UPI ID',
        ''
      ],

      [
        'GST Rate',
        0.18
      ],

      [
        'Currency',
        'INR'
      ]

    ]);


  /*
   * Format GST as percentage.
   */

  sheet
    .getRange(
      'B7'
    )
    .setNumberFormat(
      '0%'
    );


  /* ========================================================
     MEDIA RATES
     ======================================================== */

  sheet
    .getRange(
      'A10:D10'
    )
    .setValues([

      [
        'MEDIA RATES',
        '1 Day',
        '1 Week',
        '1 Month'
      ]

    ]);


  sheet
    .getRange(
      'A10:D10'
    )
    .setFontWeight(
      'bold'
    );


  /*
   * CURRENT TEST RATES
   *
   * These are intentionally entered as placeholders
   * for the current B2 test configuration.
   *
   * We will confirm/update the actual approved
   * IFFG rates during B5.
   */

  sheet
    .getRange(
      'A11:D13'
    )
    .setValues([

      [
        'Image',
        0,
        0,
        0
      ],

      [
        'PDF',
        0,
        0,
        0
      ],

      [
        'Video',
        0,
        0,
        0
      ]

    ]);


  /*
   * Currency formatting.
   */

  sheet
    .getRange(
      'B11:D13'
    )
    .setNumberFormat(
      '\u20B9#,##0.00'
    );


  /* ========================================================
     ADMIN NOTES
     ======================================================== */

  sheet
    .getRange(
      'A15:D15'
    )
    .merge();


  sheet
    .getRange(
      'A15'
    )
    .setValue(
      'ADMIN NOTES'
    );


  sheet
    .getRange(
      'A15'
    )
    .setFontWeight(
      'bold'
    );


  sheet
    .getRange(
      'A16:D19'
    )
    .merge();


  sheet
    .getRange(
      'A16'
    )
    .setValue(

      '1. Change WhatsApp numbers only in the VALUE column above.\n' +

      '2. Enter the official Payment UPI ID when available.\n' +

      '3. GST Rate is currently set to 18% for testing.\n' +

      '4. Media rates will be connected to B2 during B5.\n' +

      '5. Do not change the setting names in column A.'

    );


  sheet
    .getRange(
      'A16'
    )
    .setWrap(
      true
    );


  /* ========================================================
     FORMATTING
     ======================================================== */

  sheet
    .setFrozenRows(
      3
    );


  sheet
    .setColumnWidth(
      1,
      240
    );


  sheet
    .setColumnWidth(
      2,
      180
    );


  sheet
    .setColumnWidth(
      3,
      130
    );


  sheet
    .setColumnWidth(
      4,
      130
    );


  /*
   * Add borders around configuration areas.
   */

  sheet
    .getRange(
      'A3:B8'
    )
    .setBorder(
      true,
      true,
      true,
      true,
      true,
      true
    );


  sheet
    .getRange(
      'A10:D13'
    )
    .setBorder(
      true,
      true,
      true,
      true,
      true,
      true
    );


  console.log(
    'IFFG EDB Admin Configuration created.'
  );


  console.log(
    'Sheet: ' +
    B4_CONFIG.SHEET_NAME
  );
}




function installPaymentEditTriggerOnce() {
  const form = FormApp.getActiveForm();
  if (!form) throw new Error('Active Google Form not found.');

  const spreadsheetId = form.getDestinationId();
  if (!spreadsheetId) {
    throw new Error('Google Form has no linked response spreadsheet.');
  }

  const ss = SpreadsheetApp.openById(spreadsheetId);

  const exists = ScriptApp.getProjectTriggers().some(
    t =>
      t.getHandlerFunction() === 'processPaymentEdit' &&
      t.getEventType() === ScriptApp.EventType.ON_EDIT
  );

  if (exists) {
    Logger.log('processPaymentEdit trigger already exists.');
    return;
  }

  ScriptApp.newTrigger('processPaymentEdit')
    .forSpreadsheet(ss)
    .onEdit()
    .create();

  Logger.log('processPaymentEdit spreadsheet onEdit trigger CREATED.');
}