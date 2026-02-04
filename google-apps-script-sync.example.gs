/**
 * Google Sheets → Airtable Sync Script
 * 
 * COPY THIS FILE TO google-apps-script-sync.gs AND ADD YOUR API KEYS
 * 
 * SETUP INSTRUCTIONS:
 * 1. Open your Google Sheet: https://docs.google.com/spreadsheets/d/1FfiziYg5Ow-BlHqFRSWl2d3I-Uh7iy8W53lmpLSVfEU/edit
 * 2. Go to Extensions → Apps Script
 * 3. Copy the contents of google-apps-script-sync.gs (with your API keys) into the script editor
 * 4. Update the configuration constants below with your actual API keys
 * 5. Save the script
 * 6. Run syncCampsToAirtable() manually to test
 * 7. Set up a daily trigger (see setupDailyTrigger() function)
 */

// ============================================================================
// CONFIGURATION - ADD YOUR API KEYS HERE
// ============================================================================

const AIRTABLE_API_KEY = 'YOUR_AIRTABLE_API_KEY_HERE';
const AIRTABLE_BASE_ID = 'YOUR_AIRTABLE_BASE_ID_HERE';
const AIRTABLE_TABLE_NAME = 'Camps';
const AIRTABLE_API_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`;
const AIRTABLE_CATEGORIES_TABLE = 'Categories';
const AIRTABLE_CATEGORIES_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_CATEGORIES_TABLE}`;

const SUMMARY_EMAIL = 'your-email@example.com';

// OpenAI Configuration
const OPENAI_API_KEY = 'YOUR_OPENAI_API_KEY_HERE'; // Get from https://platform.openai.com/api-keys
const OPENAI_MODEL = 'gpt-3.5-turbo';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_DELAY_SECONDS = 20; // Delay between requests (for rate limiting)

// ... (rest of the script would go here, but this is just a template)
// See google-apps-script-sync.gs for the full implementation
