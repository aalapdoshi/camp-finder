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
const AIRTABLE_CATEGORIES_TABLE = 'Categories';
const AIRTABLE_CATEGORIES_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_CATEGORIES_TABLE}`;

const SUMMARY_EMAIL = 'aalap1.doshi@gmail.com';

// OpenAI Configuration
const OPENAI_API_KEY = 'YOUR_OPENAI_API_KEY_HERE'; // TODO: Add your OpenAI API key
const OPENAI_MODEL = 'gpt-3.5-turbo';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_DELAY_SECONDS = 20; // Delay between requests (for rate limiting)

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
      
      // Step 4.5: Enrich newly created camps with AI
      const newCampsForEnrichment = campsToCreate
        .filter(camp => {
          const website = camp.fields['Website'];
          const description = camp.fields['Description'];
          const category = camp.fields['Primary Category'];
          return website && (!description || !category);
        })
        .map(camp => ({
          name: camp.fields['Camp Name'],
          website: camp.fields['Website']
        }));
      
      if (newCampsForEnrichment.length > 0) {
        enrichNewCampsFromSync(newCampsForEnrichment, stats);
      }
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
  
  // Parse Address → City and copy full Address
  const addressData = parseAddress(sheetCamp['Address']);
  if (addressData.city) fields['City'] = addressData.city;
  // Copy full address to Address field
  if (addressData.fullAddress) fields['Address'] = addressData.fullAddress;
  
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
  
  // Copy individual fields to separate Airtable fields
  if (sheetCamp['Registration Details'] && sheetCamp['Registration Details'].toString().trim()) {
    fields['Registration Notes'] = sheetCamp['Registration Details'].toString().trim();
  }
  
  if (sheetCamp['Before / After Care'] && sheetCamp['Before / After Care'].toString().trim()) {
    fields['Extended Care Notes'] = sheetCamp['Before / After Care'].toString().trim();
  }
  
  if (sheetCamp['Days/Times'] && sheetCamp['Days/Times'].toString().trim()) {
    fields['Schedule Notes'] = sheetCamp['Days/Times'].toString().trim();
  }
  
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
  
  // Add AI enrichment summary if present
  if (stats.aiEnrichment) {
    const ai = stats.aiEnrichment;
    body += `<h3>AI Enrichment (New Camps)</h3>`;
    body += `<ul>`;
    body += `<li><strong>Camps Processed:</strong> ${ai.processed}</li>`;
    body += `<li><strong>Camps Enriched:</strong> ${ai.enriched}</li>`;
    body += `<li><strong>Descriptions Added:</strong> ${ai.descriptionsAdded}</li>`;
    body += `<li><strong>Categories Added:</strong> ${ai.categoriesAdded}</li>`;
    body += `<li><strong>Skipped:</strong> ${ai.skipped.length}</li>`;
    body += `<li><strong>Errors:</strong> ${ai.errors.length}</li>`;
    if (ai.unmatchedCategories.length > 0) {
      body += `<li><strong>Unmatched Categories:</strong> ${ai.unmatchedCategories.length} (see details below)</li>`;
    }
    body += `</ul>`;
    
    if (ai.unmatchedCategories.length > 0) {
      body += `<h4>Unmatched Categories (for improving Categories table)</h4>`;
      body += `<ul>`;
      ai.unmatchedCategories.forEach(item => {
        body += `<li><strong>${item.camp}</strong><br>`;
        body += `AI Suggested: "${item.aiSuggested}"<br>`;
        body += `Available: ${item.availableCategories}</li>`;
      });
      body += `</ul>`;
    }
    
    if (ai.errors.length > 0) {
      body += `<h4>AI Enrichment Errors</h4>`;
      body += `<ul>`;
      ai.errors.forEach(err => {
        body += `<li><strong>${err.camp || 'Unknown'}</strong>: ${err.error}</li>`;
      });
      body += `</ul>`;
    }
  }
  
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

/**
 * Test function: Enrich only 2 camps (for testing)
 * Call this instead of enrichCampsWithAI() when testing
 */
function testEnrichCampsWithAI() {
  enrichCampsWithAI(2);
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

// ============================================================================
// AI ENRICHMENT FUNCTIONS
// ============================================================================

/**
 * Main function to enrich all eligible camps with AI (manual trigger)
 * Processes camps that have Website but empty Description OR Primary Category
 * 
 * @param {number} limit - Optional: Maximum number of camps to process (for testing). Omit to process all.
 */
function enrichCampsWithAI(limit) {
  const startTime = new Date();
  const stats = {
    processed: 0,
    enriched: 0,
    descriptionsAdded: 0,
    categoriesAdded: 0,
    skipped: [],
    errors: [],
    unmatchedCategories: [] // AI suggested categories that don't match
  };

  try {
    // Fetch all camps from Airtable
    const camps = fetchAllAirtableCamps();
    
    // Fetch categories for matching
    const categories = fetchAllAirtableCategories();
    const categoryNames = categories.map(cat => cat.fields['Category Name'] || '').filter(Boolean);
    
    // Filter camps that need enrichment
    let campsToEnrich = camps.filter(camp => {
      const website = camp.fields['Website'];
      const description = camp.fields['Description'];
      const category = camp.fields['Primary Category'];
      
      return website && (!description || !category);
    });
    
    // Apply limit if provided (for testing)
    if (limit && limit > 0) {
      campsToEnrich = campsToEnrich.slice(0, limit);
      Logger.log(`Processing first ${limit} camps (limit applied for testing)`);
    }
    
    Logger.log(`Found ${campsToEnrich.length} camps to enrich`);
    
    // Process each camp
    for (let i = 0; i < campsToEnrich.length; i++) {
      const camp = campsToEnrich[i];
      const campName = camp.fields['Camp Name'];
      const website = camp.fields['Website'];
      
      stats.processed++;
      
      // Check execution time (30 min limit)
      const elapsed = (new Date() - startTime) / 1000;
      if (elapsed > 1700) { // Stop at ~28 minutes to be safe
        Logger.log(`Stopping due to time limit. Processed ${i} of ${campsToEnrich.length} camps.`);
        stats.skipped.push({
          camp: campName,
          reason: 'Time limit reached - remaining camps will be processed on next run'
        });
        break;
      }
      
      try {
        // Fetch website content
        const websiteContent = fetchWebsiteContent(website);
        if (!websiteContent) {
          stats.skipped.push({
            camp: campName,
            reason: 'Could not fetch website content'
          });
          continue;
        }
        
        // Call OpenAI for enrichment
        const aiResult = callOpenAIForEnrichment(campName, websiteContent, categoryNames);
        if (!aiResult || !aiResult.description) {
          stats.skipped.push({
            camp: campName,
            reason: 'AI did not return valid description'
          });
          continue;
        }
        
        // Match category
        const matchedCategory = matchCategoryToAirtable(aiResult.category, categoryNames);
        
        // Prepare update fields
        const updateFields = {};
        if (!camp.fields['Description'] && aiResult.description) {
          updateFields['Description'] = aiResult.description;
          stats.descriptionsAdded++;
        }
        
        if (!camp.fields['Primary Category'] && matchedCategory) {
          updateFields['Primary Category'] = matchedCategory;
          stats.categoriesAdded++;
        } else if (!camp.fields['Primary Category'] && aiResult.category && !matchedCategory) {
          // Log unmatched category for future improvement
          stats.unmatchedCategories.push({
            camp: campName,
            aiSuggested: aiResult.category,
            availableCategories: categoryNames.join(', ')
          });
        }
        
        // Update Airtable if we have fields to update
        if (Object.keys(updateFields).length > 0) {
          updateAirtableCamp(camp.id, updateFields);
          stats.enriched++;
        }
        
        // Rate limiting delay
        Utilities.sleep(OPENAI_DELAY_SECONDS * 1000);
        
      } catch (error) {
        Logger.log(`Error enriching camp ${campName}: ${error.toString()}`);
        stats.errors.push({
          camp: campName,
          error: error.toString()
        });
      }
    }
    
    // Send email summary
    const endTime = new Date();
    const duration = Math.round((endTime - startTime) / 1000);
    sendAIEnrichmentSummary(stats, duration);
    
    Logger.log(`AI enrichment completed: ${stats.processed} processed, ${stats.enriched} enriched, ${stats.descriptionsAdded} descriptions added, ${stats.categoriesAdded} categories added`);
    
  } catch (error) {
    Logger.log(`Fatal error in AI enrichment: ${error.toString()}`);
    stats.errors.push({ fatal: true, error: error.toString() });
    sendAIEnrichmentSummary(stats, 0);
    throw error;
  }
}

/**
 * Enrich newly created camps from sync (called automatically)
 */
function enrichNewCampsFromSync(newCamps, syncStats) {
  if (!OPENAI_API_KEY || OPENAI_API_KEY === 'YOUR_OPENAI_API_KEY_HERE') {
    Logger.log('OpenAI API key not configured, skipping AI enrichment');
    return;
  }
  
  const aiStats = {
    processed: 0,
    enriched: 0,
    descriptionsAdded: 0,
    categoriesAdded: 0,
    skipped: [],
    errors: [],
    unmatchedCategories: []
  };
  
  try {
    // Fetch categories for matching
    const categories = fetchAllAirtableCategories();
    const categoryNames = categories.map(cat => cat.fields['Category Name'] || '').filter(Boolean);
    
    // Fetch existing camps to get record IDs
    const allCamps = fetchAllAirtableCamps();
    const campMap = new Map();
    allCamps.forEach(camp => {
      campMap.set(camp.fields['Camp Name'], camp);
    });
    
    // Process each new camp
    for (let i = 0; i < newCamps.length; i++) {
      const newCamp = newCamps[i];
      const campRecord = campMap.get(newCamp.name);
      
      if (!campRecord) {
        aiStats.skipped.push({
          camp: newCamp.name,
          reason: 'Camp record not found in Airtable'
        });
        continue;
      }
      
      const website = newCamp.website || campRecord.fields['Website'];
      const description = campRecord.fields['Description'];
      const category = campRecord.fields['Primary Category'];
      
      // Skip if already has both description and category
      if (description && category) {
        continue;
      }
      
      if (!website) {
        aiStats.skipped.push({
          camp: newCamp.name,
          reason: 'No website URL'
        });
        continue;
      }
      
      aiStats.processed++;
      
      try {
        // Fetch website content
        const websiteContent = fetchWebsiteContent(website);
        if (!websiteContent) {
          aiStats.skipped.push({
            camp: newCamp.name,
            reason: 'Could not fetch website content'
          });
          continue;
        }
        
        // Call OpenAI for enrichment
        const aiResult = callOpenAIForEnrichment(newCamp.name, websiteContent, categoryNames);
        if (!aiResult || !aiResult.description) {
          aiStats.skipped.push({
            camp: newCamp.name,
            reason: 'AI did not return valid description'
          });
          continue;
        }
        
        // Match category
        const matchedCategory = matchCategoryToAirtable(aiResult.category, categoryNames);
        
        // Prepare update fields
        const updateFields = {};
        if (!description && aiResult.description) {
          updateFields['Description'] = aiResult.description;
          aiStats.descriptionsAdded++;
        }
        
        if (!category && matchedCategory) {
          updateFields['Primary Category'] = matchedCategory;
          aiStats.categoriesAdded++;
        } else if (!category && aiResult.category && !matchedCategory) {
          // Log unmatched category
          aiStats.unmatchedCategories.push({
            camp: newCamp.name,
            aiSuggested: aiResult.category,
            availableCategories: categoryNames.join(', ')
          });
        }
        
        // Update Airtable if we have fields to update
        if (Object.keys(updateFields).length > 0) {
          updateAirtableCamp(campRecord.id, updateFields);
          aiStats.enriched++;
        }
        
        // Rate limiting delay
        Utilities.sleep(OPENAI_DELAY_SECONDS * 1000);
        
      } catch (error) {
        Logger.log(`Error enriching camp ${newCamp.name}: ${error.toString()}`);
        aiStats.errors.push({
          camp: newCamp.name,
          error: error.toString()
        });
      }
    }
    
    // Merge AI stats into sync stats for email summary
    syncStats.aiEnrichment = aiStats;
    
  } catch (error) {
    Logger.log(`Error in enrichNewCampsFromSync: ${error.toString()}`);
    aiStats.errors.push({ fatal: true, error: error.toString() });
    syncStats.aiEnrichment = aiStats;
  }
}

/**
 * Fetch website content and extract text
 */
function fetchWebsiteContent(url) {
  if (!url || url.trim() === '') {
    return null;
  }
  
  try {
    const response = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      followRedirects: true,
      validateHttpsCertificates: false
    });
    
    const statusCode = response.getResponseCode();
    if (statusCode !== 200) {
      Logger.log(`Website fetch failed for ${url}: HTTP ${statusCode}`);
      return null;
    }
    
    const html = response.getContentText();
    
    // Remove script and style tags
    let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    text = text.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '');
    text = text.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '');
    
    // Extract text from body
    const bodyMatch = text.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    if (bodyMatch) {
      text = bodyMatch[1];
    }
    
    // Remove HTML tags
    text = text.replace(/<[^>]+>/g, ' ');
    
    // Clean up whitespace
    text = text.replace(/\s+/g, ' ').trim();
    
    // Limit to 5000 characters to save tokens
    if (text.length > 5000) {
      text = text.substring(0, 5000) + '...';
    }
    
    return text;
    
  } catch (error) {
    Logger.log(`Error fetching website ${url}: ${error.toString()}`);
    return null;
  }
}

/**
 * Call OpenAI API to get description and category
 */
function callOpenAIForEnrichment(campName, websiteContent, availableCategories) {
  if (!OPENAI_API_KEY || OPENAI_API_KEY === 'YOUR_OPENAI_API_KEY_HERE') {
    throw new Error('OpenAI API key not configured');
  }
  
  const categoriesList = availableCategories.join(', ');
  
  const prompt = `You are helping categorize summer camps for children.

Camp Name: ${campName}
Website Content: ${websiteContent}

Tasks:
1. Write a 2-3 sentence description of this camp based on the website content. Focus on what makes this camp unique, what activities it offers, and who it's for.

2. Categorize this camp into ONE of these categories:
${categoriesList}

Choose the best matching category. If none match well, respond with "NO_MATCH".

Respond in JSON format:
{
  "description": "...",
  "category": "..."
}`;

  try {
    const response = UrlFetchApp.fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that analyzes summer camp websites and categorizes them. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      })
    });
    
    if (response.getResponseCode() !== 200) {
      const errorText = response.getContentText();
      Logger.log(`OpenAI API error: ${errorText}`);
      throw new Error(`OpenAI API error: ${response.getResponseCode()}`);
    }
    
    const data = JSON.parse(response.getContentText());
    const content = data.choices[0].message.content.trim();
    
    // Try to extract JSON from response (might have markdown code blocks)
    let jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in OpenAI response');
    }
    
    const result = JSON.parse(jsonMatch[0]);
    
    return {
      description: result.description || null,
      category: result.category || null
    };
    
  } catch (error) {
    Logger.log(`Error calling OpenAI API: ${error.toString()}`);
    throw error;
  }
}

/**
 * Match AI-suggested category to Airtable categories using fuzzy matching
 */
function matchCategoryToAirtable(aiCategory, availableCategories) {
  if (!aiCategory || aiCategory === 'NO_MATCH') {
    return null;
  }
  
  const aiLower = aiCategory.toLowerCase().trim();
  
  // Exact match (case-insensitive)
  for (const cat of availableCategories) {
    if (cat.toLowerCase() === aiLower) {
      return cat;
    }
  }
  
  // Partial match (AI category contains category name or vice versa)
  for (const cat of availableCategories) {
    const catLower = cat.toLowerCase();
    if (aiLower.includes(catLower) || catLower.includes(aiLower)) {
      return cat;
    }
  }
  
  // Fuzzy matching with common synonyms/patterns
  const synonymMap = {
    'science': 'STEM',
    'technology': 'STEM',
    'engineering': 'STEM',
    'math': 'STEM',
    'art': 'Arts & Crafts',
    'crafts': 'Arts & Crafts',
    'creative': 'Arts & Crafts',
    'sports': 'Sports',
    'athletic': 'Sports',
    'nature': 'Nature & Outdoor',
    'outdoor': 'Nature & Outdoor',
    'environmental': 'Nature & Outdoor',
    'farm': 'Farm & Animals',
    'animals': 'Farm & Animals',
    'music': 'Music',
    'academic': 'Academic',
    'education': 'Academic',
    'general': 'General/Mixed',
    'mixed': 'General/Mixed'
  };
  
  for (const [key, value] of Object.entries(synonymMap)) {
    if (aiLower.includes(key) && availableCategories.includes(value)) {
      return value;
    }
  }
  
  // No match found
  return null;
}

/**
 * Fetch all categories from Airtable
 */
function fetchAllAirtableCategories() {
  const categories = [];
  let offset = null;
  
  do {
    const url = offset 
      ? `${AIRTABLE_CATEGORIES_URL}?offset=${offset}`
      : AIRTABLE_CATEGORIES_URL;
    
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
    categories.push(...data.records);
    offset = data.offset;
    
    Utilities.sleep(200);
    
  } while (offset);
  
  return categories;
}

/**
 * Update a single camp record in Airtable
 */
function updateAirtableCamp(recordId, fields) {
  const url = `${AIRTABLE_API_URL}/${recordId}`;
  
  const response = UrlFetchApp.fetch(url, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify({ fields: fields })
  });
  
  if (response.getResponseCode() !== 200) {
    throw new Error(`Airtable update failed: ${response.getResponseCode()} - ${response.getContentText()}`);
  }
  
  return JSON.parse(response.getContentText());
}

/**
 * Send email summary for AI enrichment
 */
function sendAIEnrichmentSummary(stats, durationSeconds) {
  const subject = `CampFinder AI Enrichment Summary - ${new Date().toLocaleDateString()}`;
  
  let body = `<h2>CampFinder AI Enrichment Summary</h2>`;
  body += `<p><strong>Enrichment Date:</strong> ${new Date().toLocaleString()}</p>`;
  body += `<p><strong>Duration:</strong> ${durationSeconds} seconds</p>`;
  
  body += `<h3>Summary</h3>`;
  body += `<ul>`;
  body += `<li><strong>Camps Processed:</strong> ${stats.processed}</li>`;
  body += `<li><strong>Camps Enriched:</strong> ${stats.enriched}</li>`;
  body += `<li><strong>Descriptions Added:</strong> ${stats.descriptionsAdded}</li>`;
  body += `<li><strong>Categories Added:</strong> ${stats.categoriesAdded}</li>`;
  body += `<li><strong>Skipped:</strong> ${stats.skipped.length}</li>`;
  body += `<li><strong>Errors:</strong> ${stats.errors.length}</li>`;
  body += `<li><strong>Unmatched Categories:</strong> ${stats.unmatchedCategories.length}</li>`;
  body += `</ul>`;
  
  if (stats.unmatchedCategories.length > 0) {
    body += `<h3>Unmatched Categories (for improving Categories table)</h3>`;
    body += `<ul>`;
    stats.unmatchedCategories.forEach(item => {
      body += `<li><strong>${item.camp}</strong><br>`;
      body += `AI Suggested: "${item.aiSuggested}"<br>`;
      body += `Available Categories: ${item.availableCategories}</li>`;
    });
    body += `</ul>`;
  }
  
  if (stats.errors.length > 0) {
    body += `<h3>Errors</h3>`;
    body += `<ul>`;
    stats.errors.forEach(err => {
      body += `<li><strong>${err.camp || 'Unknown'}</strong>: ${err.error}</li>`;
    });
    body += `</ul>`;
  }
  
  if (stats.skipped.length > 0) {
    body += `<h3>Skipped Camps</h3>`;
    body += `<ul>`;
    stats.skipped.forEach(skip => {
      body += `<li><strong>${skip.camp}</strong>: ${skip.reason}</li>`;
    });
    body += `</ul>`;
  }
  
  MailApp.sendEmail({
    to: SUMMARY_EMAIL,
    subject: subject,
    htmlBody: body
  });
}
