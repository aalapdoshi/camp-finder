/**
 * Shared Resend helper for calendar invite Netlify functions.
 */

function cleanEnv(value) {
    return String(value || '').trim().replace(/^["']|["']$/g, '');
}

/**
 * @returns {{ apiKey: string, from: string }|null}
 */
function getResendConfig() {
    const apiKey = cleanEnv(process.env.RESEND_API_KEY);
    const fromRaw = cleanEnv(process.env.REGISTRATION_CALENDAR_FROM_EMAIL);
    if (!apiKey || !fromRaw) return null;
    return { apiKey, from: normalizeFromAddress(fromRaw) };
}

/**
 * Ensure Resend-friendly `Name <email@domain.com>` format.
 * @param {string} raw
 * @returns {string}
 */
function normalizeFromAddress(raw) {
    const cleaned = cleanEnv(raw);
    const named = cleaned.match(/^(.+?)\s*<([^>]+)>$/);
    if (named) {
        return `${named[1].trim()} <${cleanEnv(named[2]).toLowerCase()}>`;
    }
    return `A2 CampFinder <${cleaned.toLowerCase()}>`;
}

/**
 * @param {number} status
 * @param {string} errText
 * @returns {string}
 */
function parseResendError(status, errText) {
    console.error('Resend error:', status, errText);
    try {
        const parsed = JSON.parse(errText);
        if (parsed?.message) return parsed.message;
    } catch (_) {
        if (errText?.trim()) return errText.trim().slice(0, 300);
    }
    return 'Could not send email. Try again later.';
}

/**
 * @param {object} opts
 * @param {string} opts.to
 * @param {string} opts.subject
 * @param {string} opts.html
 * @param {string} [opts.text]
 * @param {string} opts.filename
 * @param {string} opts.icsContent
 * @returns {Promise<{ ok: true, data: object }|{ ok: false, status: number, error: string }>}
 */
async function sendCalendarInviteEmail(opts) {
    const config = getResendConfig();
    if (!config) {
        return { ok: false, status: 500, error: 'Email service is not configured.' };
    }

    const toEmail = cleanEnv(opts.to).toLowerCase();
    if (!toEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
        return { ok: false, status: 400, error: 'No valid email on your account.' };
    }

    const payload = {
        from: config.from,
        to: [toEmail],
        subject: opts.subject,
        html: opts.html,
        attachments: [
            {
                filename: opts.filename,
                content: Buffer.from(opts.icsContent, 'utf8').toString('base64'),
                content_type: 'text/calendar'
            }
        ]
    };
    if (opts.text) payload.text = opts.text;

    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (!res.ok) {
        return {
            ok: false,
            status: 502,
            error: parseResendError(res.status, await res.text())
        };
    }

    return { ok: true, data: await res.json() };
}

module.exports = {
    getResendConfig,
    normalizeFromAddress,
    sendCalendarInviteEmail
};
