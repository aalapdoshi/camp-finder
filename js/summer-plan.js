// summer-plan.js - Supabase CRUD for summer plan + shared add-to-plan modal
// Requires: auth.js (initSupabase, getSession), Supabase client

const MAX_CHILD_NAMES = 6;
const MAX_PLAN_NOTE_LENGTH = 500;
const MAX_CUSTOM_CAMP_NAME_LENGTH = 200;
const MAX_CUSTOM_LOCATION_LENGTH = 200;
const PERSONAL_PLAN_TYPES = ['custom', 'vacation', 'no_camp'];
const SUMMER_PLAN_LAST_CHILD_KEY = 'summerPlanLastChildName';
/** Allowed Summer Plan years (sidebar switcher). */
const PLAN_YEARS = [2026, 2027];
const DEFAULT_PLAN_YEAR = 2027;
const SUMMER_PLAN_YEAR_KEY = 'summerPlanYear';

const CHILD_COLORS = [
    '#2563eb',
    '#10b981',
    '#d97706',
    '#7c3aed',
    '#db2777',
    '#0891b2'
];

function normalizeChildName(name) {
    return (name || '').trim();
}

/**
 * Catalog rows omit entry_type until the personal-plan migration is read back.
 * @param {{ entry_type?: string }|null|undefined} entry
 * @returns {'catalog'|'custom'|'vacation'|'no_camp'}
 */
function getPlanEntryType(entry) {
    const type = entry?.entry_type;
    if (type === 'custom' || type === 'vacation' || type === 'no_camp') return type;
    return 'catalog';
}

function isPersonalPlanEntry(entry) {
    return PERSONAL_PLAN_TYPES.includes(getPlanEntryType(entry));
}

/** Vacation and No Camp show for every child filter. */
function isFamilyWidePlanEntry(entry) {
    const type = getPlanEntryType(entry);
    return type === 'vacation' || type === 'no_camp';
}

/**
 * @param {object|null|undefined} entry
 * @param {Map<string, object>|null|undefined} campById
 * @returns {string}
 */
function planEntryDisplayName(entry, campById) {
    const type = getPlanEntryType(entry);
    if (type === 'vacation') return 'Vacation';
    if (type === 'no_camp') return 'No Camp';
    if (type === 'custom') return normalizeChildName(entry?.custom_name) || 'Custom camp';
    const camp = campById?.get?.(entry?.camp_id);
    return camp?.fields?.['Camp Name'] ?? 'Unknown camp';
}

function planEntryLocation(entry) {
    return normalizeChildName(entry?.custom_location);
}

/**
 * @param {string|null|undefined} value
 * @returns {{ ok: boolean, error?: string, value?: string }}
 */
function parseCustomCampName(value) {
    const str = normalizeChildName(value);
    if (!str) return { ok: false, error: 'Please enter a camp name.' };
    if (str.length > MAX_CUSTOM_CAMP_NAME_LENGTH) {
        return { ok: false, error: `Name must be ${MAX_CUSTOM_CAMP_NAME_LENGTH} characters or fewer.` };
    }
    return { ok: true, value: str };
}

/**
 * @param {string|null|undefined} value
 * @returns {{ ok: boolean, error?: string, value?: string|null }}
 */
function parseCustomLocation(value) {
    const str = normalizeChildName(value);
    if (str.length > MAX_CUSTOM_LOCATION_LENGTH) {
        return { ok: false, error: `Location must be ${MAX_CUSTOM_LOCATION_LENGTH} characters or fewer.` };
    }
    return { ok: true, value: str || null };
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Deterministic color for a child name (calendar/list accents).
 * @param {string|null} childName
 * @returns {string} hex color
 */
function getChildColor(childName) {
    const name = normalizeChildName(childName);
    if (!name) return '#9ca3af';
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return CHILD_COLORS[Math.abs(hash) % CHILD_COLORS.length];
}

/** Light fill for calendar entry backgrounds. */
function getChildBackgroundColor(childName) {
    const name = normalizeChildName(childName);
    if (!name) return '#f3f4f6';
    return `color-mix(in srgb, ${getChildColor(name)} 20%, white)`;
}

/** Left accent for booked vs want-to-book (camp/status). */
function getStatusAccentColor(status) {
    return status === 'booked' ? '#059669' : '#d97706';
}

/**
 * Unique non-empty child names from plan rows.
 * @param {Array<{ child_name?: string|null }>} entries
 * @returns {string[]}
 */
function distinctChildNamesFromEntries(entries) {
    const set = new Set();
    for (const e of entries || []) {
        const n = normalizeChildName(e.child_name);
        if (n) set.add(n);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
}

/**
 * @param {string} newName
 * @param {string[]} existingNames - already normalized
 * @returns {{ ok: boolean, error?: string, name?: string }}
 */
function validateChildNameForAdd(newName, existingNames) {
    const name = normalizeChildName(newName);
    if (!name) return { ok: true, name: null };
    if (name.length > 80) {
        return { ok: false, error: 'Child name must be 80 characters or fewer.' };
    }
    const exists = existingNames.some(n => n.toLowerCase() === name.toLowerCase());
    if (!exists && existingNames.length >= MAX_CHILD_NAMES) {
        return {
            ok: false,
            error: `You can use up to ${MAX_CHILD_NAMES} different child names on your plan.`
        };
    }
    const canonical = existingNames.find(n => n.toLowerCase() === name.toLowerCase()) || name;
    return { ok: true, name: canonical };
}

/**
 * User-entered total for one plan entry (entire camp stint). Not per day or per week;
 * never derived from camp catalog fields or date span.
 * @param {{ estimated_cost?: number|string|null }} entry
 * @returns {number}
 */
function getEntryEstimatedCost(entry) {
    const n = Number(entry?.estimated_cost);
    return Number.isFinite(n) ? n : 0;
}

/**
 * Parse cost input; empty → 0 for sum-ready totals.
 * @param {string|number|null|undefined} value
 * @returns {{ ok: boolean, error?: string, value?: number }}
 */
function parseEstimatedCostInput(value) {
    const str = value == null ? '' : String(value).trim();
    if (str === '') return { ok: true, value: 0 };
    const num = Number(str);
    if (!Number.isFinite(num) || num < 0) {
        return { ok: false, error: 'Please enter a valid cost (0 or greater).' };
    }
    return { ok: true, value: num };
}

/**
 * Modal cost field starts empty — user enters their total for this plan entry.
 * Camp catalog rates (per day/week) are not copied; list, calendar, and totals use only saved `estimated_cost`.
 * @param {object|null} _fields - unused; kept for call-site compatibility
 * @returns {string} always ''
 */
function getDefaultEstimatedCostFromCampFields(_fields) {
    return '';
}

/**
 * @param {string|number|null|undefined} value
 * @returns {{ ok: boolean, error?: string, value?: string|null }}
 */
function parseNotesInput(value) {
    const str = value == null ? '' : String(value).trim();
    if (str === '') return { ok: true, value: null };
    if (str.length > MAX_PLAN_NOTE_LENGTH) {
        return { ok: false, error: `Note must be ${MAX_PLAN_NOTE_LENGTH} characters or fewer.` };
    }
    return { ok: true, value: str };
}

/**
 * @param {{ notes?: string|null }} entry
 * @returns {string|null}
 */
function getEntryNotes(entry) {
    const n = entry?.notes;
    if (n == null || String(n).trim() === '') return null;
    return String(n).trim();
}

/**
 * @param {string|null|undefined} text
 * @param {number} [maxLen=80]
 * @returns {string}
 */
function truncatePlanNote(text, maxLen = 80) {
    if (!text) return '';
    const t = String(text);
    if (t.length <= maxLen) return t;
    return t.slice(0, maxLen - 1) + '…';
}

/**
 * Get plan entries for the current user.
 * @param {{ childName?: string }} [options] - omitted/'all' = all; 'unassigned' = null names; else exact name
 */
async function getPlanEntries(options = {}) {
    const session = await getSession();
    if (!session?.user?.id) return [];

    const client = initSupabase();
    if (!client) return [];

    const filter = options.childName;

    try {
        let query = client
            .from('summer_plan')
            .select('id, camp_id, entry_type, custom_name, custom_location, start_date, end_date, status, notes, child_name, estimated_cost, created_at')
            .eq('user_id', session.user.id);

        if (filter === 'unassigned') {
            query = query.is('child_name', null);
        } else if (filter && filter !== 'all') {
            query = query.eq('child_name', filter);
        }

        const { data, error } = await query.order('start_date', { ascending: true });

        if (error) {
            console.error('Error fetching summer plan:', error);
            return [];
        }
        return data || [];
    } catch (err) {
        console.error('Error in getPlanEntries:', err);
        return [];
    }
}

/**
 * Distinct child names on the user's plan (for dropdowns).
 * @returns {Promise<string[]>}
 */
async function getDistinctChildNames() {
    const entries = await getPlanEntries();
    return distinctChildNamesFromEntries(entries);
}

/**
 * @param {string} campId
 * @param {string} startDate
 * @param {string|null} endDate
 * @param {string} status
 * @param {string} childName - required non-empty
 * @param {number} [estimatedCost=0]
 * @param {string|null} [notes=null]
 */
async function addPlanEntry(campId, startDate, endDate, status, childName, estimatedCost = 0, notes = null) {
    const session = await getSession();
    if (!session?.user?.id) return false;

    const client = initSupabase();
    if (!client) return false;

    const existing = await getDistinctChildNames();
    const validated = validateChildNameForAdd(childName || '', existing);
    if (!validated.ok || !validated.name) {
        console.error('Invalid or missing child name:', validated.error);
        return false;
    }

    const costParsed = parseEstimatedCostInput(estimatedCost);
    if (!costParsed.ok) {
        console.error('Invalid estimated cost:', costParsed.error);
        return false;
    }

    const notesParsed = parseNotesInput(notes);
    if (!notesParsed.ok) {
        console.error('Invalid note:', notesParsed.error);
        return false;
    }

    try {
        const row = {
            user_id: session.user.id,
            camp_id: campId,
            start_date: startDate,
            end_date: endDate || null,
            status: status || 'want_to_book',
            child_name: validated.name,
            estimated_cost: costParsed.value,
            notes: notesParsed.value
        };

        const { error } = await client.from('summer_plan').insert(row);

        if (error) {
            console.error('Error adding plan entry:', error);
            return false;
        }

        try {
            sessionStorage.setItem(SUMMER_PLAN_LAST_CHILD_KEY, validated.name);
        } catch (_) { /* ignore */ }
        return true;
    } catch (err) {
        console.error('Error in addPlanEntry:', err);
        return false;
    }
}

/**
 * Insert one personal plan row (custom camp, Vacation, or No Camp).
 * Custom requires a child and a status. Vacation and No Camp are family-wide and booked.
 * @param {{
 *   entryType: 'custom'|'vacation'|'no_camp',
 *   customName?: string,
 *   customLocation?: string,
 *   startDate: string,
 *   endDate?: string|null,
 *   status?: string,
 *   childName?: string,
 *   estimatedCost?: number|string
 * }} input
 * @returns {Promise<boolean>}
 */
async function addPersonalPlanEntry(input) {
    const session = await getSession();
    if (!session?.user?.id) return false;

    const client = initSupabase();
    if (!client) return false;

    const entryType = input?.entryType === 'vacation' || input?.entryType === 'no_camp'
        ? input.entryType
        : 'custom';

    const locationParsed = parseCustomLocation(input?.customLocation);
    if (!locationParsed.ok) {
        console.error('Invalid location:', locationParsed.error);
        return false;
    }

    const costParsed = parseEstimatedCostInput(input?.estimatedCost);
    if (!costParsed.ok) {
        console.error('Invalid estimated cost:', costParsed.error);
        return false;
    }

    let customName = null;
    let childName = null;
    let status = 'booked';

    if (entryType === 'custom') {
        const nameParsed = parseCustomCampName(input?.customName);
        if (!nameParsed.ok) {
            console.error('Invalid custom camp name:', nameParsed.error);
            return false;
        }
        customName = nameParsed.value;
        const existing = await getDistinctChildNames();
        const validated = validateChildNameForAdd(input?.childName || '', existing);
        if (!validated.ok || !validated.name) {
            console.error('Invalid or missing child name:', validated.error);
            return false;
        }
        childName = validated.name;
        status = input?.status === 'booked' ? 'booked' : 'want_to_book';
    }

    try {
        const row = {
            user_id: session.user.id,
            camp_id: null,
            entry_type: entryType,
            custom_name: customName,
            custom_location: locationParsed.value,
            start_date: input.startDate,
            end_date: input.endDate || null,
            status,
            child_name: childName,
            estimated_cost: costParsed.value,
            notes: null
        };

        const { error } = await client.from('summer_plan').insert(row);
        if (error) {
            console.error('Error adding personal plan entry:', error);
            return false;
        }

        if (childName) {
            try {
                sessionStorage.setItem(SUMMER_PLAN_LAST_CHILD_KEY, childName);
            } catch (_) { /* ignore */ }
        }
        return true;
    } catch (err) {
        console.error('Error in addPersonalPlanEntry:', err);
        return false;
    }
}

/**
 * @param {string} id
 * @param {object} updates - { start_date?, end_date?, status?, child_name?, estimated_cost?, notes? }
 */
async function updatePlanEntry(id, updates) {
    const session = await getSession();
    if (!session?.user?.id) return false;

    const client = initSupabase();
    if (!client) return false;

    const payload = { ...updates };
    if (updates.child_name !== undefined) {
        if (!normalizeChildName(updates.child_name)) return false;
        const existing = await getDistinctChildNames();
        const validated = validateChildNameForAdd(updates.child_name, existing);
        if (!validated.ok || !validated.name) return false;
        payload.child_name = validated.name;
    }
    if (updates.estimated_cost !== undefined) {
        const costParsed = parseEstimatedCostInput(updates.estimated_cost);
        if (!costParsed.ok) return false;
        payload.estimated_cost = costParsed.value;
    }
    if (updates.notes !== undefined) {
        const notesParsed = parseNotesInput(updates.notes);
        if (!notesParsed.ok) return false;
        payload.notes = notesParsed.value;
    }
    if (updates.custom_location !== undefined) {
        const locationParsed = parseCustomLocation(updates.custom_location);
        if (!locationParsed.ok) return false;
        payload.custom_location = locationParsed.value;
    }

    try {
        const { error } = await client
            .from('summer_plan')
            .update(payload)
            .eq('id', id)
            .eq('user_id', session.user.id);

        if (error) {
            console.error('Error updating plan entry:', error);
            return false;
        }
        return true;
    } catch (err) {
        console.error('Error in updatePlanEntry:', err);
        return false;
    }
}

async function removePlanEntry(id) {
    const session = await getSession();
    if (!session?.user?.id) return false;

    const client = initSupabase();
    if (!client) return false;

    try {
        const { error } = await client
            .from('summer_plan')
            .delete()
            .eq('id', id)
            .eq('user_id', session.user.id);

        if (error) {
            console.error('Error removing plan entry:', error);
            return false;
        }
        return true;
    } catch (err) {
        console.error('Error in removePlanEntry:', err);
        return false;
    }
}

function formatWeekOf(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T12:00:00');
    const options = { month: 'short', day: 'numeric' };
    return 'Week of ' + d.toLocaleDateString('en-US', options);
}

function formatDateRange(startStr, endStr) {
    if (!startStr) return '';
    const start = new Date(startStr + 'T12:00:00');
    const opt = { month: 'short', day: 'numeric' };
    if (!endStr || endStr === startStr) {
        return start.toLocaleDateString('en-US', opt);
    }
    const end = new Date(endStr + 'T12:00:00');
    return start.toLocaleDateString('en-US', opt) + '–' + end.toLocaleDateString('en-US', opt);
}

function isAllowedPlanYear(year) {
    const y = Number(year);
    return PLAN_YEARS.includes(y);
}

function normalizePlanYear(year) {
    const y = Number(year);
    return isAllowedPlanYear(y) ? y : DEFAULT_PLAN_YEAR;
}

/** Calendar year from ISO date string (YYYY-MM-DD). */
function yearFromDate(isoDate) {
    if (!isoDate || typeof isoDate !== 'string' || isoDate.length < 4) return null;
    const y = Number(isoDate.slice(0, 4));
    return Number.isFinite(y) ? y : null;
}

function filterEntriesByYear(entries, year) {
    const y = normalizePlanYear(year);
    return (entries || []).filter((e) => yearFromDate(e.start_date) === y);
}

/** Default start date for Add to Plan: June 1 of the given year. */
function defaultSummerStartDate(year) {
    const y = normalizePlanYear(year);
    return `${y}-06-01`;
}

function getStoredPlanYear() {
    try {
        return normalizePlanYear(sessionStorage.getItem(SUMMER_PLAN_YEAR_KEY));
    } catch (_) {
        return DEFAULT_PLAN_YEAR;
    }
}

function setStoredPlanYear(year) {
    try {
        sessionStorage.setItem(SUMMER_PLAN_YEAR_KEY, String(normalizePlanYear(year)));
    } catch (_) { /* ignore */ }
}

/**
 * Year for Add to Plan date defaults: explicit option, else active plan year on
 * summer-plan page, else DEFAULT_PLAN_YEAR (browse / detail / favorites).
 */
function resolveAddToPlanDefaultYear(options) {
    if (options && typeof options === 'object' && options.planYear != null) {
        return normalizePlanYear(options.planYear);
    }
    if (typeof window !== 'undefined' && window.location.pathname.includes('summer-plan')) {
        return getStoredPlanYear();
    }
    return DEFAULT_PLAN_YEAR;
}

/** YYYY-MM-DD from local calendar fields (noon dates; avoids UTC day shift). */
function toLocalIsoDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

/**
 * Monday–Sunday week rows covering Jun 1 – Aug 31 of the given year.
 * Starts on the Monday on or before June 1 so a Tuesday June 1 (e.g. 2027)
 * does not shift every heading and file Mon–Fri camps under the previous week.
 */
function getSummerWeeks(year) {
    const y = normalizePlanYear(year);
    const weeks = [];
    const summerEnd = new Date(`${y}-08-31T12:00:00`);
    let d = new Date(`${y}-06-01T12:00:00`);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));

    while (d <= summerEnd) {
        const sun = new Date(d);
        sun.setDate(sun.getDate() + 6);
        const startStr = toLocalIsoDate(d);
        weeks.push({
            label: formatWeekOf(startStr),
            startDate: startStr,
            endDate: toLocalIsoDate(sun)
        });
        d.setDate(d.getDate() + 7);
    }
    return weeks;
}

function dateRangeOverlapsWeek(entryStart, entryEnd, weekStart, weekEnd) {
    const es = entryStart || entryEnd;
    const ee = entryEnd || entryStart;
    return es <= weekEnd && ee >= weekStart;
}

/**
 * @param {string} campId
 * @param {string} campName
 * @param {string|{ preferredChildName?: string, campFields?: object, planYear?: number }|null} [options]
 */
async function openAddToPlanModal(campId, campName, options = null) {
    const session = await getSession();
    if (!session?.user?.id) {
        const currentPage = window.location.pathname.split('/').pop() || 'browse.html';
        window.location.href = `login.html?redirectTo=${encodeURIComponent(currentPage)}`;
        return;
    }

    let preferredChildName = null;
    let campFields = null;
    if (typeof options === 'string') {
        preferredChildName = options;
    } else if (options && typeof options === 'object') {
        preferredChildName = options.preferredChildName ?? null;
        campFields = options.campFields ?? null;
    }
    const defaultYear = resolveAddToPlanDefaultYear(
        typeof options === 'object' && options ? options : null
    );
    const defaultStart = defaultSummerStartDate(defaultYear);

    let backdrop = document.getElementById('add-to-plan-backdrop');
    let modal = document.getElementById('add-to-plan-modal');

    if (!modal || !modal.querySelector('.add-to-plan-dialog')) {
        if (backdrop) backdrop.remove();
        if (modal) modal.remove();
        backdrop = null;
        modal = null;
    }

    if (!backdrop || !modal) {
        backdrop = document.createElement('div');
        backdrop.id = 'add-to-plan-backdrop';
        backdrop.className = 'add-to-plan-backdrop';
        modal = document.createElement('div');
        modal.id = 'add-to-plan-modal';
        modal.className = 'add-to-plan-modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-labelledby', 'add-to-plan-title');
        modal.setAttribute('aria-modal', 'true');
        modal.innerHTML = `
            <div class="add-to-plan-dialog">
                <header class="add-to-plan-header">
                    <div>
                        <h2 id="add-to-plan-title" class="add-to-plan-title">Add to Summer Plan</h2>
                        <p class="add-to-plan-camp-name" id="add-to-plan-camp-name"></p>
                    </div>
                    <button type="button" class="add-to-plan-close" aria-label="Close">
                        <span class="material-symbols-outlined" aria-hidden="true">close</span>
                    </button>
                </header>
                <form id="add-to-plan-form" class="add-to-plan-form">
                    <div class="add-to-plan-body">
                        <div id="add-to-plan-child-field" class="add-to-plan-field"></div>
                        <div class="add-to-plan-date-row">
                            <div class="add-to-plan-field">
                                <label for="add-to-plan-start">Start Date</label>
                                <input type="date" id="add-to-plan-start" required>
                            </div>
                            <div class="add-to-plan-field">
                                <label for="add-to-plan-end">End Date</label>
                                <input type="date" id="add-to-plan-end">
                            </div>
                        </div>
                        <div class="add-to-plan-field">
                            <label for="add-to-plan-cost">Total Estimated Cost ($)</label>
                            <div class="add-to-plan-cost-wrap">
                                <span class="add-to-plan-cost-prefix" aria-hidden="true">$</span>
                                <input type="number" id="add-to-plan-cost" min="0" step="1" placeholder="0">
                            </div>
                            <p class="add-to-plan-field-hint">One total for this camp on your plan — not per day or week. This amount is shown on the calendar, list, and cost total.</p>
                        </div>
                        <div class="add-to-plan-field">
                            <label for="add-to-plan-notes">Note (optional)</label>
                            <textarea id="add-to-plan-notes" class="add-to-plan-notes" maxlength="${MAX_PLAN_NOTE_LENGTH}" rows="3" placeholder="e.g. registration reminder, carpool"></textarea>
                            <p class="add-to-plan-field-hint">Up to ${MAX_PLAN_NOTE_LENGTH} characters.</p>
                        </div>
                        <div class="add-to-plan-field">
                            <span class="add-to-plan-field-label">Status</span>
                            <input type="hidden" id="add-to-plan-status" value="want_to_book">
                            <div class="add-to-plan-status-segment" role="group" aria-label="Booking status">
                                <button type="button" class="add-to-plan-status-btn active" data-status="want_to_book">Want to book</button>
                                <button type="button" class="add-to-plan-status-btn" data-status="booked">Booked</button>
                            </div>
                        </div>
                        <div id="add-to-plan-error" class="add-to-plan-error" style="display:none;"></div>
                    </div>
                    <footer class="add-to-plan-footer">
                        <button type="submit" class="add-to-plan-submit">Add to Plan</button>
                        <button type="button" class="add-to-plan-cancel">Cancel</button>
                    </footer>
                </form>
            </div>
        `;
        document.body.appendChild(backdrop);
        document.body.appendChild(modal);

        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) closeAddToPlanModal();
        });
        modal.querySelector('.add-to-plan-close').addEventListener('click', closeAddToPlanModal);
        modal.querySelector('.add-to-plan-cancel').addEventListener('click', closeAddToPlanModal);
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('active')) closeAddToPlanModal();
        });
        modal.querySelector('#add-to-plan-form').addEventListener('submit', handleAddToPlanSubmit);
        wireAddToPlanStatusSegment(modal);
    }

    modal.dataset.campId = campId;
    let lastChild = preferredChildName;
    if (!lastChild) {
        try {
            lastChild = sessionStorage.getItem(SUMMER_PLAN_LAST_CHILD_KEY);
        } catch (_) { /* ignore */ }
    }
    modal.dataset.preferredChildName = lastChild || '';

    const nameEl = document.getElementById('add-to-plan-camp-name');
    if (nameEl) nameEl.textContent = campName || 'Camp';

    const startInput = document.getElementById('add-to-plan-start');
    const endInput = document.getElementById('add-to-plan-end');
    const costInput = document.getElementById('add-to-plan-cost');
    const notesInput = document.getElementById('add-to-plan-notes');
    // Default into summer of active/default year; user may change freely.
    if (startInput) startInput.value = defaultStart;
    if (endInput) endInput.value = '';
    if (costInput) costInput.value = getDefaultEstimatedCostFromCampFields(campFields);
    if (notesInput) notesInput.value = '';

    setAddToPlanStatus('want_to_book');

    const errEl = document.getElementById('add-to-plan-error');
    if (errEl) {
        errEl.textContent = '';
        errEl.style.display = 'none';
    }

    await renderAddToPlanChildField(modal);

    document.body.style.overflow = 'hidden';
    backdrop.classList.add('active');
    modal.classList.add('active');
}

function wireAddToPlanStatusSegment(modal) {
    const hidden = modal.querySelector('#add-to-plan-status');
    modal.querySelectorAll('.add-to-plan-status-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            setAddToPlanStatus(btn.dataset.status);
            if (hidden) hidden.value = btn.dataset.status;
        });
    });
}

function setAddToPlanStatus(status) {
    const value = status === 'booked' ? 'booked' : 'want_to_book';
    const modal = document.getElementById('add-to-plan-modal');
    const hidden = modal?.querySelector('#add-to-plan-status');
    if (hidden) hidden.value = value;
    modal?.querySelectorAll('.add-to-plan-status-btn').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.status === value);
    });
}

async function handleAddToPlanSubmit(e) {
    e.preventDefault();
    const modal = document.getElementById('add-to-plan-modal');
    const startInput = document.getElementById('add-to-plan-start');
    const endInput = document.getElementById('add-to-plan-end');
    const costInput = document.getElementById('add-to-plan-cost');
    const notesInput = document.getElementById('add-to-plan-notes');
    const statusInput = document.getElementById('add-to-plan-status');
    const startDate = startInput?.value;
    const endDate = endInput?.value || null;
    const status = statusInput?.value || 'want_to_book';

    if (!startDate) return;

    if (endDate && endDate < startDate) {
        showAddToPlanError('End date must be on or after start date.');
        return;
    }

    const costResult = parseEstimatedCostInput(costInput?.value);
    if (!costResult.ok) {
        showAddToPlanError(costResult.error || 'Please enter a valid cost.');
        return;
    }

    const notesResult = parseNotesInput(notesInput?.value);
    if (!notesResult.ok) {
        showAddToPlanError(notesResult.error || 'Please shorten your note.');
        return;
    }

    const resolvedSession = await getSession();
    if (!resolvedSession?.user?.id) return;

    const childResult = await resolveAddToPlanChildName();
    if (!childResult.ok || !childResult.childName) {
        showAddToPlanError(childResult.error || 'Please select or add a child.');
        return;
    }

    const campIdVal = modal?.dataset.campId;
    const ok = await addPlanEntry(
        campIdVal,
        startDate,
        endDate,
        status,
        childResult.childName,
        costResult.value,
        notesResult.value
    );
    if (ok) {
        closeAddToPlanModal();
        if (typeof onPlanEntryAdded === 'function') onPlanEntryAdded();
        if (window.location.pathname.includes('summer-plan')) {
            window.location.reload();
        }
    } else {
        showAddToPlanError('Could not add. Please try again.');
    }
}

function showAddToPlanError(message) {
    const errEl = document.getElementById('add-to-plan-error');
    if (errEl) {
        errEl.textContent = message;
        errEl.style.display = 'block';
    }
}

function getAddToPlanChildSelection() {
    const field = document.getElementById('add-to-plan-child-field');
    return field?.dataset.selectedChild || '';
}

function setAddToPlanChildSelection(value) {
    const field = document.getElementById('add-to-plan-child-field');
    if (field) field.dataset.selectedChild = value;
    const chips = field?.querySelectorAll('.add-to-plan-child-chip');
    chips?.forEach((chip) => {
        const isNew = chip.dataset.childValue === '__new__';
        const isActive = chip.dataset.childValue === value;
        chip.classList.toggle('active', isActive);
        chip.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
    const newInput = document.getElementById('add-to-plan-child-new');
    const showNew = value === '__new__';
    if (newInput) {
        newInput.style.display = showNew ? 'block' : 'none';
        newInput.required = showNew;
        if (showNew) newInput.focus();
    }
}

async function renderAddToPlanChildField(modal) {
    const container = document.getElementById('add-to-plan-child-field');
    if (!container) return;

    const names = await getDistinctChildNames();
    const preferred = modal?.dataset.preferredChildName || '';
    const preferredInList = names.some(n => n.toLowerCase() === preferred.toLowerCase());

    let defaultSelection = '__new__';
    if (names.length === 1 && !preferred) {
        defaultSelection = names[0];
    } else if (preferredInList) {
        defaultSelection = names.find(n => n.toLowerCase() === preferred.toLowerCase());
    } else if (names.length > 0 && !preferred) {
        defaultSelection = names[0];
    }

    const chipsHtml = names.map((n) => {
        const safeAttr = n.replace(/"/g, '&quot;');
        return `<button type="button" class="add-to-plan-child-chip" data-child-value="${safeAttr}" aria-pressed="false">${escapeHtml(n)}</button>`;
    }).join('');

    container.innerHTML = `
        <span class="add-to-plan-field-label">Select Child</span>
        <div class="add-to-plan-child-chips" role="group" aria-label="Select child">
            ${chipsHtml}
            <button type="button" class="add-to-plan-child-chip add-to-plan-child-chip-new" data-child-value="__new__" aria-pressed="false">
                <span class="material-symbols-outlined" aria-hidden="true">add</span> Add New
            </button>
        </div>
        <input type="text" id="add-to-plan-child-new" maxlength="80" placeholder="e.g. Emma" class="add-to-plan-child-new" style="display:none;">
        <p class="add-to-plan-field-hint">Up to ${MAX_CHILD_NAMES} different names on your plan.</p>
    `;

    const newInput = document.getElementById('add-to-plan-child-new');
    if (newInput && defaultSelection === '__new__' && preferred && !preferredInList) {
        newInput.value = preferred;
    }

    container.querySelectorAll('.add-to-plan-child-chip').forEach((chip) => {
        chip.addEventListener('click', () => {
            setAddToPlanChildSelection(chip.dataset.childValue);
        });
    });

    setAddToPlanChildSelection(defaultSelection);
}

async function resolveAddToPlanChildName() {
    const selection = getAddToPlanChildSelection();
    const newInput = document.getElementById('add-to-plan-child-new');

    if (!selection || selection === '__new__') {
        if (!normalizeChildName(newInput?.value)) {
            return { ok: false, error: 'Please enter a name for the child.' };
        }
        const existing = await getDistinctChildNames();
        const validated = validateChildNameForAdd(newInput?.value, existing);
        if (!validated.ok || !validated.name) {
            return { ok: false, error: validated.error || 'Please enter a valid child name.' };
        }
        return { ok: true, childName: validated.name };
    }

    return { ok: true, childName: selection };
}

function closeAddToPlanModal() {
    const backdrop = document.getElementById('add-to-plan-backdrop');
    const modal = document.getElementById('add-to-plan-modal');
    if (backdrop) backdrop.classList.remove('active');
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = '';
}

function formatEstimatedCostDisplay(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return '$0';
    return num === 0 ? '$0' : `$${num.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

/** Format saved plan-entry cost for list/calendar display. */
function formatEntryEstimatedCost(entry) {
    return formatEstimatedCostDisplay(getEntryEstimatedCost(entry));
}

/**
 * @param {{
 *   entryId: string,
 *   campName: string,
 *   childName?: string,
 *   startDate?: string,
 *   endDate?: string|null,
 *   currentNote?: string|null
 * }} options
 */
function openPlanNoteModal(options) {
    const {
        entryId,
        campName,
        childName = '',
        startDate = '',
        endDate = null,
        currentNote = null
    } = options || {};

    if (!entryId) return;

    let backdrop = document.getElementById('plan-note-backdrop');
    let modal = document.getElementById('plan-note-modal');

    if (!modal || !modal.querySelector('.plan-note-dialog')) {
        if (backdrop) backdrop.remove();
        if (modal) modal.remove();
        backdrop = null;
        modal = null;
    }

    if (!backdrop || !modal) {
        backdrop = document.createElement('div');
        backdrop.id = 'plan-note-backdrop';
        backdrop.className = 'plan-note-backdrop';
        modal = document.createElement('div');
        modal.id = 'plan-note-modal';
        modal.className = 'plan-note-modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-labelledby', 'plan-note-title');
        modal.setAttribute('aria-modal', 'true');
        modal.innerHTML = `
            <div class="plan-note-dialog">
                <header class="plan-note-header">
                    <div>
                        <h2 id="plan-note-title" class="plan-note-title">Camp note</h2>
                        <p class="plan-note-camp-name" id="plan-note-camp-name"></p>
                        <p class="plan-note-meta" id="plan-note-meta"></p>
                    </div>
                    <button type="button" class="plan-note-close" aria-label="Close">
                        <span class="material-symbols-outlined" aria-hidden="true">close</span>
                    </button>
                </header>
                <form id="plan-note-form" class="plan-note-form">
                    <div class="plan-note-body">
                        <div class="plan-note-field">
                            <label for="plan-note-text">Note</label>
                            <textarea id="plan-note-text" class="plan-note-text" maxlength="${MAX_PLAN_NOTE_LENGTH}" rows="5" placeholder="Add a note for this camp on your plan"></textarea>
                            <p class="plan-note-field-hint">Up to ${MAX_PLAN_NOTE_LENGTH} characters. Leave blank to remove a note.</p>
                        </div>
                        <div id="plan-note-error" class="plan-note-error" style="display:none;"></div>
                    </div>
                    <footer class="plan-note-footer">
                        <button type="submit" class="plan-note-submit">Save note</button>
                        <button type="button" class="plan-note-cancel">Cancel</button>
                    </footer>
                </form>
            </div>
        `;
        document.body.appendChild(backdrop);
        document.body.appendChild(modal);

        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) closePlanNoteModal();
        });
        modal.querySelector('.plan-note-close').addEventListener('click', closePlanNoteModal);
        modal.querySelector('.plan-note-cancel').addEventListener('click', closePlanNoteModal);
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('active')) closePlanNoteModal();
        });
        modal.querySelector('#plan-note-form').addEventListener('submit', handlePlanNoteSubmit);
    }

    modal.dataset.entryId = entryId;

    const campEl = document.getElementById('plan-note-camp-name');
    const metaEl = document.getElementById('plan-note-meta');
    const textEl = document.getElementById('plan-note-text');
    const errEl = document.getElementById('plan-note-error');

    if (campEl) campEl.textContent = campName || 'Camp';

    const childLabel = normalizeChildName(childName) || 'Unassigned';
    const datesLabel = formatDateRange(startDate, endDate);
    if (metaEl) metaEl.textContent = datesLabel ? `${childLabel} · ${datesLabel}` : childLabel;

    if (textEl) textEl.value = currentNote || '';
    if (errEl) {
        errEl.textContent = '';
        errEl.style.display = 'none';
    }

    document.body.style.overflow = 'hidden';
    backdrop.classList.add('active');
    modal.classList.add('active');
    textEl?.focus();
}

function showPlanNoteError(message) {
    const errEl = document.getElementById('plan-note-error');
    if (errEl) {
        errEl.textContent = message;
        errEl.style.display = 'block';
    }
}

async function handlePlanNoteSubmit(e) {
    e.preventDefault();
    const modal = document.getElementById('plan-note-modal');
    const textEl = document.getElementById('plan-note-text');
    const entryId = modal?.dataset.entryId;
    if (!entryId) return;

    const notesResult = parseNotesInput(textEl?.value);
    if (!notesResult.ok) {
        showPlanNoteError(notesResult.error || 'Please shorten your note.');
        return;
    }

    const ok = await updatePlanEntry(entryId, { notes: notesResult.value });
    if (ok) {
        closePlanNoteModal();
        if (typeof onPlanNoteSaved === 'function') onPlanNoteSaved();
    } else {
        showPlanNoteError('Could not save note. Please try again.');
    }
}

function closePlanNoteModal() {
    const backdrop = document.getElementById('plan-note-backdrop');
    const modal = document.getElementById('plan-note-modal');
    if (backdrop) backdrop.classList.remove('active');
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = '';
}

const PERSONAL_PLAN_TITLES = {
    custom: 'Add a Custom Camp',
    vacation: 'Add Vacation',
    no_camp: 'Add No Camp'
};

/**
 * Open the Summer Plan form for a custom camp, Vacation, or No Camp.
 * Dates should already be the week that launched the form.
 * @param {{ mode: 'custom'|'vacation'|'no_camp', startDate: string, endDate?: string }} options
 */
async function openPersonalPlanModal(options) {
    const mode = options?.mode === 'vacation' || options?.mode === 'no_camp' ? options.mode : 'custom';
    const session = await getSession();
    if (!session?.user?.id) {
        window.location.href = 'login.html?redirectTo=summer-plan.html';
        return;
    }

    let backdrop = document.getElementById('personal-plan-backdrop');
    let modal = document.getElementById('personal-plan-modal');

    if (!modal || !modal.querySelector('.add-to-plan-dialog')) {
        if (backdrop) backdrop.remove();
        if (modal) modal.remove();
        backdrop = null;
        modal = null;
    }

    if (!backdrop || !modal) {
        backdrop = document.createElement('div');
        backdrop.id = 'personal-plan-backdrop';
        backdrop.className = 'add-to-plan-backdrop';
        modal = document.createElement('div');
        modal.id = 'personal-plan-modal';
        modal.className = 'add-to-plan-modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-labelledby', 'personal-plan-title');
        modal.setAttribute('aria-modal', 'true');
        modal.innerHTML = `
            <div class="add-to-plan-dialog">
                <header class="add-to-plan-header">
                    <div>
                        <h2 id="personal-plan-title" class="add-to-plan-title">Add a Custom Camp</h2>
                        <p class="add-to-plan-camp-name" id="personal-plan-subtitle">Dates start as this week. You can change them.</p>
                    </div>
                    <button type="button" class="add-to-plan-close" aria-label="Close">
                        <span class="material-symbols-outlined" aria-hidden="true">close</span>
                    </button>
                </header>
                <form id="personal-plan-form" class="add-to-plan-form">
                    <div class="add-to-plan-body">
                        <div class="add-to-plan-field" id="personal-plan-name-field">
                            <label for="personal-plan-name">Camp name</label>
                            <input type="text" id="personal-plan-name" maxlength="${MAX_CUSTOM_CAMP_NAME_LENGTH}" placeholder="e.g. Neighborhood soccer">
                        </div>
                        <div id="personal-plan-child-field" class="add-to-plan-field"></div>
                        <div class="add-to-plan-date-row">
                            <div class="add-to-plan-field">
                                <label for="personal-plan-start">Start Date</label>
                                <input type="date" id="personal-plan-start" required>
                            </div>
                            <div class="add-to-plan-field">
                                <label for="personal-plan-end">End Date</label>
                                <input type="date" id="personal-plan-end">
                            </div>
                        </div>
                        <div class="add-to-plan-field" id="personal-plan-location-field">
                            <label for="personal-plan-location">Location (optional)</label>
                            <input type="text" id="personal-plan-location" maxlength="${MAX_CUSTOM_LOCATION_LENGTH}" placeholder="e.g. Ann Arbor">
                        </div>
                        <div class="add-to-plan-field" id="personal-plan-cost-field">
                            <label for="personal-plan-cost">Total Estimated Cost ($)</label>
                            <div class="add-to-plan-cost-wrap">
                                <span class="add-to-plan-cost-prefix" aria-hidden="true">$</span>
                                <input type="number" id="personal-plan-cost" min="0" step="1" placeholder="0">
                            </div>
                        </div>
                        <div class="add-to-plan-field" id="personal-plan-status-field">
                            <span class="add-to-plan-field-label">Status</span>
                            <input type="hidden" id="personal-plan-status" value="want_to_book">
                            <div class="add-to-plan-status-segment" role="group" aria-label="Booking status">
                                <button type="button" class="add-to-plan-status-btn active" data-status="want_to_book">Want to book</button>
                                <button type="button" class="add-to-plan-status-btn" data-status="booked">Booked</button>
                            </div>
                        </div>
                        <div class="add-to-plan-field" id="personal-plan-suggest-field">
                            <label class="personal-plan-suggest-label" for="personal-plan-suggest">
                                <input type="checkbox" id="personal-plan-suggest">
                                Suggest adding this camp to the catalog
                            </label>
                            <p class="add-to-plan-field-hint">We’ll email a2summercamp@umich.edu with the camp name, dates, location, and cost.</p>
                        </div>
                        <div id="personal-plan-error" class="add-to-plan-error" style="display:none;"></div>
                    </div>
                    <footer class="add-to-plan-footer">
                        <button type="submit" class="add-to-plan-submit">Add to Plan</button>
                        <button type="button" class="add-to-plan-cancel">Cancel</button>
                    </footer>
                </form>
            </div>
        `;
        document.body.appendChild(backdrop);
        document.body.appendChild(modal);

        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) closePersonalPlanModal();
        });
        modal.querySelector('.add-to-plan-close').addEventListener('click', closePersonalPlanModal);
        modal.querySelector('.add-to-plan-cancel').addEventListener('click', closePersonalPlanModal);
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('active')) closePersonalPlanModal();
        });
        modal.querySelector('#personal-plan-form').addEventListener('submit', handlePersonalPlanSubmit);
        modal.querySelectorAll('.add-to-plan-status-btn').forEach((btn) => {
            btn.addEventListener('click', () => setPersonalPlanStatus(btn.dataset.status));
        });
    }

    modal.dataset.mode = mode;
    const isCustom = mode === 'custom';
    const title = document.getElementById('personal-plan-title');
    if (title) title.textContent = PERSONAL_PLAN_TITLES[mode] || PERSONAL_PLAN_TITLES.custom;

    const nameField = document.getElementById('personal-plan-name-field');
    const nameInput = document.getElementById('personal-plan-name');
    const childField = document.getElementById('personal-plan-child-field');
    const locationField = document.getElementById('personal-plan-location-field');
    const costField = document.getElementById('personal-plan-cost-field');
    const statusField = document.getElementById('personal-plan-status-field');
    const suggestField = document.getElementById('personal-plan-suggest-field');
    const suggestInput = document.getElementById('personal-plan-suggest');
    if (nameField) nameField.hidden = !isCustom;
    if (locationField) locationField.hidden = !isCustom;
    if (costField) costField.hidden = !isCustom;
    if (nameInput) {
        nameInput.value = '';
        nameInput.required = isCustom;
    }
    if (childField) childField.hidden = !isCustom;
    if (statusField) statusField.hidden = !isCustom;
    if (suggestField) suggestField.hidden = !isCustom;
    if (suggestInput) suggestInput.checked = false;
    const childNew = document.getElementById('personal-plan-child-new');
    if (!isCustom && childNew) childNew.required = false;

    const startInput = document.getElementById('personal-plan-start');
    const endInput = document.getElementById('personal-plan-end');
    const locationInput = document.getElementById('personal-plan-location');
    const costInput = document.getElementById('personal-plan-cost');
    if (startInput) startInput.value = options?.startDate || '';
    if (endInput) endInput.value = options?.endDate || '';
    if (locationInput) locationInput.value = '';
    if (costInput) costInput.value = '';
    setPersonalPlanStatus('want_to_book');

    const errEl = document.getElementById('personal-plan-error');
    if (errEl) {
        errEl.textContent = '';
        errEl.style.display = 'none';
    }

    if (isCustom) await renderPersonalPlanChildField(modal);

    document.body.style.overflow = 'hidden';
    backdrop.classList.add('active');
    modal.classList.add('active');
    (isCustom ? nameInput : startInput)?.focus();
}

function setPersonalPlanStatus(status) {
    const value = status === 'booked' ? 'booked' : 'want_to_book';
    const modal = document.getElementById('personal-plan-modal');
    const hidden = modal?.querySelector('#personal-plan-status');
    if (hidden) hidden.value = value;
    modal?.querySelectorAll('.add-to-plan-status-btn').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.status === value);
    });
}

function showPersonalPlanError(message) {
    const errEl = document.getElementById('personal-plan-error');
    if (errEl) {
        errEl.textContent = message;
        errEl.style.display = 'block';
    }
}

function closePersonalPlanModal() {
    const backdrop = document.getElementById('personal-plan-backdrop');
    const modal = document.getElementById('personal-plan-modal');
    if (backdrop) backdrop.classList.remove('active');
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = '';
}

async function renderPersonalPlanChildField(modal) {
    const container = document.getElementById('personal-plan-child-field');
    if (!container) return;

    const names = await getDistinctChildNames();
    let preferred = '';
    try {
        preferred = sessionStorage.getItem(SUMMER_PLAN_LAST_CHILD_KEY) || '';
    } catch (_) { /* ignore */ }
    const preferredInList = names.some((n) => n.toLowerCase() === preferred.toLowerCase());

    let defaultSelection = '__new__';
    if (names.length === 1 && !preferred) {
        defaultSelection = names[0];
    } else if (preferredInList) {
        defaultSelection = names.find((n) => n.toLowerCase() === preferred.toLowerCase());
    } else if (names.length > 0 && !preferred) {
        defaultSelection = names[0];
    }

    const chipsHtml = names.map((n) => {
        const safeAttr = n.replace(/"/g, '&quot;');
        return `<button type="button" class="add-to-plan-child-chip" data-child-value="${safeAttr}" aria-pressed="false">${escapeHtml(n)}</button>`;
    }).join('');

    container.innerHTML = `
        <span class="add-to-plan-field-label">Select Child</span>
        <div class="add-to-plan-child-chips" role="group" aria-label="Select child">
            ${chipsHtml}
            <button type="button" class="add-to-plan-child-chip add-to-plan-child-chip-new" data-child-value="__new__" aria-pressed="false">
                <span class="material-symbols-outlined" aria-hidden="true">add</span> Add New
            </button>
        </div>
        <input type="text" id="personal-plan-child-new" maxlength="80" placeholder="e.g. Emma" class="add-to-plan-child-new" style="display:none;">
        <p class="add-to-plan-field-hint">Up to ${MAX_CHILD_NAMES} different names on your plan.</p>
    `;

    const newInput = document.getElementById('personal-plan-child-new');
    if (newInput && defaultSelection === '__new__' && preferred && !preferredInList) {
        newInput.value = preferred;
    }

    container.querySelectorAll('.add-to-plan-child-chip').forEach((chip) => {
        chip.addEventListener('click', () => setPersonalPlanChildSelection(chip.dataset.childValue));
    });
    setPersonalPlanChildSelection(defaultSelection);
    if (modal) modal.dataset.preferredChildName = preferred;
}

function setPersonalPlanChildSelection(value) {
    const field = document.getElementById('personal-plan-child-field');
    if (field) field.dataset.selectedChild = value;
    field?.querySelectorAll('.add-to-plan-child-chip').forEach((chip) => {
        const isActive = chip.dataset.childValue === value;
        chip.classList.toggle('active', isActive);
        chip.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
    const newInput = document.getElementById('personal-plan-child-new');
    const showNew = value === '__new__';
    if (newInput) {
        newInput.style.display = showNew ? 'block' : 'none';
        newInput.required = showNew;
        if (showNew) newInput.focus();
    }
}

async function resolvePersonalPlanChildName() {
    const field = document.getElementById('personal-plan-child-field');
    const selection = field?.dataset.selectedChild || '';
    const newInput = document.getElementById('personal-plan-child-new');

    if (!selection || selection === '__new__') {
        if (!normalizeChildName(newInput?.value)) {
            return { ok: false, error: 'Please enter a name for the child.' };
        }
        const existing = await getDistinctChildNames();
        const validated = validateChildNameForAdd(newInput?.value, existing);
        if (!validated.ok || !validated.name) {
            return { ok: false, error: validated.error || 'Please enter a valid child name.' };
        }
        return { ok: true, childName: validated.name };
    }

    return { ok: true, childName: selection };
}

async function handlePersonalPlanSubmit(e) {
    e.preventDefault();
    const modal = document.getElementById('personal-plan-modal');
    const mode = modal?.dataset.mode === 'vacation' || modal?.dataset.mode === 'no_camp'
        ? modal.dataset.mode
        : 'custom';
    const startDate = document.getElementById('personal-plan-start')?.value;
    const endDate = document.getElementById('personal-plan-end')?.value || null;

    if (!startDate) {
        showPersonalPlanError('Please choose a start date.');
        return;
    }
    if (endDate && endDate < startDate) {
        showPersonalPlanError('End date must be on or after start date.');
        return;
    }

    const payload = {
        entryType: mode,
        customLocation: null,
        startDate,
        endDate,
        estimatedCost: 0
    };

    if (mode === 'custom') {
        const locationParsed = parseCustomLocation(document.getElementById('personal-plan-location')?.value);
        if (!locationParsed.ok) {
            showPersonalPlanError(locationParsed.error || 'Please enter a shorter location.');
            return;
        }
        const costResult = parseEstimatedCostInput(document.getElementById('personal-plan-cost')?.value);
        if (!costResult.ok) {
            showPersonalPlanError(costResult.error || 'Please enter a valid cost.');
            return;
        }
        payload.customLocation = locationParsed.value;
        payload.estimatedCost = costResult.value;
        const nameParsed = parseCustomCampName(document.getElementById('personal-plan-name')?.value);
        if (!nameParsed.ok) {
            showPersonalPlanError(nameParsed.error || 'Please enter a camp name.');
            return;
        }
        const childResult = await resolvePersonalPlanChildName();
        if (!childResult.ok || !childResult.childName) {
            showPersonalPlanError(childResult.error || 'Please select or add a child.');
            return;
        }
        payload.customName = nameParsed.value;
        payload.childName = childResult.childName;
        payload.status = document.getElementById('personal-plan-status')?.value || 'want_to_book';
    }

    const suggestCatalog = mode === 'custom' && document.getElementById('personal-plan-suggest')?.checked;
    const ok = await addPersonalPlanEntry(payload);
    if (ok) {
        if (suggestCatalog) {
            try {
                await sendCampCatalogSuggestion({
                    campName: payload.customName,
                    location: payload.customLocation || '',
                    startDate: payload.startDate,
                    endDate: payload.endDate || '',
                    cost: payload.estimatedCost
                });
            } catch (err) {
                alert(err.message || 'The camp was added, but the suggestion email could not be sent.');
            }
        }
        closePersonalPlanModal();
        if (window.location.pathname.includes('summer-plan')) {
            window.location.reload();
        }
    } else {
        showPersonalPlanError('Could not add. Please try again.');
    }
}

/**
 * Email a2summercamp@umich.edu so a custom camp can be considered for the catalog.
 * @param {{ campName: string, location?: string, startDate: string, endDate?: string, cost?: number }} details
 */
async function sendCampCatalogSuggestion(details) {
    const session = await getSession();
    const token = session?.access_token;
    if (!token) throw new Error('Please log in again to send email.');

    const isLocal =
        window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const apiUrl = isLocal
        ? 'http://localhost:8888/.netlify/functions/send-camp-suggestion'
        : '/api/send-camp-suggestion';

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
            campName: details.campName,
            location: details.location || '',
            startDate: details.startDate,
            endDate: details.endDate || '',
            cost: Number(details.cost) || 0
        })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.error || 'Could not send email.');
    }
}
