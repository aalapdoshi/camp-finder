/**
 * Google Sheets → Airtable Sync Script
 * 
 * This script syncs camp data from Google Sheets to Airtable daily.
 * 
 * SETUP INSTRUCTIONS:
 * 1. Open your Google Sheet: https://docs.google.com/spreadsheets/d/1FfiziYg5Ow-BlHqFRSWl2d3I-Uh7iy8W53lmpLSVfEU/edit
 * 2. Go to Extensions → Apps Script
 * 3. Paste this entire file into the script editor
 * 4. Update the configuration constants below
 * 5. Save the script
 * 6. Run syncCampsToAirtable() manually to test
 * 7. Set up a daily trigger (see setupDailyTrigger() function)
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const AIRTABLE_API_KEY = 'YOUR_AIRTABLE_API_KEY_HERE';
const AIRTABLE_BASE_ID = 'YOUR_AIRTABLE_BASE_ID_HERE';
const AIRTABLE_TABLE_NAME = 'Camps';
const AIRTABLE_API_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`;

const SUMMARY_EMAIL = 'aalap1.doshi@gmail.com';

// Google Sheet column indices (0-based, row 3 is header)
const COL_REGISTRATION_STATUS = 0;  // Column A
const COL_REGISTRATION_DETAILS = 1;  // Column B
const COL_CAMP_NAME = 2;            // Column C
const COL_AGES = 3;                  // Column D
const COL_ADDRESS = 4;               // Column E
const COL_COST = 5;                  // Column F
const COL_DAYS_TIMES = 6;            // Column G
const COL_BEFORE_AFTER_CARE = 7;    // Column H

const DATA_START_ROW = 4; // Row 4 is first data row (row 3 is header, rows 1-2 are metadata)

// Cities to detect in addresses
const CITIES = ['Ann Arbor', 'Saline', 'Ypsilanti', 'Dexter', 'Chelsea', 'Plymouth', 
                'Canton', 'Pinckney', 'Howell', 'Livonia', 'Novi', 'Northville', 
                'Whitmore Lake', 'Milan', 'South Lyon', 'Webberville', 'Plainwell', 
                'Brooklyn', 'Linden', 'Detroit'];

// ============================================================================
// MAIN SYNC FUNCTION
// ============================================================================

/**
 * Main sync function - call this manually or via trigger
 */
function syncCampsToAirtable() {
  const startTime = new Date();
  const stats = {
    processed: 0,
    updated: 0,
    created: 0,
    deleted: 0,
    errors: [],
    warnings: [],
    skipped: []
  };

  try {
    // Step 1: Fetch data from Google Sheet
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const sheetData = sheet.getDataRange().getValues();
    const sheetCamps = extractCampsFromSheet(sheetData, stats);
    
    // Step 2: Fetch existing camps from Airtable
    const airtableCamps = fetchAllAirtableCamps();
    const airtableCampMap = new Map(); // Camp Name → Record ID
    const airtableCampData = new Map(); // Camp Name → Full Record
    
    airtableCamps.forEach(camp => {
      const name = camp.fields['Camp Name'];
      if (name) {
        airtableCampMap.set(name, camp.id);
        airtableCampData.set(name, camp);
      }
    });
    
    // Step 3: Process each sheet row
    const campsToUpdate = [];
    const campsToCreate = [];
    const sheetCampNames = new Set();
    
    sheetCamps.forEach((campData, index) => {
      const campName = campData['Camp Name'];
      if (!campName || campName.trim() === '') {
        stats.skipped.push({ row: index + DATA_START_ROW, reason: 'Empty camp name' });
        return;
      }
      
      sheetCampNames.add(campName);
      stats.processed++;
      
      try {
        const airtableFields = transformToAirtableFields(campData, airtableCampData.get(campName), stats, index + DATA_START_ROW);
        
        if (airtableCampMap.has(campName)) {
          // Update existing record
          campsToUpdate.push({
            id: airtableCampMap.get(campName),
            fields: airtableFields
          });
          stats.updated++;
        } else {
          // Create new record
          campsToCreate.push({ fields: airtableFields });
          stats.created++;
        }
      } catch (error) {
        stats.errors.push({
          row: index + DATA_START_ROW,
          camp: campName,
          error: error.toString()
        });
      }
    });
    
    // Step 4: Batch update/create records
    if (campsToUpdate.length > 0) {
      batchUpdateAirtableCamps(campsToUpdate, stats);
    }
    
    if (campsToCreate.length > 0) {
      batchCreateAirtableCamps(campsToCreate, stats);
    }
    
    // Step 5: Delete camps that exist in Airtable but not in sheet
    const campsToDelete = [];
    airtableCampMap.forEach((recordId, campName) => {
      if (!sheetCampNames.has(campName)) {
        campsToDelete.push(recordId);
        stats.deleted++;
      }
    });
    
    if (campsToDelete.length > 0) {
      batchDeleteAirtableCamps(campsToDelete, stats);
    }
    
    // Step 6: Send email summary
    const endTime = new Date();
    const duration = Math.round((endTime - startTime) / 1000);
    sendEmailSummary(stats, duration);
    
    Logger.log(`Sync completed: ${stats.processed} processed, ${stats.updated} updated, ${stats.created} created, ${stats.deleted} deleted, ${stats.errors.length} errors`);
    
  } catch (error) {
    Logger.log(`Fatal error: ${error.toString()}`);
    stats.errors.push({ fatal: true, error: error.toString() });
    sendEmailSummary(stats, 0);
    throw error;
  }
}

// ============================================================================
// DATA EXTRACTION FROM GOOGLE SHEET
// ============================================================================

/**
 * Extract camp data from sheet rows
 */
function extractCampsFromSheet(sheetData, stats) {
  const camps = [];
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  // Start from row 4 (index 3) - skip header and metadata rows
  for (let i = DATA_START_ROW - 1; i < sheetData.length; i++) {
    const row = sheetData[i];
    
    // Skip empty rows
    if (!row[COL_CAMP_NAME] || row[COL_CAMP_NAME].toString().trim() === '') {
      continue;
    }
    
    // Get display values to handle dates/numbers properly
    const rowNum = i + 1;
    const agesDisplay = sheet.getRange(rowNum, COL_AGES + 1).getDisplayValue();
    const costDisplay = sheet.getRange(rowNum, COL_COST + 1).getDisplayValue();
    
    const camp = {
      'Registration Status': row[COL_REGISTRATION_STATUS] || '',
      'Registration Details': row[COL_REGISTRATION_DETAILS] || '',
      'Camp Name': row[COL_CAMP_NAME].toString().trim(),
      'Ages': agesDisplay || '',
      'Address': row[COL_ADDRESS] || '',
      'Cost': costDisplay || '',
      'Days/Times': row[COL_DAYS_TIMES] || '',
      'Before / After Care': row[COL_BEFORE_AFTER_CARE] || ''
    };
    
    // Extract URL from Camp Name hyperlink if present
    try {
      const campNameCell = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet().getRange(i + 1, COL_CAMP_NAME + 1);
      const richText = campNameCell.getRichTextValue();
      const url = richText.getLinkUrl();
      if (url) {
        camp['Camp Name URL'] = url;
      }
    } catch (e) {
      // No hyperlink or error reading it
    }
    
    camps.push(camp);
  }
  
  return camps;
}

// ============================================================================
// DATA TRANSFORMATION
// ============================================================================

/**
 * Transform sheet data to Airtable fields format
 */
function transformToAirtableFields(sheetCamp, existingAirtableCamp, stats, rowNum) {
  const fields = {};
  
  // Camp Name (required)
  fields['Camp Name'] = sheetCamp['Camp Name'];
  
  // Extract URL from Camp Name hyperlink
  // Note: Only 'Website' field exists in Airtable, not 'Registration URL'
  if (sheetCamp['Camp Name URL']) {
    fields['Website'] = sheetCamp['Camp Name URL'];
  } else if (existingAirtableCamp && existingAirtableCamp.fields['Website']) {
    // Preserve existing Website if no new URL in sheet
    fields['Website'] = existingAirtableCamp.fields['Website'];
  }
  
  // Parse Ages
  const ageData = parseAges(sheetCamp['Ages']);
  if (ageData.min !== null) fields['Age Min'] = ageData.min;
  if (ageData.max !== null) fields['Age Max'] = ageData.max;
  // Only warn if there's actual content that we couldn't parse (not empty or date/grade formats)
  if (!ageData.min && !ageData.max && sheetCamp['Ages'] && sheetCamp['Ages'].toString().trim() !== '') {
    const ageStr = sheetCamp['Ages'].toString().trim();
    // Don't warn for dates, grades, or "varies" - these are expected
    if (!ageStr.match(/(Mon|Tue|Wed|Thu|Fri|Sat|Sun|GMT|K|grade|Grade|th|st|nd|rd|Y5|PreK|Preschool|entering|Incoming|varies|tbd)/i)) {
      stats.warnings.push({ row: rowNum, camp: sheetCamp['Camp Name'], warning: `Could not parse age: "${ageStr}"` });
    }
  }
  
  // Parse Address → City
  const addressData = parseAddress(sheetCamp['Address']);
  if (addressData.city) fields['City'] = addressData.city;
  // Note: Location Name field doesn't exist in Airtable, so we skip it
  
  // Parse Cost
  const costData = parseCost(sheetCamp['Cost']);
  if (costData.perWeek !== null) fields['Cost Per Week'] = costData.perWeek;
  if (costData.display) fields['Cost Display'] = costData.display;
  // Only warn if there's actual content that we couldn't parse (not empty or expected text)
  if (!costData.perWeek && costData.display && sheetCamp['Cost'] && sheetCamp['Cost'].toString().trim() !== '') {
    const costStr = sheetCamp['Cost'].toString().trim().toLowerCase();
    // Don't warn for expected text values
    if (!costStr.match(/(tbd|free|varies|see website|dates and rates|click here)/i)) {
      stats.warnings.push({ row: rowNum, camp: sheetCamp['Camp Name'], warning: `Could not parse cost: "${sheetCamp['Cost']}"` });
    }
  }
  
  // Parse After Care
  fields['Has After Care'] = parseAfterCare(sheetCamp['Before / After Care']);
  
  // Combine Description
  fields['Description'] = combineDescription(
    sheetCamp['Registration Details'],
    sheetCamp['Days/Times'],
    sheetCamp['Before / After Care']
  );
  
  // Preserve fields not in sheet
  if (existingAirtableCamp) {
    // Preserve Primary Category if it exists
    if (existingAirtableCamp.fields['Primary Category']) {
      fields['Primary Category'] = existingAirtableCamp.fields['Primary Category'];
    }
    // Preserve Activities if they exist
    if (existingAirtableCamp.fields['Activities'] && Array.isArray(existingAirtableCamp.fields['Activities'])) {
      fields['Activities'] = existingAirtableCamp.fields['Activities'];
    }
  }
  
  return fields;
}

/**
 * Parse age range string to min/max
 */
function parseAges(ageStr) {
  if (!ageStr) return { min: null, max: null };
  
  const str = ageStr.toString().trim();
  
  // Skip if it looks like a date (contains day names or "GMT")
  if (str.match(/(Mon|Tue|Wed|Thu|Fri|Sat|Sun|GMT)/i)) {
    return { min: null, max: null };
  }
  
  // Pattern: "5-13", "11-17", "Ages 6-18"
  const rangeMatch = str.match(/(\d+)\s*-\s*(\d+)/);
  if (rangeMatch) {
    return {
      min: parseInt(rangeMatch[1]),
      max: parseInt(rangeMatch[2])
    };
  }
  
  // Pattern: "8+", "4+"
  const plusMatch = str.match(/(\d+)\+/);
  if (plusMatch) {
    return {
      min: parseInt(plusMatch[1]),
      max: null // Or set to 18 as max?
    };
  }
  
  // Pattern: "K-6th grade" or similar grade-based formats - skip
  if (str.match(/(K|grade|Grade|th|st|nd|rd|Y5|PreK|Preschool|entering|Incoming)/i)) {
    return { min: null, max: null };
  }
  
  // Pattern: "Varies" or empty - skip
  if (str.match(/^(varies|tbd|see website|n\/a)?$/i)) {
    return { min: null, max: null };
  }
  
  return { min: null, max: null };
}

/**
 * Parse address to extract city and full address
 */
function parseAddress(addressStr) {
  if (!addressStr) return { city: null, fullAddress: null };
  
  const str = addressStr.toString().trim();
  let city = null;
  
  // Check for city names in address
  for (const cityName of CITIES) {
    if (str.toLowerCase().includes(cityName.toLowerCase())) {
      city = cityName;
      break;
    }
  }
  
  return {
    city: city,
    fullAddress: str
  };
}

/**
 * Parse cost string to extract numeric value and display string
 */
function parseCost(costStr) {
  if (!costStr) return { perWeek: null, display: null };
  
  const str = costStr.toString().trim();
  
  // Skip if it's text-only (TBD, FREE, "Dates and rates click here", etc.)
  if (str.match(/^(tbd|free|varies|see website|dates and rates)/i)) {
    return {
      perWeek: null,
      display: str
    };
  }
  
  // Pattern: "$600/week", "$300 per week"
  const weeklyMatch = str.match(/\$(\d+(?:\.\d+)?)\s*(?:\/|\s*per\s*)week/i);
  if (weeklyMatch) {
    return {
      perWeek: parseFloat(weeklyMatch[1]),
      display: str
    };
  }
  
  // Pattern: "$59/day or $275/week" - prefer weekly
  const multiMatch = str.match(/\$(\d+(?:\.\d+)?)\s*(?:\/|\s*per\s*)week/i);
  if (multiMatch) {
    return {
      perWeek: parseFloat(multiMatch[1]),
      display: str
    };
  }
  
  // Pattern: "$199", "$375" (standalone with $)
  const standaloneMatch = str.match(/\$(\d+(?:\.\d+)?)/);
  if (standaloneMatch) {
    return {
      perWeek: parseFloat(standaloneMatch[1]),
      display: str
    };
  }
  
  // Pattern: "199", "375" (standalone number without $) - assume weekly
  const numberOnlyMatch = str.match(/^(\d+(?:\.\d+)?)$/);
  if (numberOnlyMatch) {
    const num = parseFloat(numberOnlyMatch[1]);
    return {
      perWeek: num,
      display: `$${num}`
    };
  }
  
  // Can't parse, return display string only
  return {
    perWeek: null,
    display: str
  };
}

/**
 * Parse after care text to boolean
 */
function parseAfterCare(afterCareStr) {
  if (!afterCareStr) return false;
  
  const str = afterCareStr.toString().trim().toLowerCase();
  
  if (str === '' || str === 'n/a' || str === 'no' || str === 'none') {
    return false;
  }
  
  // Any other text means after care is available
  return true;
}

/**
 * Combine description fields
 */
function combineDescription(registrationDetails, daysTimes, afterCare) {
  const parts = [];
  
  if (registrationDetails && registrationDetails.toString().trim()) {
    parts.push(registrationDetails.toString().trim());
  }
  
  if (daysTimes && daysTimes.toString().trim()) {
    parts.push(`Schedule: ${daysTimes.toString().trim()}`);
  }
  
  if (afterCare && afterCare.toString().trim() && afterCare.toString().toLowerCase() !== 'n/a' && afterCare.toString().toLowerCase() !== 'no') {
    parts.push(`After Care: ${afterCare.toString().trim()}`);
  }
  
  return parts.join('\n\n');
}

// ============================================================================
// AIRTABLE API FUNCTIONS
// ============================================================================

/**
 * Fetch all camps from Airtable
 */
function fetchAllAirtableCamps() {
  const camps = [];
  let offset = null;
  
  do {
    const url = offset 
      ? `${AIRTABLE_API_URL}?offset=${offset}`
      : AIRTABLE_API_URL;
    
    const response = UrlFetchApp.fetch(url, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.getResponseCode() !== 200) {
      throw new Error(`Airtable API error: ${response.getResponseCode()} - ${response.getContentText()}`);
    }
    
    const data = JSON.parse(response.getContentText());
    camps.push(...data.records);
    offset = data.offset;
    
    // Rate limiting: wait 200ms between requests
    Utilities.sleep(200);
    
  } while (offset);
  
  return camps;
}

/**
 * Batch update camps in Airtable (max 10 per batch)
 */
function batchUpdateAirtableCamps(camps, stats) {
  const batchSize = 10;
  
  for (let i = 0; i < camps.length; i += batchSize) {
    const batch = camps.slice(i, i + batchSize);
    
    try {
      const response = UrlFetchApp.fetch(AIRTABLE_API_URL, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        payload: JSON.stringify({ records: batch })
      });
      
      if (response.getResponseCode() !== 200) {
        const errorData = JSON.parse(response.getContentText());
        batch.forEach(camp => {
          stats.errors.push({
            camp: camp.fields['Camp Name'] || 'Unknown',
            error: `Update failed: ${JSON.stringify(errorData)}`
          });
        });
      }
      
      // Rate limiting
      Utilities.sleep(200);
      
    } catch (error) {
      batch.forEach(camp => {
        stats.errors.push({
          camp: camp.fields['Camp Name'] || 'Unknown',
          error: error.toString()
        });
      });
    }
  }
}

/**
 * Batch create camps in Airtable (max 10 per batch)
 */
function batchCreateAirtableCamps(camps, stats) {
  const batchSize = 10;
  
  for (let i = 0; i < camps.length; i += batchSize) {
    const batch = camps.slice(i, i + batchSize);
    
    try {
      const response = UrlFetchApp.fetch(AIRTABLE_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        payload: JSON.stringify({ records: batch })
      });
      
      if (response.getResponseCode() !== 200) {
        const errorData = JSON.parse(response.getContentText());
        batch.forEach(camp => {
          stats.errors.push({
            camp: camp.fields['Camp Name'] || 'Unknown',
            error: `Create failed: ${JSON.stringify(errorData)}`
          });
        });
      }
      
      // Rate limiting
      Utilities.sleep(200);
      
    } catch (error) {
      batch.forEach(camp => {
        stats.errors.push({
          camp: camp.fields['Camp Name'] || 'Unknown',
          error: error.toString()
        });
      });
    }
  }
}

/**
 * Batch delete camps from Airtable (max 10 per batch)
 */
function batchDeleteAirtableCamps(recordIds, stats) {
  const batchSize = 10;
  
  for (let i = 0; i < recordIds.length; i += batchSize) {
    const batch = recordIds.slice(i, i + batchSize);
    
    // Airtable delete requires query params
    const idsParam = batch.map(id => `records[]=${id}`).join('&');
    const url = `${AIRTABLE_API_URL}?${idsParam}`;
    
    try {
      const response = UrlFetchApp.fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.getResponseCode() !== 200) {
        const errorData = JSON.parse(response.getContentText());
        stats.errors.push({
          error: `Delete failed: ${JSON.stringify(errorData)}`
        });
      }
      
      // Rate limiting
      Utilities.sleep(200);
      
    } catch (error) {
      stats.errors.push({
        error: `Delete error: ${error.toString()}`
      });
    }
  }
}

// ============================================================================
// EMAIL SUMMARY
// ============================================================================

/**
 * Send email summary after sync
 */
function sendEmailSummary(stats, durationSeconds) {
  const subject = `CampFinder Sync Summary - ${new Date().toLocaleDateString()}`;
  
  let body = `<h2>CampFinder Airtable Sync Summary</h2>`;
  body += `<p><strong>Sync Date:</strong> ${new Date().toLocaleString()}</p>`;
  body += `<p><strong>Duration:</strong> ${durationSeconds} seconds</p>`;
  
  body += `<h3>Summary</h3>`;
  body += `<ul>`;
  body += `<li><strong>Rows Processed:</strong> ${stats.processed}</li>`;
  body += `<li><strong>Records Updated:</strong> ${stats.updated}</li>`;
  body += `<li><strong>Records Created:</strong> ${stats.created}</li>`;
  body += `<li><strong>Records Deleted:</strong> ${stats.deleted}</li>`;
  body += `<li><strong>Errors:</strong> ${stats.errors.length}</li>`;
  body += `<li><strong>Warnings:</strong> ${stats.warnings.length}</li>`;
  body += `<li><strong>Skipped:</strong> ${stats.skipped.length}</li>`;
  body += `</ul>`;
  
  if (stats.errors.length > 0) {
    body += `<h3>Errors</h3>`;
    body += `<ul>`;
    stats.errors.forEach(err => {
      body += `<li><strong>Row ${err.row || 'N/A'}</strong> - ${err.camp || 'Unknown'}: ${err.error}</li>`;
    });
    body += `</ul>`;
  }
  
  if (stats.warnings.length > 0) {
    body += `<h3>Warnings</h3>`;
    body += `<ul>`;
    stats.warnings.forEach(warn => {
      body += `<li><strong>Row ${warn.row}</strong> - ${warn.camp}: ${warn.warning}</li>`;
    });
    body += `</ul>`;
  }
  
  if (stats.skipped.length > 0) {
    body += `<h3>Skipped Rows</h3>`;
    body += `<ul>`;
    stats.skipped.forEach(skip => {
      body += `<li><strong>Row ${skip.row}</strong>: ${skip.reason}</li>`;
    });
    body += `</ul>`;
  }
  
  MailApp.sendEmail({
    to: SUMMARY_EMAIL,
    subject: subject,
    htmlBody: body
  });
}

// ============================================================================
// TRIGGER SETUP
// ============================================================================

/**
 * Set up daily trigger (run this once to schedule)
 */
function setupDailyTrigger() {
  // Delete existing triggers for this function
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'syncCampsToAirtable') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Create new daily trigger at 2:30 AM
  ScriptApp.newTrigger('syncCampsToAirtable')
    .timeBased()
    .everyDays(1)
    .atHour(2)
    .nearMinute(30)
    .create();
  
  Logger.log('Daily trigger set up for 2:30 AM');
}
