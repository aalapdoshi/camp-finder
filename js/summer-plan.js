// summer-plan.js - Supabase CRUD for summer plan + shared add-to-plan modal
// Requires: auth.js (initSupabase, getSession), Supabase client

const MAX_CHILD_NAMES = 6;
const SUMMER_PLAN_LAST_CHILD_KEY = 'summerPlanLastChildName';

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
            .select('id, camp_id, start_date, end_date, status, notes, child_name, created_at')
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
 * @param {string|null} childName
 */
async function addPlanEntry(campId, startDate, endDate, status, childName = null) {
    const session = await getSession();
    if (!session?.user?.id) return false;

    const client = initSupabase();
    if (!client) return false;

    const existing = await getDistinctChildNames();
    const validated = validateChildNameForAdd(childName || '', existing);
    if (!validated.ok) {
        console.error('Invalid child name:', validated.error);
        return false;
    }

    try {
        const row = {
            user_id: session.user.id,
            camp_id: campId,
            start_date: startDate,
            end_date: endDate || null,
            status: status || 'want_to_book',
            child_name: validated.name
        };

        const { error } = await client.from('summer_plan').insert(row);

        if (error) {
            console.error('Error adding plan entry:', error);
            return false;
        }

        if (validated.name) {
            try {
                sessionStorage.setItem(SUMMER_PLAN_LAST_CHILD_KEY, validated.name);
            } catch (_) { /* ignore */ }
        }
        return true;
    } catch (err) {
        console.error('Error in addPlanEntry:', err);
        return false;
    }
}

/**
 * @param {string} id
 * @param {object} updates - { start_date?, end_date?, status?, child_name? }
 */
async function updatePlanEntry(id, updates) {
    const session = await getSession();
    if (!session?.user?.id) return false;

    const client = initSupabase();
    if (!client) return false;

    const payload = { ...updates };
    if (updates.child_name !== undefined) {
        const existing = await getDistinctChildNames();
        const validated = validateChildNameForAdd(updates.child_name, existing);
        if (!validated.ok) return false;
        payload.child_name = validated.name;
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

function getSummerWeeks2026() {
    const weeks = [];
    let d = new Date('2026-06-01');
    const end = new Date('2026-08-31');

    while (d <= end) {
        const mon = new Date(d);
        const sun = new Date(mon);
        sun.setDate(sun.getDate() + 6);
        const startStr = mon.toISOString().slice(0, 10);
        const endStr = sun.toISOString().slice(0, 10);
        weeks.push({
            label: formatWeekOf(startStr),
            startDate: startStr,
            endDate: endStr
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
 * @param {string|null} [preferredChildName]
 */
async function openAddToPlanModal(campId, campName, preferredChildName = null) {
    const session = await getSession();
    if (!session?.user?.id) {
        const currentPage = window.location.pathname.split('/').pop() || 'browse.html';
        window.location.href = `login.html?redirectTo=${encodeURIComponent(currentPage)}`;
        return;
    }

    let backdrop = document.getElementById('add-to-plan-backdrop');
    let modal = document.getElementById('add-to-plan-modal');

    if (!backdrop || !modal) {
        backdrop = document.createElement('div');
        backdrop.id = 'add-to-plan-backdrop';
        backdrop.className = 'feedback-backdrop';
        modal = document.createElement('div');
        modal.id = 'add-to-plan-modal';
        modal.className = 'feedback-modal add-to-plan-modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-labelledby', 'add-to-plan-title');
        modal.setAttribute('aria-modal', 'true');
        modal.innerHTML = `
            <button type="button" class="feedback-close add-to-plan-close" aria-label="Close">×</button>
            <h2 id="add-to-plan-title" class="feedback-title">Add to Summer Plan</h2>
            <p class="add-to-plan-camp-name" id="add-to-plan-camp-name"></p>
            <form id="add-to-plan-form" class="add-to-plan-form">
                <div id="add-to-plan-child-field" class="add-to-plan-field"></div>
                <div class="add-to-plan-field">
                    <label for="add-to-plan-start">Start date *</label>
                    <input type="date" id="add-to-plan-start" required>
                </div>
                <div class="add-to-plan-field">
                    <label for="add-to-plan-end">End date (optional)</label>
                    <input type="date" id="add-to-plan-end">
                </div>
                <div class="add-to-plan-field">
                    <label>Status</label>
                    <div class="add-to-plan-status-group">
                        <label class="add-to-plan-status-option">
                            <input type="radio" name="add-to-plan-status" value="booked"> Booked
                        </label>
                        <label class="add-to-plan-status-option">
                            <input type="radio" name="add-to-plan-status" value="want_to_book" checked> Want to book
                        </label>
                    </div>
                </div>
                <div id="add-to-plan-error" class="add-to-plan-error" style="display:none;"></div>
                <button type="submit" class="feedback-submit">Add to plan</button>
            </form>
        `;
        document.body.appendChild(backdrop);
        document.body.appendChild(modal);

        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) closeAddToPlanModal();
        });
        modal.querySelector('.add-to-plan-close').addEventListener('click', closeAddToPlanModal);
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('active')) closeAddToPlanModal();
        });
        modal.querySelector('#add-to-plan-form').addEventListener('submit', handleAddToPlanSubmit);
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
    if (startInput) startInput.value = '';
    if (endInput) endInput.value = '';

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

async function handleAddToPlanSubmit(e) {
    e.preventDefault();
    const modal = document.getElementById('add-to-plan-modal');
    const startInput = document.getElementById('add-to-plan-start');
    const endInput = document.getElementById('add-to-plan-end');
    const statusInput = modal?.querySelector('input[name="add-to-plan-status"]:checked');
    const startDate = startInput?.value;
    const endDate = endInput?.value || null;
    const status = statusInput?.value || 'want_to_book';

    if (!startDate) return;

    if (endDate && endDate < startDate) {
        showAddToPlanError('End date must be on or after start date.');
        return;
    }

    const resolvedSession = await getSession();
    if (!resolvedSession?.user?.id) return;

    const childResult = await resolveAddToPlanChildName();
    if (!childResult.ok) {
        showAddToPlanError(childResult.error || 'Please enter a valid child name.');
        return;
    }

    const campIdVal = modal?.dataset.campId;
    const ok = await addPlanEntry(campIdVal, startDate, endDate, status, childResult.childName);
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

async function renderAddToPlanChildField(modal) {
    const container = document.getElementById('add-to-plan-child-field');
    if (!container) return;

    const names = await getDistinctChildNames();
    const preferred = modal?.dataset.preferredChildName || '';
    const preferredInList = names.some(n => n.toLowerCase() === preferred.toLowerCase());

    const nameOptions = names
        .map(n => {
            const sel = preferredInList && n.toLowerCase() === preferred.toLowerCase() ? ' selected' : '';
            return `<option value="${escapeHtml(n)}"${sel}>${escapeHtml(n)}</option>`;
        })
        .join('');

    const defaultPick = !preferredInList && preferred ? '__new__' : (names.length === 1 && !preferred ? names[0] : '');

    container.innerHTML = `
        <label for="add-to-plan-child-select">Child</label>
        <select id="add-to-plan-child-select">
            <option value="">Unassigned</option>
            ${nameOptions}
            <option value="__new__"${defaultPick === '__new__' ? ' selected' : ''}>Add new name…</option>
        </select>
        <input type="text" id="add-to-plan-child-new" maxlength="80" placeholder="e.g. Emma" class="add-to-plan-child-new" style="display:none;">
        <p class="add-to-plan-field-hint">Up to ${MAX_CHILD_NAMES} different names on your plan.</p>
    `;

    const select = document.getElementById('add-to-plan-child-select');
    const newInput = document.getElementById('add-to-plan-child-new');

    if (select && defaultPick && defaultPick !== '__new__') {
        select.value = defaultPick;
    }

    if (select && newInput) {
        const toggleNew = () => {
            const isNew = select.value === '__new__';
            newInput.style.display = isNew ? 'block' : 'none';
            newInput.required = isNew;
            if (isNew) {
                newInput.value = preferredInList ? '' : (preferred || '');
                newInput.focus();
            }
        };
        select.addEventListener('change', toggleNew);
        toggleNew();
    }
}

async function resolveAddToPlanChildName() {
    const select = document.getElementById('add-to-plan-child-select');
    const newInput = document.getElementById('add-to-plan-child-new');
    if (!select) return { ok: true, childName: null };

    if (select.value === '') {
        return { ok: true, childName: null };
    }

    if (select.value === '__new__') {
        if (!normalizeChildName(newInput?.value)) {
            return { ok: false, error: 'Please enter a name for the new child.' };
        }
        const existing = await getDistinctChildNames();
        const validated = validateChildNameForAdd(newInput?.value, existing);
        return { ok: validated.ok, error: validated.error, childName: validated.name ?? null };
    }

    return { ok: true, childName: select.value };
}

function closeAddToPlanModal() {
    const backdrop = document.getElementById('add-to-plan-backdrop');
    const modal = document.getElementById('add-to-plan-modal');
    if (backdrop) backdrop.classList.remove('active');
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = '';
}
