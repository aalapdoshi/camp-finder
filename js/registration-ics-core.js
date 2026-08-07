// registration-ics-core.js — shared ICS / Google Calendar helpers (browser + Netlify)
// America/Detroit wall-clock times for Ann Arbor camps.

const REGISTRATION_CALENDAR_TZ = 'America/Detroit';
const REGISTRATION_WINDOW_MINUTES = 30;

/**
 * Parse catalog free-text registration time → 24h { hours, minutes } or null.
 * @param {string|null|undefined} timeStr
 * @returns {{ hours: number, minutes: number }|null}
 */
function parseRegistrationOpensTime(timeStr) {
    if (timeStr == null || String(timeStr).trim() === '') return null;

    let s = String(timeStr).trim().toLowerCase();
    if (s === 'noon') return { hours: 12, minutes: 0 };
    if (s === 'midnight') return { hours: 0, minutes: 0 };

    s = s.replace(/\./g, '').replace(/\s+/g, ' ');

    const ampmMatch = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?|a|p)$/i)
        || s.match(/^(\d{1,2})(?::(\d{2}))?\s*([ap])\.?$/i);
    if (ampmMatch) {
        let hours = parseInt(ampmMatch[1], 10);
        const minutes = ampmMatch[2] ? parseInt(ampmMatch[2], 10) : 0;
        const meridiem = ampmMatch[3].toLowerCase();
        const isPm = meridiem.startsWith('p');
        if (hours === 12) hours = isPm ? 12 : 0;
        else if (isPm) hours += 12;
        if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
            return { hours, minutes };
        }
        return null;
    }

    const compact = s.match(/^(\d{1,2}):(\d{2})\s*([ap])$/i);
    if (compact) {
        let hours = parseInt(compact[1], 10);
        const minutes = parseInt(compact[2], 10);
        const isPm = compact[3].toLowerCase() === 'p';
        if (hours === 12) hours = isPm ? 12 : 0;
        else if (isPm) hours += 12;
        if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
            return { hours, minutes };
        }
        return null;
    }

    const h24 = s.match(/^(\d{1,2}):(\d{2})$/);
    if (h24) {
        const hours = parseInt(h24[1], 10);
        const minutes = parseInt(h24[2], 10);
        if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
            return { hours, minutes };
        }
    }

    return null;
}

/**
 * Format parsed time as HH:MM for <input type="time">.
 * @param {{ hours: number, minutes: number }|null} parsed
 * @returns {string}
 */
function formatTimeForInput(parsed) {
    if (!parsed) return '';
    return `${String(parsed.hours).padStart(2, '0')}:${String(parsed.minutes).padStart(2, '0')}`;
}

/**
 * @param {string} dateStr YYYY-MM-DD
 * @param {string} timeStr24 HH:MM
 * @returns {{ year: number, month: number, day: number, hours: number, minutes: number }|null}
 */
function parseWallDateTime(dateStr, timeStr24) {
    if (!dateStr || !timeStr24) return null;
    const dm = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const tm = timeStr24.match(/^(\d{2}):(\d{2})$/);
    if (!dm || !tm) return null;
    return {
        year: parseInt(dm[1], 10),
        month: parseInt(dm[2], 10),
        day: parseInt(dm[3], 10),
        hours: parseInt(tm[1], 10),
        minutes: parseInt(tm[2], 10)
    };
}

/** @param {Date} date @param {string} timeZone */
function getZonedParts(date, timeZone) {
    if (!Number.isFinite(date.getTime())) {
        return { year: 0, month: 0, day: 0, hours: 0, minutes: 0 };
    }
    const dtf = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
    const map = {};
    for (const p of dtf.formatToParts(date)) {
        if (p.type !== 'literal') map[p.type] = parseInt(p.value, 10);
    }
    return map;
}

/** @param {object} a @param {object} b */
function compareWallParts(a, b) {
    const keys = ['year', 'month', 'day', 'hours', 'minutes'];
    for (const k of keys) {
        if (a[k] !== b[k]) return a[k] - b[k];
    }
    return 0;
}

/**
 * UTC ms for a wall-clock moment in America/Detroit (binary search via Intl).
 * @param {{ year: number, month: number, day: number, hours: number, minutes: number }} wall
 * @returns {number}
 */
function wallDateTimeToUtcMs(wall) {
    const { year, month, day, hours, minutes } = wall;
    let lo = Date.UTC(year, month - 1, day, hours - 8, minutes) - 86400000;
    let hi = Date.UTC(year, month - 1, day, hours + 8, minutes) + 86400000;

    for (let i = 0; i < 48; i++) {
        const mid = Math.floor((lo + hi) / 2);
        if (!Number.isFinite(mid)) break;
        const parts = getZonedParts(new Date(mid), REGISTRATION_CALENDAR_TZ);
        const cmp = compareWallParts(wall, parts);
        if (cmp === 0) return mid;
        if (cmp > 0) lo = mid + 1;
        else hi = mid - 1;
    }
    return Date.UTC(year, month - 1, day, hours, minutes);
}

/**
 * @param {string} dateStr
 * @param {string} timeStr24
 * @returns {{ startMs: number, endMs: number, registrationMs: number }}
 */
function getRegistrationEventWindowMs(dateStr, timeStr24) {
    const wall = parseWallDateTime(dateStr, timeStr24);
    if (!wall) throw new Error('Invalid date or time');
    const registrationMs = wallDateTimeToUtcMs(wall);
    const offset = REGISTRATION_WINDOW_MINUTES * 60 * 1000;
    return {
        registrationMs,
        startMs: registrationMs - offset,
        endMs: registrationMs + offset
    };
}

/**
 * @param {string} dateStr YYYY-MM-DD
 * @param {string} timeStr24 HH:MM
 * @returns {boolean}
 */
function isRegistrationInPast(dateStr, timeStr24) {
    const wall = parseWallDateTime(dateStr, timeStr24);
    if (!wall) return false;
    const now = getZonedParts(new Date(), REGISTRATION_CALENDAR_TZ);
    return compareWallParts(wall, now) < 0;
}

/**
 * @param {number} ms UTC timestamp
 * @param {string} [timeZone]
 * @returns {{ year: number, month: number, day: number, hours: number, minutes: number }}
 */
function utcMsToWallParts(ms, timeZone = REGISTRATION_CALENDAR_TZ) {
    return getZonedParts(new Date(ms), timeZone);
}

/** @param {{ year, month, day, hours, minutes }} p */
function formatIcsLocalDateTime(p) {
    return (
        String(p.year).padStart(4, '0') +
        String(p.month).padStart(2, '0') +
        String(p.day).padStart(2, '0') +
        'T' +
        String(p.hours).padStart(2, '0') +
        String(p.minutes).padStart(2, '0') +
        '00'
    );
}

/** @param {number} ms */
function formatIcsUtcStamp(ms) {
    const d = new Date(ms);
    return (
        d.getUTCFullYear() +
        String(d.getUTCMonth() + 1).padStart(2, '0') +
        String(d.getUTCDate()).padStart(2, '0') +
        'T' +
        String(d.getUTCHours()).padStart(2, '0') +
        String(d.getUTCMinutes()).padStart(2, '0') +
        String(d.getUTCSeconds()).padStart(2, '0') +
        'Z'
    );
}

/** @param {string} str */
function escapeIcsText(str) {
    return String(str || '')
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n');
}

/**
 * @param {string} campName
 * @param {string} childName
 * @returns {string}
 */
function buildRegistrationEventTitle(campName, childName) {
    const child = (childName || '').trim() || 'Child';
    const camp = (campName || '').trim() || 'Camp';
    return `Register ${child}: ${camp}`;
}

/**
 * @param {object} opts
 * @returns {string}
 */
function buildRegistrationEventDescription(opts) {
    const lines = [];
    if (opts.campName) lines.push(`Camp: ${opts.campName}`);
    if (opts.childName) lines.push(`Child: ${opts.childName}`);
    if (opts.planDatesLabel) lines.push(`Plan dates: ${opts.planDatesLabel}`);
    lines.push('Reminder: registration opens at the time you set. This event spans 30 minutes before and after.');
    if (opts.registrationUrl) lines.push(`Register: ${opts.registrationUrl}`);
    if (opts.campDetailUrl) lines.push(`Camp details: ${opts.campDetailUrl}`);
    return lines.join('\n');
}

/**
 * @param {object} params
 * @returns {string}
 */
function buildRegistrationIcs(params) {
    const {
        campName,
        childName,
        registrationDate,
        registrationTime,
        campDetailUrl = '',
        registrationUrl = '',
        planDatesLabel = '',
        entryId = '',
        campId = ''
    } = params;

    const { startMs, endMs } = getRegistrationEventWindowMs(registrationDate, registrationTime);
    const startWall = utcMsToWallParts(startMs);
    const endWall = utcMsToWallParts(endMs);
    const title = buildRegistrationEventTitle(campName, childName);
    const description = buildRegistrationEventDescription({
        campName,
        childName,
        planDatesLabel,
        campDetailUrl,
        registrationUrl
    });
    const uid = `reg-${campId || 'camp'}-${entryId || 'entry'}-${registrationDate}T${registrationTime}@a2campfinder`;
    const now = formatIcsUtcStamp(Date.now());

    return [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//A2CampFinder//Registration Reminder//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${now}`,
        `DTSTART;TZID=${REGISTRATION_CALENDAR_TZ}:${formatIcsLocalDateTime(startWall)}`,
        `DTEND;TZID=${REGISTRATION_CALENDAR_TZ}:${formatIcsLocalDateTime(endWall)}`,
        `SUMMARY:${escapeIcsText(title)}`,
        `DESCRIPTION:${escapeIcsText(description)}`,
        registrationUrl ? `URL:${registrationUrl}` : '',
        'END:VEVENT',
        'END:VCALENDAR'
    ].filter(Boolean).join('\r\n') + '\r\n';
}

/**
 * @param {object} params — same shape as buildRegistrationIcs
 * @returns {string}
 */
function buildGoogleCalendarUrl(params) {
    const {
        campName,
        childName,
        registrationDate,
        registrationTime,
        campDetailUrl = '',
        registrationUrl = '',
        planDatesLabel = ''
    } = params;

    const { startMs, endMs } = getRegistrationEventWindowMs(registrationDate, registrationTime);
    const startWall = utcMsToWallParts(startMs);
    const endWall = utcMsToWallParts(endMs);
    const dates =
        `${formatIcsLocalDateTime(startWall)}/${formatIcsLocalDateTime(endWall)}`;
    const title = buildRegistrationEventTitle(campName, childName);
    const details = buildRegistrationEventDescription({
        campName,
        childName,
        planDatesLabel,
        campDetailUrl,
        registrationUrl
    });

    const q = new URLSearchParams({
        action: 'TEMPLATE',
        text: title,
        dates,
        ctz: REGISTRATION_CALENDAR_TZ,
        details
    });
    if (registrationUrl) q.set('location', registrationUrl);

    return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

/**
 * @param {string} campName
 * @param {string} childName
 * @returns {string}
 */
function getIcsFilename(campName, childName) {
    const slug = (s) =>
        String(s || '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 40) || 'camp';
    return `registration-${slug(childName)}-${slug(campName)}.ics`;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        REGISTRATION_CALENDAR_TZ,
        REGISTRATION_WINDOW_MINUTES,
        parseRegistrationOpensTime,
        formatTimeForInput,
        parseWallDateTime,
        getRegistrationEventWindowMs,
        isRegistrationInPast,
        buildRegistrationEventTitle,
        buildRegistrationEventDescription,
        buildRegistrationIcs,
        buildGoogleCalendarUrl,
        getIcsFilename
    };
}
