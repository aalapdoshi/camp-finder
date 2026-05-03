// config.js - API configuration
// For local development: Use netlify dev (recommended) OR direct API keys
// For Netlify: Uses proxy functions (no keys needed here)

// Check if we're running on Netlify (using proxy) or netlify dev (localhost:8888)
const IS_NETLIFY = window.location.hostname.includes('netlify.app') || 
                   window.location.hostname.includes('netlify.com') ||
                   window.location.hostname.includes('a2campfinder.com');

// netlify dev runs on port 8888 and serves the /api proxy
const IS_NETLIFY_DEV = window.location.hostname === 'localhost' && window.location.port === '8888';
const USE_API_PROXY = IS_NETLIFY || IS_NETLIFY_DEV;

// Local development: Use direct API keys (only when NOT using netlify dev)
// Netlify / netlify dev: Uses proxy functions (no keys in client code)
// ⚠️ For plain localhost (e.g. python -m http.server): Replace with your Airtable API key
const AIRTABLE_API_KEY = USE_API_PROXY ? null : 'YOUR_AIRTABLE_API_KEY_HERE';
const AIRTABLE_BASE_ID = 'appv2VRiObNca7leq';
const OPENAI_API_KEY = USE_API_PROXY ? null : 'YOUR_OPENAI_API_KEY_HERE';

// API endpoint configuration
const AIRTABLE_API_ENDPOINT = USE_API_PROXY ? '/api/airtable' : null; // Netlify proxy
