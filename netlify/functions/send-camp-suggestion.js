/**
 * Netlify Function — email a custom-camp catalog suggestion to the site inbox.
 * Auth: Supabase JWT. The account email in the body comes from the token.
 */

const { jwtVerify, createRemoteJWKSet } = require('jose');
const path = require('path');
const { getResendConfig, sendPlainEmail } = require(path.join(__dirname, '../lib/calendar-email-resend.js'));

const SUGGEST_CAMP_TO = 'a2summercamp@umich.edu';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

async function verifySupabaseToken(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('UNAUTHORIZED');
    }
    const token = authHeader.replace('Bearer ', '').trim();
    const supabaseUrl = process.env.SUPABASE_URL;
    if (!supabaseUrl) throw new Error('CONFIG');

    const jwksUrl = `${supabaseUrl.replace(/\/$/, '')}/auth/v1/.well-known/jwks.json`;
    const JWKS = createRemoteJWKSet(new URL(jwksUrl));
    const { payload } = await jwtVerify(token, JWKS);
    if (!payload.email) throw new Error('UNAUTHORIZED');
    return payload;
}

function validatePayload(body) {
    const campName = String(body?.campName || '').trim();
    const location = String(body?.location || '').trim();
    const startDate = String(body?.startDate || '').trim();
    const endDate = body?.endDate ? String(body.endDate).trim() : '';
    const cost = Number(body?.cost);

    if (!campName || campName.length > 200) {
        return { ok: false, error: 'Camp name is required.' };
    }
    if (location.length > 200) {
        return { ok: false, error: 'Location is too long.' };
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
        return { ok: false, error: 'Invalid start date.' };
    }
    if (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
        return { ok: false, error: 'Invalid end date.' };
    }
    if (!Number.isFinite(cost) || cost < 0) {
        return { ok: false, error: 'Invalid cost.' };
    }

    return {
        ok: true,
        data: {
            campName: campName.slice(0, 200),
            location: location.slice(0, 200),
            startDate,
            endDate,
            cost
        }
    };
}

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: corsHeaders, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    if (!getResendConfig()) {
        return {
            statusCode: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Email service is not configured.' })
        };
    }

    let user;
    try {
        user = await verifySupabaseToken(event.headers?.authorization || event.headers?.Authorization);
    } catch (err) {
        const status = err.message === 'CONFIG' ? 500 : 401;
        return {
            statusCode: status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                error: status === 401 ? 'Invalid or expired session.' : 'Server configuration error.'
            })
        };
    }

    let body;
    try {
        body = JSON.parse(event.body || '{}');
    } catch (_) {
        return {
            statusCode: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Invalid JSON body.' })
        };
    }

    const validated = validatePayload(body);
    if (!validated.ok) {
        return {
            statusCode: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: validated.error })
        };
    }

    const params = validated.data;
    const dates = params.endDate && params.endDate !== params.startDate
        ? `${params.startDate} – ${params.endDate}`
        : params.startDate;
    const location = params.location || 'Not provided';
    const costLabel = params.cost === 0 ? '$0' : `$${params.cost}`;
    const subject = `Camp suggestion: ${params.campName}`;
    const textBody = [
        'A signed-in user suggested adding this camp to the catalog.',
        '',
        `Camp: ${params.campName}`,
        `Dates: ${dates}`,
        `Location: ${location}`,
        `Cost: ${costLabel}`,
        `From: ${user.email}`
    ].join('\n');
    const htmlBody = `
        <p>A signed-in user suggested adding this camp to the catalog.</p>
        <p><strong>Camp:</strong> ${escapeHtml(params.campName)}<br>
        <strong>Dates:</strong> ${escapeHtml(dates)}<br>
        <strong>Location:</strong> ${escapeHtml(location)}<br>
        <strong>Cost:</strong> ${escapeHtml(costLabel)}<br>
        <strong>From:</strong> ${escapeHtml(user.email)}</p>
    `.trim();

    try {
        const result = await sendPlainEmail({
            to: SUGGEST_CAMP_TO,
            subject,
            html: htmlBody,
            text: textBody
        });

        if (!result.ok) {
            return {
                statusCode: result.status,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: result.error })
            };
        }

        return {
            statusCode: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: true })
        };
    } catch (err) {
        console.error('send-camp-suggestion:', err);
        return {
            statusCode: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Could not send email.' })
        };
    }
};

function escapeHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
