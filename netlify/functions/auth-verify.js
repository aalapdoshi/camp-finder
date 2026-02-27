/**
 * Netlify Function to verify Supabase JWT.
 * Use this to protect API routes that require authentication (e.g. saved camps).
 *
 * Usage: Call this from other functions, or use as a middleware pattern.
 * Client sends: Authorization: Bearer <access_token>
 *
 * Env vars: SUPABASE_URL (e.g. https://xxx.supabase.co)
 */

const { jwtVerify, createRemoteJWKSet } = require('jose');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  const authHeader = event.headers?.authorization || event.headers?.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      statusCode: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing or invalid Authorization header' })
    };
  }

  const token = authHeader.replace('Bearer ', '').trim();
  const supabaseUrl = process.env.SUPABASE_URL;

  if (!supabaseUrl) {
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Server configuration error' })
    };
  }

  const jwksUrl = `${supabaseUrl.replace(/\/$/, '')}/auth/v1/.well-known/jwks.json`;

  try {
    const JWKS = createRemoteJWKSet(new URL(jwksUrl));
    const { payload } = await jwtVerify(token, JWKS);
    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        valid: true,
        sub: payload.sub,
        email: payload.email,
        role: payload.role
      })
    };
  } catch (err) {
    return {
      statusCode: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid or expired token' })
    };
  }
};
