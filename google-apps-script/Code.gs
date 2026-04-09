/**
 * Flight Ops Dashboard — Google Apps Script Web App
 *
 * Deploy as: Execute as "Me", Who has access "Anyone"
 * Endpoints:
 *   GET  ?action=getFlights                          → returns all flights as JSON
 *   POST { action: "addFlight",       data: {...} }  → creates flight, returns it
 *   POST { action: "deleteFlight",    id: "..." }    → deletes flight by id
 *   POST { action: "updateClearance", id, cleared }  → sets clearance true/false
 */

const SHEET_NAME = 'Flights';

const COLUMNS = [
  'id',
  'origin',
  'destination',
  'origin_airport',       // ICAO code — e.g. OMAA, OMAL, LLBG
  'destination_airport',  // ICAO code — e.g. LLNV, OMDB
  'flight_type',
  'aircraft_type',
  'payload_type',
  'notes',
  'route',
  'departure_time_utc',
  'arrival_time_utc',
  'return_flight',
  'unload_time',
  'return_departure_utc',
  'return_arrival_utc',
  'passenger_list_link',
  'timezone_origin',
  'timezone_destination',
  'created_at',
  'clearance',   // 'true' | 'false' — landing clearance approved
];

// ─── HTTP handlers ────────────────────────────────────────────────────────────

function doGet(e) {
  try {
    const flights = getAllFlights();
    return ok({ data: flights });
  } catch (err) {
    return fail(err.message);
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);

    if (body.action === 'addFlight') {
      const flight = createFlight(body.data);
      return ok({ data: flight });
    }

    if (body.action === 'deleteFlight') {
      removeFlight(body.id);
      return ok({});
    }

    if (body.action === 'updateClearance') {
      setFlightClearance(body.id, body.cleared);
      return ok({});
    }

    if (body.action === 'updateFlightTime') {
      updateFlightTime(body.id, body.departure_time_utc);
      return ok({});
    }

    return fail('Unknown action: ' + body.action);
  } catch (err) {
    return fail(err.message);
  }
}

// ─── Data functions ───────────────────────────────────────────────────────────

function getAllFlights() {
  const sheet = getOrCreateSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  const values = sheet.getRange(2, 1, lastRow - 1, COLUMNS.length).getValues();

  return values
    .filter(row => row[0] !== '' && row[0] !== null)
    .map(row => {
      const obj = {};
      COLUMNS.forEach((col, i) => {
        const v = row[i];
        obj[col] = (v !== undefined && v !== null) ? String(v) : '';
      });
      return obj;
    });
}

function createFlight(data) {
  const sheet = getOrCreateSheet();

  // ── Auto-computed fields ──────────────────────────────────────────────────
  const id        = String(Date.now());
  const now       = new Date().toISOString();
  const durationMs = (data.route === 'CYPRUS') ? 6 * 3600000 : 5 * 3600000;

  const depTime = new Date(data.departure_time_utc);
  const arrTime = new Date(depTime.getTime() + durationMs);

  const isReturn = data.return_flight === true || data.return_flight === 'true';
  let returnDepISO = '';
  let returnArrISO = '';

  if (isReturn) {
    const unloadMs = (data.unload_time === '2h') ? 7200000 : 3600000;
    const retDep   = new Date(arrTime.getTime() + unloadMs);
    const retArr   = new Date(retDep.getTime() + durationMs);
    returnDepISO   = retDep.toISOString();
    returnArrISO   = retArr.toISOString();
  }

  const flightType  = (data.origin === 'UAE') ? 'UAE' : 'IL';
  const tzOrigin    = (data.origin === 'UAE') ? 'Asia/Dubai' : 'Asia/Jerusalem';
  const tzDest      = (data.destination === 'UAE') ? 'Asia/Dubai' : 'Asia/Jerusalem';

  const row = [
    id,
    data.origin               || '',
    data.destination          || '',
    data.origin_airport       || '',
    data.destination_airport  || '',
    flightType,
    data.aircraft_type        || '',
    data.payload_type         || 'CARGO',
    data.notes                || '',
    data.route                || 'SELERY',
    depTime.toISOString(),
    arrTime.toISOString(),
    isReturn ? 'true' : 'false',
    data.unload_time          || '1h',
    returnDepISO,
    returnArrISO,
    data.passenger_list_link  || '',
    tzOrigin,
    tzDest,
    now,
    'false',  // clearance — starts as not cleared
  ];

  sheet.appendRow(row);

  // Return the newly created flight object
  const flight = {};
  COLUMNS.forEach((col, i) => {
    flight[col] = (row[i] !== undefined && row[i] !== null) ? String(row[i]) : '';
  });
  return flight;
}

function updateFlightTime(id, newDepartureUTC) {
  const sheet   = getOrCreateSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;

  const data = sheet.getRange(2, 1, lastRow - 1, COLUMNS.length).getValues();

  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]) !== String(id)) continue;

    const rowNum    = i + 2;
    const row       = data[i];
    const route     = row[COLUMNS.indexOf('route')];
    const isReturn  = row[COLUMNS.indexOf('return_flight')] === 'true';
    const unloadTime = row[COLUMNS.indexOf('unload_time')];

    const durationMs = (route === 'CYPRUS') ? 6 * 3600000 : 5 * 3600000;
    const depTime    = new Date(newDepartureUTC);
    const arrTime    = new Date(depTime.getTime() + durationMs);

    sheet.getRange(rowNum, COLUMNS.indexOf('departure_time_utc') + 1).setValue(depTime.toISOString());
    sheet.getRange(rowNum, COLUMNS.indexOf('arrival_time_utc')   + 1).setValue(arrTime.toISOString());

    if (isReturn) {
      const unloadMs = (unloadTime === '2h') ? 7200000 : 3600000;
      const retDep   = new Date(arrTime.getTime() + unloadMs);
      const retArr   = new Date(retDep.getTime() + durationMs);
      sheet.getRange(rowNum, COLUMNS.indexOf('return_departure_utc') + 1).setValue(retDep.toISOString());
      sheet.getRange(rowNum, COLUMNS.indexOf('return_arrival_utc')   + 1).setValue(retArr.toISOString());
    }
    return;
  }
}

function setFlightClearance(id, cleared) {
  const sheet   = getOrCreateSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;

  const idCol = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  const clearanceColIndex = COLUMNS.indexOf('clearance') + 1; // 1-based

  for (let i = 0; i < idCol.length; i++) {
    if (String(idCol[i][0]) === String(id)) {
      sheet.getRange(i + 2, clearanceColIndex).setValue(cleared ? 'true' : 'false');
      return;
    }
  }
}

function removeFlight(id) {
  const sheet   = getOrCreateSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;

  const idCol = sheet.getRange(2, 1, lastRow - 1, 1).getValues();

  for (let i = 0; i < idCol.length; i++) {
    if (String(idCol[i][0]) === String(id)) {
      sheet.deleteRow(i + 2);  // +2 because data starts at row 2
      return;
    }
  }
}

// ─── Sheet bootstrap ──────────────────────────────────────────────────────────

function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    _applySheetStructure(sheet);
  }
  return sheet;
}

/**
 * Run once from the Apps Script editor → sets up / resets the full sheet.
 * Safe to re-run — only reformats, never deletes data rows.
 */
function initSheet() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  let   sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  _applySheetStructure(sheet);
  SpreadsheetApp.getUi().alert('✅ "Flights" sheet ready!');
}

function _applySheetStructure(sheet) {
  const N = COLUMNS.length;

  // ── 1. Header row ────────────────────────────────────────────────────────
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(COLUMNS);
  } else {
    sheet.getRange(1, 1, 1, N).setValues([COLUMNS]);
  }

  const hdr = sheet.getRange(1, 1, 1, N);
  hdr.setBackground('#0f172a');        // slate-900
  hdr.setFontColor('#38bdf8');         // sky-400
  hdr.setFontWeight('bold');
  hdr.setFontSize(10);
  hdr.setFontFamily('Roboto Mono');
  hdr.setVerticalAlignment('middle');
  hdr.setHorizontalAlignment('center');
  hdr.setWrap(false);
  sheet.setFrozenRows(1);
  sheet.setRowHeight(1, 36);

  // ── 2. Column widths (by COLUMNS index) ──────────────────────────────────
  const widths = {
    id:                    160,
    origin:                 80,
    destination:            80,
    flight_type:            80,
    aircraft_type:         150,
    payload_type:          100,
    notes:                 220,
    route:                  90,
    departure_time_utc:    185,
    arrival_time_utc:      185,
    return_flight:          95,
    unload_time:            90,
    return_departure_utc:  185,
    return_arrival_utc:    185,
    passenger_list_link:   220,
    timezone_origin:       160,
    timezone_destination:  160,
    created_at:            185,
    clearance:              90,
  };
  COLUMNS.forEach((col, i) => {
    if (widths[col]) sheet.setColumnWidth(i + 1, widths[col]);
  });

  // ── 3. Data-row formatting (rows 2 → 1000) ────────────────────────────────
  const dataRange = sheet.getRange(2, 1, 999, N);
  dataRange.setFontSize(10);
  dataRange.setFontFamily('Roboto Mono');
  dataRange.setVerticalAlignment('middle');
  dataRange.setHorizontalAlignment('left');

  // Alternating row colours (light grey / white)
  for (let r = 2; r <= 200; r += 2) {
    sheet.getRange(r, 1, 1, N).setBackground('#f8fafc');   // slate-50
  }

  // ── 4. Data validation ────────────────────────────────────────────────────
  const col = name => COLUMNS.indexOf(name) + 1;  // 1-based

  // origin / destination — dropdown
  const locationRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['UAE', 'IL'], true).build();
  sheet.getRange(2, col('origin'),      999, 1).setDataValidation(locationRule);
  sheet.getRange(2, col('destination'), 999, 1).setDataValidation(locationRule);
  sheet.getRange(2, col('flight_type'), 999, 1).setDataValidation(locationRule);

  // airport codes — dropdown
  const uaeAirportRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['OMAA', 'OMDB', 'OMAL', 'OMAD', 'LLBG', 'LLNV'], true).build();
  sheet.getRange(2, col('origin_airport'),      999, 1).setDataValidation(uaeAirportRule);
  sheet.getRange(2, col('destination_airport'), 999, 1).setDataValidation(uaeAirportRule);

  // payload_type — dropdown
  const payloadRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['CARGO', 'PAX'], true).build();
  sheet.getRange(2, col('payload_type'), 999, 1).setDataValidation(payloadRule);

  // route — dropdown
  const routeRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['SELERY', 'CYPRUS'], true).build();
  sheet.getRange(2, col('route'), 999, 1).setDataValidation(routeRule);

  // return_flight / clearance — true/false dropdown
  const boolRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['true', 'false'], true).build();
  sheet.getRange(2, col('return_flight'), 999, 1).setDataValidation(boolRule);
  sheet.getRange(2, col('clearance'),     999, 1).setDataValidation(boolRule);

  // unload_time — dropdown
  const unloadRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['1h', '2h'], true).build();
  sheet.getRange(2, col('unload_time'), 999, 1).setDataValidation(unloadRule);

  // timezones — dropdown
  const tzRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Asia/Dubai', 'Asia/Jerusalem'], true).build();
  sheet.getRange(2, col('timezone_origin'),      999, 1).setDataValidation(tzRule);
  sheet.getRange(2, col('timezone_destination'), 999, 1).setDataValidation(tzRule);

  // ── 5. Conditional formatting ─────────────────────────────────────────────
  const rules = sheet.getConditionalFormatRules();
  const newRules = [];

  // clearance = true  → green
  newRules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('true')
    .setBackground('#dcfce7').setFontColor('#166534')
    .setRanges([sheet.getRange(2, col('clearance'), 999, 1)])
    .build());

  // clearance = false → red-tint
  newRules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('false')
    .setBackground('#fee2e2').setFontColor('#991b1b')
    .setRanges([sheet.getRange(2, col('clearance'), 999, 1)])
    .build());

  // return_flight = true → blue-tint
  newRules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('true')
    .setBackground('#dbeafe').setFontColor('#1e40af')
    .setRanges([sheet.getRange(2, col('return_flight'), 999, 1)])
    .build());

  // payload_type = PAX → purple-tint
  newRules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('PAX')
    .setBackground('#ede9fe').setFontColor('#5b21b6')
    .setRanges([sheet.getRange(2, col('payload_type'), 999, 1)])
    .build());

  // route = CYPRUS → amber
  newRules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('CYPRUS')
    .setBackground('#fef9c3').setFontColor('#854d0e')
    .setRanges([sheet.getRange(2, col('route'), 999, 1)])
    .build());

  sheet.setConditionalFormatRules([...rules, ...newRules]);

  // ── 6. Column notes (hover tooltips on header) ────────────────────────────
  const notes = {
    id:                   'Auto-generated timestamp ID (ms since epoch)',
    origin:               'UAE or IL',
    destination:          'UAE or IL',
    flight_type:          'UAE = departing UAE, IL = departing Israel',
    aircraft_type:        'e.g. Boeing 767, Airbus A320',
    payload_type:         'CARGO or PAX (passengers)',
    notes:                'Free text — shown on the flight card',
    route:                'SELERY (5h) or CYPRUS (6h)',
    departure_time_utc:   'ISO 8601 — UTC departure time',
    arrival_time_utc:     'Auto-computed from departure + route duration',
    return_flight:        'true if a return leg exists',
    unload_time:          '1h or 2h ground time before return departs',
    return_departure_utc: 'Auto-computed: arrival + unload_time',
    return_arrival_utc:   'Auto-computed: return_departure + duration',
    passenger_list_link:  'Google Drive / Sheets URL for pax manifest',
    timezone_origin:      'Asia/Dubai or Asia/Jerusalem',
    timezone_destination: 'Asia/Dubai or Asia/Jerusalem',
    created_at:           'ISO 8601 — row creation timestamp',
    clearance:            'true = landing clearance approved',
  };
  COLUMNS.forEach((col, i) => {
    if (notes[col]) sheet.getRange(1, i + 1).setNote(notes[col]);
  });
}

// ─── Response helpers ─────────────────────────────────────────────────────────

function ok(payload) {
  return ContentService
    .createTextOutput(JSON.stringify({ success: true, ...payload }))
    .setMimeType(ContentService.MimeType.JSON);
}

function fail(message) {
  return ContentService
    .createTextOutput(JSON.stringify({ success: false, error: message }))
    .setMimeType(ContentService.MimeType.JSON);
}
