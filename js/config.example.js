// config.js - API configuration
// Copy this file to config.js and add your actual API keys for LOCAL DEVELOPMENT
// For Netlify deployment, use environment variables (see NETLIFY_SETUP.md)

// Check if we're running on Netlify (using proxy) or locally (direct API)
const IS_NETLIFY = window.location.hostname.includes('netlify.app') || 
                   window.location.hostname.includes('netlify.com');

// Local development: Use direct API keys
// Netlify: Uses proxy functions (no keys in client code)
const AIRTABLE_API_KEY = IS_NETLIFY ? null : 'YOUR_AIRTABLE_API_KEY_HERE';
const AIRTABLE_BASE_ID = 'YOUR_AIRTABLE_BASE_ID_HERE';
const OPENAI_API_KEY = IS_NETLIFY ? null : 'YOUR_OPENAI_API_KEY_HERE';

// API endpoint configuration
const AIRTABLE_API_ENDPOINT = IS_NETLIFY ? '/api/airtable' : null; // Netlify proxy
