/**
 * Netlify Function — email pickup/dropoff calendar invites (.ics) via Resend.
 * Auth: Supabase JWT; sends only to token email.
 */

const { jwtVerify, createRemoteJWKSet } = require('jose');
const path = require('path');
const {
    buildPickupDropoffEvents,
    buildPickupDropoffIcs,
    getPickupDropoffIcsFilename
} = require(path.join(__dirname, '../../js/registration-ics-core.js'));
const { getResendConfig, sendCalendarInviteEmail } = require(path.join(__dirname, '../lib/calendar-email-resend.js'));

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
        startDate,
        endDate,
        dropoffTime,
        pickupTime,
        planDatesLabel,
        campDetailUrl,
        scheduleNotes,
        entryId,
        campId
    } = body || {};

    const dropoff = dropoffTime ? String(dropoffTime).trim() : '';
    const pickup = pickupTime ? String(pickupTime).trim() : '';

    if (!campName || !startDate) {
        return { ok: false, error: 'Missing required event fields.' };
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
        return { ok: false, error: 'Invalid start date.' };
    }
    if (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
        return { ok: false, error: 'Invalid end date.' };
    }
    if (!dropoff && !pickup) {
        return { ok: false, error: 'At least one of dropoff or pickup time is required.' };
    }
    if (dropoff && !/^\d{2}:\d{2}$/.test(dropoff)) {
        return { ok: false, error: 'Invalid dropoff time.' };
    }
    if (pickup && !/^\d{2}:\d{2}$/.test(pickup)) {
        return { ok: false, error: 'Invalid pickup time.' };
    }

    return {
        ok: true,
        data: {
            campName: String(campName).slice(0, 200),
            childName: childName ? String(childName).slice(0, 80) : '',
            startDate,
            endDate: endDate ? String(endDate).slice(0, 10) : '',
            dropoffTime: dropoff,
            pickupTime: pickup,
            planDatesLabel: planDatesLabel ? String(planDatesLabel).slice(0, 200) : '',
            campDetailUrl: campDetailUrl ? String(campDetailUrl).slice(0, 500) : '',
            scheduleNotes: scheduleNotes ? String(scheduleNotes).slice(0, 2000) : '',
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
    let events;
    let icsContent;
    try {
        events = buildPickupDropoffEvents(params);
        icsContent = buildPickupDropoffIcs(events);
    } catch (err) {
        return {
            statusCode: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: err.message || 'Could not build calendar file.' })
        };
    }

    const filename = getPickupDropoffIcsFilename(params.campName, params.childName);
    const child = params.childName || 'Child';
    const subject = `Pickup/dropoff reminders: ${child} — ${params.campName}`;

    const htmlBody = `
        <p>Your pickup/dropoff calendar reminders for <strong>${escapeHtml(params.campName)}</strong> are attached (${events.length} event${events.length === 1 ? '' : 's'}).</p>
        <p>Open the <strong>.ics</strong> file to add them to your calendar.</p>
        ${params.campDetailUrl ? `<p><a href="${escapeHtml(params.campDetailUrl)}">Camp details on A2CampFinder</a></p>` : ''}
    `.trim();
    const textBody = `Your pickup/dropoff calendar reminders for ${params.campName} are attached (${events.length} events).`;

    try {
        const result = await sendCalendarInviteEmail({
            to: user.email,
            subject,
            html: htmlBody,
            text: textBody,
            filename,
            icsContent
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
            body: JSON.stringify({ success: true, eventCount: events.length })
        };
    } catch (err) {
        console.error('send-pickup-dropoff-calendar:', err);
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
