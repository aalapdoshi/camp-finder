// config.js - API configuration
// For local development: Use direct API keys
// For Netlify: Uses proxy functions (no keys needed here)

// Check if we're running on Netlify (using proxy) or locally (direct API)
const IS_NETLIFY = window.location.hostname.includes('netlify.app') || 
                   window.location.hostname.includes('netlify.com');

// Local development: Use direct API keys
// Netlify: Uses proxy functions (no keys in client code)
// ⚠️ WARNING: Replace with your actual API key for local development only!
const AIRTABLE_API_KEY = IS_NETLIFY ? null : 'YOUR_AIRTABLE_API_KEY_HERE';
const AIRTABLE_BASE_ID = 'appv2VRiObNca7leq';
const OPENAI_API_KEY = IS_NETLIFY ? null : 'YOUR_OPENAI_API_KEY_HERE';

// API endpoint configuration
const AIRTABLE_API_ENDPOINT = IS_NETLIFY ? '/api/airtable' : null; // Netlify proxy
