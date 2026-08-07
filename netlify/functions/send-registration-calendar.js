/**
 * Netlify Function — email registration calendar invite (.ics) via Resend.
 * Auth: Supabase JWT; sends only to token email.
 */

const { jwtVerify, createRemoteJWKSet } = require('jose');
const path = require('path');
const {
    buildRegistrationIcs,
    buildRegistrationEventTitle,
    getIcsFilename
} = require(path.join(__dirname, '../../js/registration-ics-core.js'));

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
    const {
        campName,
        childName,
        registrationDate,
        registrationTime,
        planDatesLabel,
        campDetailUrl,
        registrationUrl,
        entryId,
        campId
    } = body || {};

    if (!campName || !registrationDate || !registrationTime) {
        return { ok: false, error: 'Missing required event fields.' };
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(registrationDate)) {
        return { ok: false, error: 'Invalid registration date.' };
    }
    if (!/^\d{2}:\d{2}$/.test(registrationTime)) {
        return { ok: false, error: 'Invalid registration time.' };
    }

    return {
        ok: true,
        data: {
            campName: String(campName).slice(0, 200),
            childName: childName ? String(childName).slice(0, 80) : '',
            registrationDate,
            registrationTime,
            planDatesLabel: planDatesLabel ? String(planDatesLabel).slice(0, 200) : '',
            campDetailUrl: campDetailUrl ? String(campDetailUrl).slice(0, 500) : '',
            registrationUrl: registrationUrl ? String(registrationUrl).slice(0, 500) : '',
            entryId: entryId ? String(entryId).slice(0, 64) : '',
            campId: campId ? String(campId).slice(0, 64) : ''
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

    const resendKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.REGISTRATION_CALENDAR_FROM_EMAIL;

    if (!resendKey || !fromEmail) {
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
    let icsContent;
    try {
        icsContent = buildRegistrationIcs(params);
    } catch (err) {
        return {
            statusCode: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: err.message || 'Could not build calendar file.' })
        };
    }

    const title = buildRegistrationEventTitle(params.campName, params.childName);
    const filename = getIcsFilename(params.campName, params.childName);
    const subject = `Registration reminder: ${title.replace(/^Register /, '')}`;

    const htmlBody = `
        <p>Your registration reminder for <strong>${escapeHtml(params.campName)}</strong> is attached.</p>
        <p>Open the <strong>.ics</strong> file to add it to your calendar, or use the link in the invite.</p>
        ${params.registrationUrl ? `<p><a href="${escapeHtml(params.registrationUrl)}">Registration page</a></p>` : ''}
        ${params.campDetailUrl ? `<p><a href="${escapeHtml(params.campDetailUrl)}">Camp details on A2CampFinder</a></p>` : ''}
    `.trim();

    try {
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${resendKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: fromEmail,
                to: [user.email],
                subject,
                html: htmlBody,
                attachments: [
                    {
                        filename,
                        content: Buffer.from(icsContent, 'utf8').toString('base64')
                    }
                ]
            })
        });

        if (!res.ok) {
            const errText = await res.text();
            console.error('Resend error:', res.status, errText);
            return {
                statusCode: 502,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Could not send email. Try again later.' })
            };
        }

        return {
            statusCode: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: true })
        };
    } catch (err) {
        console.error('send-registration-calendar:', err);
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
