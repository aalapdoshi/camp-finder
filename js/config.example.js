// config.js - API configuration
// Copy this file to config.js and add your actual API keys for LOCAL DEVELOPMENT
// For Netlify deployment, use environment variables (see NETLIFY_SETUP.md)

// Production / Netlify proxy hosts (custom domain included)
const IS_NETLIFY = window.location.hostname.includes('netlify.app') ||
                   window.location.hostname.includes('netlify.com') ||
                   window.location.hostname.includes('a2campfinder.com');

// netlify dev on :8888 also serves /api/*
const IS_NETLIFY_DEV = window.location.hostname === 'localhost' && window.location.port === '8888';
const USE_API_PROXY = IS_NETLIFY || IS_NETLIFY_DEV;

// Local (plain static server): direct API keys. Proxy hosts: keys stay server-side.
const AIRTABLE_API_KEY = USE_API_PROXY ? null : 'YOUR_AIRTABLE_API_KEY_HERE';
const AIRTABLE_BASE_ID = 'YOUR_AIRTABLE_BASE_ID_HERE';
const OPENAI_API_KEY = USE_API_PROXY ? null : 'YOUR_OPENAI_API_KEY_HERE';

const AIRTABLE_API_ENDPOINT = USE_API_PROXY ? '/api/airtable' : null;
