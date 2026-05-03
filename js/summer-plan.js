// summer-plan.js - Supabase CRUD for summer plan + shared add-to-plan modal
// Requires: auth.js (initSupabase, getSession), Supabase client

/**
 * Get all plan entries for the current user.
 * @returns {Promise<Array>} Array of { id, camp_id, start_date, end_date, status, notes, created_at }
 */
async function getPlanEntries() {
    const session = await getSession();
    if (!session?.user?.id) return [];

    const client = initSupabase();
    if (!client) return [];

    try {
        const { data, error } = await client
            .from('summer_plan')
            .select('id, camp_id, start_date, end_date, status, notes, created_at')
            .eq('user_id', session.user.id)
            .order('start_date', { ascending: true });

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
 * Add a camp to the summer plan.
 * @param {string} campId - Airtable record ID
 * @param {string} startDate - YYYY-MM-DD
 * @param {string|null} endDate - YYYY-MM-DD or null for single day
 * @param {string} status - 'booked' or 'want_to_book'
 * @returns {Promise<boolean>} true if added
 */
async function addPlanEntry(campId, startDate, endDate, status) {
    const session = await getSession();
    if (!session?.user?.id) return false;

    const client = initSupabase();
    if (!client) return false;

    try {
        const row = {
            user_id: session.user.id,
            camp_id: campId,
            start_date: startDate,
            end_date: endDate || null,
            status: status || 'want_to_book'
        };

        const { error } = await client.from('summer_plan').insert(row);

        if (error) {
            console.error('Error adding plan entry:', error);
            return false;
        }
        return true;
    } catch (err) {
        console.error('Error in addPlanEntry:', err);
        return false;
    }
}

/**
 * Update a plan entry.
 * @param {string} id - Plan entry uuid
 * @param {object} updates - { start_date?, end_date?, status? }
 * @returns {Promise<boolean>}
 */
async function updatePlanEntry(id, updates) {
    const session = await getSession();
    if (!session?.user?.id) return false;

    const client = initSupabase();
    if (!client) return false;

    try {
        const { error } = await client
            .from('summer_plan')
            .update(updates)
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

/**
 * Remove a plan entry.
 * @param {string} id - Plan entry uuid
 * @returns {Promise<boolean>}
 */
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

/**
 * Format date as "Week of Jun 15" (start of week = Monday).
 * @param {string} dateStr - YYYY-MM-DD
 * @returns {string}
 */
function formatWeekOf(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T12:00:00');
    const options = { month: 'short', day: 'numeric' };
    return 'Week of ' + d.toLocaleDateString('en-US', options);
}

/**
 * Format date range for display (e.g. "Jun 15–21").
 * @param {string} startStr - YYYY-MM-DD
 * @param {string|null} endStr - YYYY-MM-DD or null
 * @returns {string}
 */
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

/**
 * Get summer weeks for 2026 (June 1 – Aug 31). Each week starts Monday.
 * @returns {Array<{ label: string, startDate: string, endDate: string }>}
 */
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

/**
 * Check if a date range overlaps with a week.
 */
function dateRangeOverlapsWeek(entryStart, entryEnd, weekStart, weekEnd) {
    const es = entryStart || entryEnd;
    const ee = entryEnd || entryStart;
    return es <= weekEnd && ee >= weekStart;
}

/**
 * Open the add-to-plan modal for a camp.
 * @param {string} campId - Airtable record ID
 * @param {string} campName - For display in modal title
 */
async function openAddToPlanModal(campId, campName) {
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
        modal.querySelector('#add-to-plan-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const startInput = document.getElementById('add-to-plan-start');
            const endInput = document.getElementById('add-to-plan-end');
            const statusInput = modal.querySelector('input[name="add-to-plan-status"]:checked');
            const startDate = startInput?.value;
            const endDate = endInput?.value || null;
            const status = statusInput?.value || 'want_to_book';

            if (!startDate) return;

            if (endDate && endDate < startDate) {
                const errEl = document.getElementById('add-to-plan-error');
                if (errEl) {
                    errEl.textContent = 'End date must be on or after start date.';
                    errEl.style.display = 'block';
                }
                return;
            }

            const resolvedSession = await getSession();
            if (!resolvedSession?.user?.id) return;

            const campIdVal = modal.dataset.campId;
            const ok = await addPlanEntry(campIdVal, startDate, endDate, status);
            if (ok) {
                closeAddToPlanModal();
                if (typeof onPlanEntryAdded === 'function') onPlanEntryAdded();
                if (window.location.pathname.includes('summer-plan')) {
                    window.location.reload();
                }
            } else {
                const errEl = document.getElementById('add-to-plan-error');
                if (errEl) {
                    errEl.textContent = 'Could not add. Please try again.';
                    errEl.style.display = 'block';
                }
            }
        });
    }

    modal.dataset.campId = campId;
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

    document.body.style.overflow = 'hidden';
    backdrop.classList.add('active');
    modal.classList.add('active');
}

function closeAddToPlanModal() {
    const backdrop = document.getElementById('add-to-plan-backdrop');
    const modal = document.getElementById('add-to-plan-modal');
    if (backdrop) backdrop.classList.remove('active');
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = '';
}
