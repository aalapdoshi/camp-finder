/**
 * Netlify Function to proxy Airtable API calls
 * This keeps API keys server-side and never exposes them to the client
 */

// Load .env for local netlify dev (not needed on Netlify; env vars come from dashboard)
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

exports.handler = async (event, context) => {
  // CORS headers for all responses
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Get API key from environment variable
  const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Server configuration error' })
    };
  }

  // Parse the path to determine what to fetch
  // Expected: /api/airtable?table=Camps or /api/airtable?table=Categories
  const table = event.queryStringParameters?.table || 'Camps';
  
  // Validate table name (security: only allow specific tables)
  const allowedTables = ['Camps', 'Categories'];
  if (!allowedTables.includes(table)) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Invalid table name' })
    };
  }

  try {
    // Fetch all records with pagination handling
    let allRecords = [];
    let offset = event.queryStringParameters?.offset || null;
    let hasMore = true;

    while (hasMore) {
      const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${table}${offset ? `?offset=${offset}` : ''}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        return {
          statusCode: response.status,
          headers: corsHeaders,
          body: JSON.stringify({ error: `Airtable API error: ${response.status}` })
        };
      }

      const data = await response.json();
      allRecords = allRecords.concat(data.records);
      offset = data.offset;
      hasMore = !!offset;
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      },
      body: JSON.stringify({ records: allRecords })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: error.toString() })
    };
  }
};
