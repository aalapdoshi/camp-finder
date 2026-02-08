/**
 * Netlify Function to submit feedback to Airtable
 * This keeps API keys server-side and never exposes them to the client
 */

exports.handler = async (event, context) => {
  // CORS headers for all responses
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
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

  try {
    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { rating, suggestions, page } = body;

    // Validate rating (required, must be 1-5)
    if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Rating must be a number between 1 and 5' })
      };
    }

    // Prepare Airtable record
    const fields = {
      'Rating': rating,
      'Submitted At': new Date().toISOString()
    };

    // Add suggestions if provided
    if (suggestions && suggestions.trim() !== '') {
      fields['Suggestions'] = suggestions.trim();
    }

    // Add page if provided
    if (page && page.trim() !== '') {
      fields['Page'] = page.trim();
    }

    // Create record in Airtable
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Feedback`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: fields
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      return {
        statusCode: response.status,
        headers: corsHeaders,
        body: JSON.stringify({ error: `Airtable API error: ${response.status} - ${errorData}` })
      };
    }

    const data = await response.json();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      },
      body: JSON.stringify({ success: true, record: data })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: error.toString() })
    };
  }
};
