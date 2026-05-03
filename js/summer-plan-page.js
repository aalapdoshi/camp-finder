// summer-plan-page.js - Summer plan list and calendar views
// Uses: auth.js, summer-plan.js (getPlanEntries, updatePlanEntry, removePlanEntry, formatWeekOf, formatDateRange, getSummerWeeks2026, dateRangeOverlapsWeek), airtable.js (getCampById, fetchCamps)

async function initSummerPlanPage() {
    const loginPrompt = document.getElementById('summer-plan-login-prompt');
    const emptyState = document.getElementById('summer-plan-empty-state');
    const contentWrap = document.getElementById('summer-plan-content-wrap');
    const loadingEl = document.getElementById('summer-plan-loading');

    try {
        const session = await getSession();
        if (!session?.user?.id) {
            loadingEl.style.display = 'none';
            loginPrompt.style.display = 'block';
            return;
        }

        const entries = await getPlanEntries();
        if (entries.length === 0) {
            loadingEl.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        loadingEl.style.display = 'none';
        contentWrap.style.display = 'block';

        const camps = await fetchCamps();
        const campById = new Map(camps.map(c => [c.id, c]));

        renderList(entries, campById);
        renderCalendar(entries, campById);
        wireViewTabs();
    } catch (error) {
        console.error('Error loading summer plan:', error);
        loadingEl.style.display = 'none';
        if (loginPrompt) loginPrompt.style.display = 'block';
    }
}

/**
 * Render list view table with inline edit.
 */
function renderList(entries, campById) {
    const tbody = document.getElementById('summer-plan-list-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    for (const entry of entries) {
        const campData = campById.get(entry.camp_id);
        const campName = campData?.fields?.['Camp Name'] ?? 'Unknown camp';
        const isUnavailable = !campData;

        const tr = document.createElement('tr');
        tr.dataset.entryId = entry.id;
        tr.className = isUnavailable ? 'summer-plan-row-unavailable' : '';

        const datesStr = formatDateRange(entry.start_date, entry.end_date);
        const weekStr = formatWeekOf(entry.start_date);
        const statusClass = entry.status === 'booked' ? 'status-badge status-booked' : 'status-badge status-want-to-book';
        const statusLabel = entry.status === 'booked' ? 'Booked' : 'Want to book';

        tr.innerHTML = `
            <td class="summer-plan-cell-camp">
                ${isUnavailable
                    ? '<span class="summer-plan-unavailable">No longer available</span>'
                    : `<a href="camp-detail.html?id=${entry.camp_id}">${campName}</a>`}
            </td>
            <td>
                <input type="date" class="summer-plan-edit-start" value="${entry.start_date}" data-entry-id="${entry.id}">
                <span class="summer-plan-date-sep">–</span>
                <input type="date" class="summer-plan-edit-end" value="${entry.end_date || ''}" placeholder="Optional" data-entry-id="${entry.id}">
            </td>
            <td class="summer-plan-cell-week">${weekStr}</td>
            <td>
                <select class="summer-plan-edit-status" data-entry-id="${entry.id}">
                    <option value="booked" ${entry.status === 'booked' ? 'selected' : ''}>Booked</option>
                    <option value="want_to_book" ${entry.status === 'want_to_book' ? 'selected' : ''}>Want to book</option>
                </select>
            </td>
            <td>
                <button type="button" class="btn-remove-plan btn-secondary" data-entry-id="${entry.id}">Remove</button>
            </td>
        `;

        tbody.appendChild(tr);
    }

    wireInlineEdit();
    wireRemoveButtons();
}

/**
 * Wire inline edit for dates and status.
 */
function wireInlineEdit() {
    document.querySelectorAll('.summer-plan-edit-start').forEach(input => {
        input.addEventListener('change', async () => {
            const id = input.dataset.entryId;
            const row = document.querySelector(`tr[data-entry-id="${id}"]`);
            const endInput = row?.querySelector('.summer-plan-edit-end');
            const statusSelect = row?.querySelector('.summer-plan-edit-status');
            const ok = await updatePlanEntry(id, {
                start_date: input.value,
                end_date: endInput?.value || null,
                status: statusSelect?.value || 'want_to_book'
            });
            if (ok && row) {
                const weekCell = row.querySelector('.summer-plan-cell-week');
                if (weekCell) weekCell.textContent = formatWeekOf(input.value);
            }
        });
    });

    document.querySelectorAll('.summer-plan-edit-end').forEach(input => {
        input.addEventListener('change', async () => {
            const id = input.dataset.entryId;
            const row = document.querySelector(`tr[data-entry-id="${id}"]`);
            const startInput = row?.querySelector('.summer-plan-edit-start');
            const statusSelect = row?.querySelector('.summer-plan-edit-status');
            const ok = await updatePlanEntry(id, {
                start_date: startInput?.value,
                end_date: input.value || null,
                status: statusSelect?.value || 'want_to_book'
            });
            if (ok) renderCalendarFromEntries();
        });
    });

    document.querySelectorAll('.summer-plan-edit-status').forEach(select => {
        select.addEventListener('change', async () => {
            const id = select.dataset.entryId;
            const row = document.querySelector(`tr[data-entry-id="${id}"]`);
            const startInput = row?.querySelector('.summer-plan-edit-start');
            const endInput = row?.querySelector('.summer-plan-edit-end');
            const ok = await updatePlanEntry(id, {
                start_date: startInput?.value,
                end_date: endInput?.value || null,
                status: select.value
            });
            if (ok) renderCalendarFromEntries();
        });
    });
}

/**
 * Wire remove buttons.
 */
function wireRemoveButtons() {
    document.querySelectorAll('.btn-remove-plan').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.entryId;
            const ok = await removePlanEntry(id);
            if (ok) {
                const row = document.querySelector(`tr[data-entry-id="${id}"]`);
                if (row) row.remove();
                renderCalendarFromEntries();
                const tbody = document.getElementById('summer-plan-list-body');
                if (tbody && tbody.children.length === 0) {
                    window.location.reload();
                }
            }
        });
    });
}

let cachedEntries = [];
let cachedCampById = null;

function renderCalendarFromEntries() {
    const entries = [];
    document.querySelectorAll('#summer-plan-list-body tr').forEach(tr => {
        const id = tr.dataset.entryId;
        const startInput = tr.querySelector('.summer-plan-edit-start');
        const endInput = tr.querySelector('.summer-plan-edit-end');
        const statusSelect = tr.querySelector('.summer-plan-edit-status');
        const campCell = tr.querySelector('.summer-plan-cell-camp a');
        const campId = campCell?.href?.match(/id=([^&]+)/)?.[1];
        if (id && startInput && campId) {
            entries.push({
                id,
                camp_id: campId,
                start_date: startInput.value,
                end_date: endInput?.value || null,
                status: statusSelect?.value || 'want_to_book'
            });
        }
    });
    if (cachedCampById) renderCalendar(entries, cachedCampById);
}

/**
 * Render calendar view: weeks June 1 - Aug 31, 2026.
 */
function renderCalendar(entries, campById) {
    cachedEntries = entries;
    cachedCampById = campById;

    const container = document.getElementById('summer-plan-calendar-weeks');
    if (!container) return;

    const weeks = getSummerWeeks2026();
    container.innerHTML = '';

    for (const week of weeks) {
        const weekEl = document.createElement('div');
        weekEl.className = 'summer-plan-calendar-week';

        const entriesInWeek = entries.filter(e =>
            dateRangeOverlapsWeek(e.start_date, e.end_date || e.start_date, week.startDate, week.endDate)
        );

        let entriesHtml = '';
        for (const e of entriesInWeek) {
            const camp = campById?.get?.(e.camp_id);
            const name = camp?.fields?.['Camp Name'] ?? 'Unknown';
            const statusClass = e.status === 'booked' ? 'calendar-entry-booked' : 'calendar-entry-want';
            entriesHtml += `<div class="summer-plan-calendar-entry ${statusClass}">${name}</div>`;
        }

        weekEl.innerHTML = `
            <div class="summer-plan-calendar-week-label">${week.label}</div>
            <div class="summer-plan-calendar-week-entries">${entriesHtml || ''}</div>
        `;
        container.appendChild(weekEl);
    }
}

/**
 * Wire List/Calendar tab buttons.
 */
function wireViewTabs() {
    document.querySelectorAll('.summer-plan-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const view = tab.dataset.view;
            document.querySelectorAll('.summer-plan-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const listView = document.getElementById('summer-plan-list-view');
            const calendarView = document.getElementById('summer-plan-calendar-view');

            if (view === 'list') {
                listView.style.display = 'block';
                calendarView.style.display = 'none';
            } else {
                listView.style.display = 'none';
                calendarView.style.display = 'block';
            }
        });
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSummerPlanPage);
} else {
    initSummerPlanPage();
}
