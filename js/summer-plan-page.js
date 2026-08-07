// summer-plan-page.js - Summer plan list and calendar views (multi-child Option A)
// Uses: summer-plan.js, airtable.js

const SUMMER_PLAN_FILTER_KEY = 'summerPlanChildFilter';
const SUMMER_PLAN_VIEW_KEY = 'summerPlanView';

let allEntries = [];
let cachedCampById = null;
let activeChildFilter = 'all';
let knownChildNames = [];
let summerPlanAuthEmail = '';

function getStoredChildFilter() {
    try {
        return sessionStorage.getItem(SUMMER_PLAN_FILTER_KEY) || 'all';
    } catch (_) {
        return 'all';
    }
}

function setStoredChildFilter(value) {
    try {
        sessionStorage.setItem(SUMMER_PLAN_FILTER_KEY, value);
    } catch (_) { /* ignore */ }
}

function filterEntries(entries, filter) {
    if (filter === 'all') return entries;
    if (filter === 'unassigned') {
        return entries.filter(e => !normalizeChildName(e.child_name));
    }
    return entries.filter(
        e => normalizeChildName(e.child_name).toLowerCase() === filter.toLowerCase()
    );
}

function buildChildFilterOptions(entries) {
    const names = distinctChildNamesFromEntries(entries);
    return { names };
}

async function initSummerPlanPage() {
    const loginPrompt = document.getElementById('summer-plan-login-prompt');
    const emptyState = document.getElementById('summer-plan-empty-state');
    const contentWrap = document.getElementById('summer-plan-content-wrap');
    const loadingEl = document.getElementById('summer-plan-loading');
    const sidebar = document.getElementById('summer-plan-sidebar');

    try {
        const session = await getSession();
        if (!session?.user?.id) {
            loadingEl.style.display = 'none';
            if (sidebar) sidebar.style.display = 'none';
            loginPrompt.style.display = 'block';
            return;
        }

        summerPlanAuthEmail = session.user.email || session.user.user_metadata?.email || '';

        allEntries = await getPlanEntries();
        knownChildNames = distinctChildNamesFromEntries(allEntries);
        activeChildFilter = getStoredChildFilter();

        if (allEntries.length === 0) {
            loadingEl.style.display = 'none';
            if (sidebar) sidebar.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        loadingEl.style.display = 'none';
        if (sidebar) sidebar.style.display = 'flex';
        contentWrap.style.display = 'block';

        const camps = await fetchCamps();
        cachedCampById = new Map(camps.map(c => [c.id, c]));

        renderChildFilters(allEntries);
        refreshViews();
        wireViewTabs();
        applyPlanView(getStoredPlanView());
    } catch (error) {
        console.error('Error loading summer plan:', error);
        loadingEl.style.display = 'none';
        if (sidebar) sidebar.style.display = 'none';
        if (loginPrompt) loginPrompt.style.display = 'block';
    }
}

function refreshViews() {
    const filtered = filterEntries(allEntries, activeChildFilter);
    renderList(filtered, cachedCampById, knownChildNames);
    renderCalendar(filtered, cachedCampById);
    renderCostTotal(filtered, activeChildFilter);
    wireRemoveButtons();
    wireNoteButtons();
    wireRegCalendarDropdowns();
}

function sumEstimatedCost(entries) {
    return entries.reduce((sum, e) => sum + getEntryEstimatedCost(e), 0);
}

function labelForCostTotal(filter) {
    if (filter === 'all') return 'Total Estimated Cost for all children';
    return `${filter}'s total estimated cost`;
}

function renderCostTotal(entries, filter) {
    const sidebar = document.getElementById('summer-plan-cost-total-sidebar');
    const mobile = document.getElementById('summer-plan-cost-total-mobile');
    const total = sumEstimatedCost(entries);
    const label = labelForCostTotal(filter);
    const amount = formatEstimatedCostDisplay(total);
    const html = `
        <p class="summer-plan-cost-total-label">${escapeHtml(label)}</p>
        <p class="summer-plan-cost-total-amount">${amount}</p>
    `;
    for (const el of [sidebar, mobile]) {
        if (!el) continue;
        el.innerHTML = html;
        el.hidden = false;
    }
    document.querySelector('.summer-plan-page')?.classList.toggle(
        'summer-plan-has-mobile-total',
        !!(mobile && !mobile.hidden)
    );
}

function costInputValueFromEntry(entry) {
    const n = getEntryEstimatedCost(entry);
    return String(Math.round(n));
}

function buildFirstWeekByEntryId(entries, weeks) {
    const map = new Map();
    for (const entry of entries) {
        const start = entry.start_date;
        const end = entry.end_date || entry.start_date;
        for (const week of weeks) {
            if (dateRangeOverlapsWeek(start, end, week.startDate, week.endDate)) {
                map.set(entry.id, week.startDate);
                break;
            }
        }
    }
    return map;
}

const CHILD_NAV_ICONS = ['child_care', 'child_friendly', 'face', 'boy', 'girl'];

function navIconForFilter(value, childIndex) {
    if (value === 'all') return 'family_restroom';
    if (value === 'unassigned') return 'help_outline';
    return CHILD_NAV_ICONS[childIndex % CHILD_NAV_ICONS.length];
}

function navLabelForFilter(value, name) {
    if (value === 'all') return 'All Children';
    if (value === 'unassigned') return 'Unassigned';
    return `${name}'s Schedule`;
}

function renderChildFilters(entries) {
    const container = document.getElementById('summer-plan-child-filters');
    if (!container) return;

    const { names } = buildChildFilterOptions(entries);
    const items = [
        { value: 'all', label: navLabelForFilter('all') },
        ...names.map((n, i) => ({ value: n, label: navLabelForFilter(n, n), childIndex: i }))
    ];

    container.innerHTML = '';

    for (const item of items) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'app-sidebar-nav-item summer-plan-child-nav-item';
        const isActive =
            item.value === activeChildFilter ||
            (item.value !== 'all' &&
                item.value !== 'unassigned' &&
                item.value.toLowerCase() === String(activeChildFilter).toLowerCase());
        if (isActive) btn.classList.add('active');

        const icon = document.createElement('span');
        icon.className = 'material-symbols-outlined summer-plan-child-nav-icon';
        icon.textContent = navIconForFilter(item.value, item.childIndex ?? 0);
        icon.setAttribute('aria-hidden', 'true');
        btn.appendChild(icon);

        const label = document.createElement('span');
        label.className = 'summer-plan-child-nav-label';
        label.textContent = item.label;
        btn.appendChild(label);

        btn.dataset.filter = item.value;
        btn.addEventListener('click', () => {
            activeChildFilter = item.value;
            setStoredChildFilter(item.value);
            container.querySelectorAll('.summer-plan-child-nav-item').forEach(b => {
                b.classList.toggle('active', b.dataset.filter === item.value);
            });
            refreshViews();
        });
        container.appendChild(btn);
    }
}

function ensureChildNamesDatalist(names) {
    let dl = document.getElementById('summer-plan-child-names-dl');
    if (!dl) {
        dl = document.createElement('datalist');
        dl.id = 'summer-plan-child-names-dl';
        document.body.appendChild(dl);
    }
    dl.innerHTML = names.map(n => `<option value="${escapeHtml(n)}"></option>`).join('');
}

function renderListNotesCell(entry) {
    const note = getEntryNotes(entry);
    const preview = note ? truncatePlanNote(note, 60) : '';
    const linkLabel = note ? 'Edit note' : 'Add note';
    const previewHtml = note
        ? `<p class="summer-plan-note-preview" title="${escapeHtml(note)}">${escapeHtml(preview)}</p>`
        : '';
    return `
        <td class="summer-plan-cell-notes">
            ${previewHtml}
            <div class="summer-plan-note-actions">
                <button type="button" class="summer-plan-note-link" data-entry-id="${entry.id}">${linkLabel}</button>
            </div>
        </td>
    `;
}

function renderListActionsCell(entry) {
    const calendarMount =
        entry.status === 'want_to_book'
            ? `<span class="summer-plan-reg-calendar-mount" data-reg-calendar-mount data-entry-id="${entry.id}"></span>`
            : '';
    return `
        <td class="summer-plan-cell-actions">
            <div class="summer-plan-actions">
                ${calendarMount}
                <button type="button" class="summer-plan-action-link summer-plan-action-link--danger btn-remove-plan" data-entry-id="${entry.id}">Remove</button>
            </div>
        </td>
    `;
}

function openNoteModalForEntry(entry) {
    if (!entry) return;
    const camp = cachedCampById?.get(entry.camp_id);
    const campName = camp?.fields?.['Camp Name'] ?? 'Unknown camp';
    openPlanNoteModal({
        entryId: entry.id,
        campName,
        childName: entry.child_name,
        startDate: entry.start_date,
        endDate: entry.end_date,
        currentNote: getEntryNotes(entry)
    });
}

function wireRegCalendarDropdowns() {
    if (typeof createRegCalendarDropdown !== 'function') return;

    document.querySelectorAll('[data-reg-calendar-mount]').forEach((mount) => {
        const entryId = mount.dataset.entryId;
        const entry = allEntries.find((e) => e.id === entryId);
        if (!entry || entry.status !== 'want_to_book') return;

        const camp = cachedCampById?.get(entry.camp_id);
        createRegCalendarDropdown(mount, {
            entry,
            campFields: camp?.fields || null,
            campName: camp?.fields?.['Camp Name'] ?? 'Unknown camp',
            authEmail: summerPlanAuthEmail
        });
    });
}

function wireNoteButtons() {
    document.querySelectorAll('.summer-plan-note-link').forEach((btn) => {
        btn.addEventListener('click', () => {
            const entry = allEntries.find((e) => e.id === btn.dataset.entryId);
            openNoteModalForEntry(entry);
        });
    });
}

function renderList(entries, campById, childNames) {
    const tbody = document.getElementById('summer-plan-list-body');
    if (!tbody) return;

    ensureChildNamesDatalist(childNames);
    tbody.innerHTML = '';

    for (const entry of entries) {
        const campData = campById.get(entry.camp_id);
        const campName = campData?.fields?.['Camp Name'] ?? 'Unknown camp';
        const isUnavailable = !campData;

        const tr = document.createElement('tr');
        tr.dataset.entryId = entry.id;
        tr.dataset.childName = entry.child_name || '';
        tr.className = isUnavailable ? 'summer-plan-row-unavailable' : '';

        const weekStr = formatWeekOf(entry.start_date);
        const notesCellHtml = renderListNotesCell(entry);
        const actionsCellHtml = renderListActionsCell(entry);

        tr.innerHTML = `
            <td class="summer-plan-cell-camp">
                ${isUnavailable
                    ? '<span class="summer-plan-unavailable">No longer available</span>'
                    : `<a href="camp-detail.html?id=${entry.camp_id}">${escapeHtml(campName)}</a>`}
            </td>
            <td class="summer-plan-cell-child"></td>
            <td>
                <input type="date" class="summer-plan-edit-start" value="${entry.start_date}" data-entry-id="${entry.id}">
                <span class="summer-plan-date-sep">–</span>
                <input type="date" class="summer-plan-edit-end" value="${entry.end_date || ''}" data-entry-id="${entry.id}">
            </td>
            <td class="summer-plan-cell-week">${weekStr}</td>
            <td class="summer-plan-cell-cost">
                <div class="summer-plan-cost-wrap">
                    <span class="summer-plan-cost-prefix" aria-hidden="true">$</span>
                    <input type="number" class="summer-plan-edit-cost" min="0" step="1" placeholder="0"
                        value="${costInputValueFromEntry(entry)}" data-entry-id="${entry.id}">
                </div>
            </td>
            <td>
                <select class="summer-plan-edit-status" data-entry-id="${entry.id}">
                    <option value="booked" ${entry.status === 'booked' ? 'selected' : ''}>Booked</option>
                    <option value="want_to_book" ${entry.status === 'want_to_book' ? 'selected' : ''}>Want to book</option>
                </select>
            </td>
            ${notesCellHtml}
            ${actionsCellHtml}
        `;

        const childCell = tr.querySelector('.summer-plan-cell-child');
        const swatch = document.createElement('span');
        swatch.className = 'summer-plan-child-swatch';
        swatch.style.backgroundColor = getChildColor(entry.child_name);
        swatch.setAttribute('aria-hidden', 'true');
        swatch.title = normalizeChildName(entry.child_name) || 'Unassigned';

        const childInput = document.createElement('input');
        childInput.type = 'text';
        childInput.className = 'summer-plan-edit-child';
        childInput.maxLength = 80;
        childInput.placeholder = 'Required';
        childInput.value = normalizeChildName(entry.child_name);
        childInput.dataset.entryId = entry.id;
        childInput.setAttribute('list', 'summer-plan-child-names-dl');
        childInput.addEventListener('input', () => {
            swatch.style.backgroundColor = getChildColor(childInput.value);
            swatch.title = normalizeChildName(childInput.value) || 'Unassigned';
        });

        childCell.appendChild(swatch);
        childCell.appendChild(childInput);

        tbody.appendChild(tr);
    }

    wireInlineEdit(childNames);
}

function wireInlineEdit(childNames) {
    document.querySelectorAll('.summer-plan-edit-start').forEach(input => {
        input.addEventListener('change', async () => {
            const id = input.dataset.entryId;
            const row = document.querySelector(`tr[data-entry-id="${id}"]`);
            const ok = await saveRowFromDom(row);
            if (ok && row) {
                const weekCell = row.querySelector('.summer-plan-cell-week');
                if (weekCell) weekCell.textContent = formatWeekOf(input.value);
            }
        });
    });

    document.querySelectorAll('.summer-plan-edit-end').forEach(input => {
        input.addEventListener('change', async () => {
            const row = document.querySelector(`tr[data-entry-id="${input.dataset.entryId}"]`);
            const ok = await saveRowFromDom(row);
            if (ok) await afterRowSaved();
        });
    });

    document.querySelectorAll('.summer-plan-edit-status').forEach(select => {
        select.addEventListener('change', async () => {
            const row = document.querySelector(`tr[data-entry-id="${select.dataset.entryId}"]`);
            const ok = await saveRowFromDom(row);
            if (ok) await afterRowSaved();
        });
    });

    document.querySelectorAll('.summer-plan-edit-child').forEach(input => {
        input.addEventListener('change', async () => {
            const row = document.querySelector(`tr[data-entry-id="${input.dataset.entryId}"]`);
            const ok = await saveRowFromDom(row);
            if (ok) await afterRowSaved();
        });
    });

    document.querySelectorAll('.summer-plan-edit-cost').forEach(input => {
        input.addEventListener('change', async () => {
            const row = document.querySelector(`tr[data-entry-id="${input.dataset.entryId}"]`);
            const ok = await saveRowFromDom(row);
            if (ok) await afterRowSaved();
        });
    });
}

async function saveRowFromDom(row, options = {}) {
    if (!row) return false;
    const id = row.dataset.entryId;
    const startInput = row.querySelector('.summer-plan-edit-start');
    const endInput = row.querySelector('.summer-plan-edit-end');
    const statusSelect = row.querySelector('.summer-plan-edit-status');
    const childInput = row.querySelector('.summer-plan-edit-child');
    const costInput = row.querySelector('.summer-plan-edit-cost');

    const updates = {
        start_date: startInput?.value,
        end_date: endInput?.value || null,
        status: statusSelect?.value || 'want_to_book',
        child_name: childInput?.value ?? null
    };

    if (costInput) {
        const costResult = parseEstimatedCostInput(costInput.value);
        if (!costResult.ok) {
            alert('Please enter a valid cost (0 or greater).');
            return false;
        }
        updates.estimated_cost = costResult.value;
    }

    if (!normalizeChildName(updates.child_name)) {
        alert('Child name is required.');
        if (childInput) childInput.value = row.dataset.childName || '';
        return false;
    }

    const ok = await updatePlanEntry(id, updates);
    if (!ok && childInput) {
        alert(
            `Could not update child name. You can use up to ${MAX_CHILD_NAMES} different names on your plan.`
        );
        childInput.value = row.dataset.childName || '';
    }
    return ok;
}

async function afterRowSaved() {
    allEntries = await getPlanEntries();
    knownChildNames = distinctChildNamesFromEntries(allEntries);
    renderChildFilters(allEntries);
    refreshViews();
}

function wireRemoveButtons() {
    document.querySelectorAll('.btn-remove-plan').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.entryId;
            const ok = await removePlanEntry(id);
            if (ok) {
                allEntries = allEntries.filter(e => e.id !== id);
                knownChildNames = distinctChildNamesFromEntries(allEntries);
                if (allEntries.length === 0) {
                    window.location.reload();
                    return;
                }
                renderChildFilters(allEntries);
                refreshViews();
            }
        });
    });
}

function renderCalendarWeekCard(entry, campById) {
    const camp = campById?.get?.(entry.camp_id);
    const campName = camp?.fields?.['Camp Name'] ?? 'Unknown camp';
    const isUnavailable = !camp;
    const childName = normalizeChildName(entry.child_name);
    const childLabel = childName ? escapeHtml(childName) : 'Unassigned';
    const childColor = getChildColor(entry.child_name);
    const statusTagClass = entry.status === 'booked'
        ? 'summer-plan-week-card-status-booked'
        : 'summer-plan-week-card-status-want';
    const statusLabel = entry.status === 'booked' ? 'Booked' : 'Want to Book';
    const datesLabel = formatDateRange(entry.start_date, entry.end_date);
    const accent = getStatusAccentColor(entry.status);
    const note = getEntryNotes(entry);
    const notePreview = note ? truncatePlanNote(note, 80) : '';
    const noteLinkLabel = note ? 'Edit note' : 'Add note';
    const calendarMount =
        entry.status === 'want_to_book'
            ? `<span class="summer-plan-reg-calendar-mount" data-reg-calendar-mount data-entry-id="${entry.id}"></span>`
            : '';
    const noteBlock = `
        <p class="summer-plan-week-card-note">
            ${note ? `<span class="summer-plan-week-card-note-preview" title="${escapeHtml(note)}">${escapeHtml(notePreview)}</span>` : ''}
            <span class="summer-plan-note-actions">
                <button type="button" class="summer-plan-note-link" data-entry-id="${entry.id}">${noteLinkLabel}</button>
                ${calendarMount}
            </span>
        </p>`;
    const campLink = isUnavailable
        ? `<span class="summer-plan-week-card-camp-name">${escapeHtml(campName)}</span>`
        : `<a href="camp-detail.html?id=${entry.camp_id}" class="summer-plan-week-card-camp-name">${escapeHtml(campName)}</a>`;

    return `<article class="summer-plan-week-card" style="--week-card-accent:${accent}" data-entry-id="${entry.id}">
        <div class="summer-plan-week-card-accent" aria-hidden="true"></div>
        <div class="summer-plan-week-card-body">
            <div class="summer-plan-week-card-meta">
                <span class="summer-plan-week-card-child" style="color:${childColor}">${childLabel}</span>
                <span class="summer-plan-week-card-status ${statusTagClass}">${statusLabel}</span>
                <button type="button" class="summer-plan-week-card-remove btn-remove-plan" data-entry-id="${entry.id}">Remove</button>
            </div>
            <h4 class="summer-plan-week-card-camp">${campLink}</h4>
            <p class="summer-plan-week-card-dates">${escapeHtml(datesLabel)}</p>
            <p class="summer-plan-week-card-cost">${formatEntryEstimatedCost(entry)}</p>
            ${noteBlock}
        </div>
    </article>`;
}

function renderCalendar(entries, campById) {
    const container = document.getElementById('summer-plan-calendar-weeks');
    if (!container) return;

    const weeks = getSummerWeeks2026();
    const firstWeekByEntry = buildFirstWeekByEntryId(entries, weeks);
    container.innerHTML = '';

    for (const week of weeks) {
        const entriesInWeek = entries
            .filter(e => firstWeekByEntry.get(e.id) === week.startDate)
            .sort((a, b) => (a.start_date || '').localeCompare(b.start_date || ''));

        const weekEl = document.createElement('section');
        weekEl.className = 'summer-plan-calendar-week';

        const cardsHtml = entriesInWeek.length > 0
            ? entriesInWeek.map(e => renderCalendarWeekCard(e, campById)).join('')
            : '<p class="summer-plan-week-empty">No camps planned this week</p>';

        weekEl.innerHTML = `
            <div class="summer-plan-week-heading">
                <h3 class="summer-plan-week-heading-title">${week.label}</h3>
                <div class="summer-plan-week-heading-rule" aria-hidden="true"></div>
            </div>
            <div class="summer-plan-week-cards">${cardsHtml}</div>
        `;
        container.appendChild(weekEl);
    }
}

function getStoredPlanView() {
    try {
        const stored = sessionStorage.getItem(SUMMER_PLAN_VIEW_KEY);
        return stored === 'list' || stored === 'calendar' ? stored : 'calendar';
    } catch (_) {
        return 'calendar';
    }
}

function setStoredPlanView(view) {
    try {
        sessionStorage.setItem(SUMMER_PLAN_VIEW_KEY, view);
    } catch (_) { /* ignore */ }
}

function applyPlanView(view) {
    const listView = document.getElementById('summer-plan-list-view');
    const calendarView = document.getElementById('summer-plan-calendar-view');
    const isList = view === 'list';

    document.querySelectorAll('.summer-plan-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.view === view);
    });

    if (listView) listView.style.display = isList ? 'block' : 'none';
    if (calendarView) calendarView.style.display = isList ? 'none' : 'block';
}

function wireViewTabs() {
    document.querySelectorAll('.summer-plan-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const view = tab.dataset.view;
            setStoredPlanView(view);
            applyPlanView(view);
        });
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSummerPlanPage);
} else {
    initSummerPlanPage();
}

onPlanNoteSaved = async function onPlanNoteSavedHandler() {
    await afterRowSaved();
};
