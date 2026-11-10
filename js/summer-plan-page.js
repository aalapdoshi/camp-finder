// summer-plan-page.js - Summer plan list and calendar views (multi-child Option A)
// Uses: summer-plan.js, airtable.js

const SUMMER_PLAN_FILTER_KEY = 'summerPlanChildFilter';
const SUMMER_PLAN_VIEW_KEY = 'summerPlanView';

let allEntries = [];
let cachedCampById = null;
let activeChildFilter = 'all';
let activePlanYear = DEFAULT_PLAN_YEAR;
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
        return entries.filter(e => !isFamilyWidePlanEntry(e) && !normalizeChildName(e.child_name));
    }
    return entries.filter(
        e => isFamilyWidePlanEntry(e)
            || normalizeChildName(e.child_name).toLowerCase() === filter.toLowerCase()
    );
}

function buildChildFilterOptions(entries) {
    const names = distinctChildNamesFromEntries(entries);
    return { names };
}

function syncChildFilterToYearEntries(yearEntries) {
    const names = distinctChildNamesFromEntries(yearEntries);
    const active = String(activeChildFilter || 'all');
    if (active === 'all' || active === 'unassigned') return;
    const stillPresent = names.some((n) => n.toLowerCase() === active.toLowerCase());
    if (!stillPresent) {
        activeChildFilter = 'all';
        setStoredChildFilter('all');
    }
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
        activePlanYear = getStoredPlanYear();
        activeChildFilter = getStoredChildFilter();

        if (allEntries.length === 0) {
            loadingEl.style.display = 'none';
            if (sidebar) sidebar.style.display = 'none';
            emptyState.style.display = 'block';
            wirePersonalPlanActions(emptyState);
            return;
        }

        loadingEl.style.display = 'none';
        if (sidebar) sidebar.style.display = 'flex';
        contentWrap.style.display = 'block';

        const camps = await fetchCamps();
        cachedCampById = new Map(camps.map(c => [c.id, c]));

        wireYearSwitcher();
        updateYearChrome();
        wirePersonalPlanActions(document.getElementById('summer-plan-year-empty'));
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

function wireYearSwitcher() {
    const select = document.getElementById('summer-plan-year-select');
    if (!select || select.dataset.wired === '1') return;
    select.dataset.wired = '1';
    select.innerHTML = PLAN_YEARS.map(
        (y) => `<option value="${y}">Summer ${y}</option>`
    ).join('');
    select.value = String(activePlanYear);
    select.addEventListener('change', () => {
        activePlanYear = normalizePlanYear(select.value);
        setStoredPlanYear(activePlanYear);
        updateYearChrome();
        refreshViews();
    });
}

function updateYearChrome() {
    const select = document.getElementById('summer-plan-year-select');
    if (select) select.value = String(activePlanYear);

    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
        meta.setAttribute('content', `Your summer camp plan for ${activePlanYear}.`);
    }
}

function refreshViews() {
    const yearEntries = filterEntriesByYear(allEntries, activePlanYear);
    syncChildFilterToYearEntries(yearEntries);
    knownChildNames = distinctChildNamesFromEntries(yearEntries);
    renderChildFilters(yearEntries);

    const yearEmpty = document.getElementById('summer-plan-year-empty');
    const viewsPanel = document.getElementById('summer-plan-views-panel');
    const hasYearEntries = yearEntries.length > 0;

    if (yearEmpty) {
        yearEmpty.style.display = hasYearEntries ? 'none' : 'block';
        const yearLabel = document.getElementById('summer-plan-year-empty-year');
        if (yearLabel) yearLabel.textContent = String(activePlanYear);
    }
    if (viewsPanel) {
        viewsPanel.style.display = hasYearEntries ? 'block' : 'none';
    }

    // Cost total: hide when no camps for this year
    if (!hasYearEntries) {
        for (const id of ['summer-plan-cost-total-sidebar', 'summer-plan-cost-total-mobile']) {
            const el = document.getElementById(id);
            if (el) {
                el.innerHTML = '';
                el.hidden = true;
            }
        }
        document.querySelector('.summer-plan-page')?.classList.remove('summer-plan-has-mobile-total');
        return;
    }

    const filtered = filterEntries(yearEntries, activeChildFilter);
    renderList(filtered, cachedCampById, knownChildNames);
    renderCalendar(filtered, cachedCampById);
    renderCostTotal(filtered, activeChildFilter);
    wireRemoveButtons();
    wireNoteButtons();
    wireSuggestCampButtons();
    wireRegCalendarDropdowns();
    wirePickupDropoffCalendarDropdowns();
    wirePersonalPlanActions(document.getElementById('summer-plan-calendar-weeks'));
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

const SUGGEST_CAMP_LINK_LABEL = 'Suggest adding this camp to the catalog';

function personalPlanActionsHtml(startDate, endDate) {
    const start = escapeHtml(startDate || '');
    const end = escapeHtml(endDate || '');
    return `
        <div class="personal-plan-actions">
            <a class="personal-plan-action" href="browse.html">Search camp</a>
            <button type="button" class="personal-plan-action" data-personal-mode="custom" data-start-date="${start}" data-end-date="${end}">Add a Custom Camp</button>
            <button type="button" class="personal-plan-action" data-personal-mode="vacation" data-start-date="${start}" data-end-date="${end}">Vacation</button>
            <button type="button" class="personal-plan-action" data-personal-mode="no_camp" data-start-date="${start}" data-end-date="${end}">No Camp</button>
        </div>`;
}

/** Empty screens omit dates; those opens use the first week of the active plan year. */
function firstSummerWeekDates(year) {
    const weeks = getSummerWeeks(year);
    const week = weeks[0];
    if (!week) {
        const start = defaultSummerStartDate(year);
        return { startDate: start, endDate: start };
    }
    return { startDate: week.startDate, endDate: week.endDate || week.startDate };
}

function wirePersonalPlanActions(root) {
    (root || document).querySelectorAll('[data-personal-mode]').forEach((btn) => {
        if (btn.dataset.personalWired === '1') return;
        btn.dataset.personalWired = '1';
        btn.addEventListener('click', () => {
            const mode = btn.dataset.personalMode;
            const dates = btn.dataset.startDate
                ? { startDate: btn.dataset.startDate, endDate: btn.dataset.endDate || '' }
                : firstSummerWeekDates(getStoredPlanYear());
            openPersonalPlanModal({ mode, startDate: dates.startDate, endDate: dates.endDate });
        });
    });
}

function renderListNotesCell(entry) {
    if (isPersonalPlanEntry(entry)) {
        return '<td class="summer-plan-cell-notes"></td>';
    }
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
    const type = getPlanEntryType(entry);
    const regCalendarMount =
        type === 'catalog' && entry.status === 'want_to_book'
            ? `<span class="summer-plan-reg-calendar-mount" data-reg-calendar-mount data-entry-id="${entry.id}"></span>`
            : '';
    const pdCalendarMount =
        (type === 'catalog' || type === 'custom') && entry.status === 'booked'
            ? `<span class="summer-plan-reg-calendar-mount" data-pickup-dropoff-calendar-mount data-entry-id="${entry.id}"></span>`
            : '';
    const suggestBtn = type === 'custom'
        ? `<button type="button" class="summer-plan-action-link btn-suggest-camp" data-entry-id="${entry.id}">${SUGGEST_CAMP_LINK_LABEL}</button>`
        : '';
    return `
        <td class="summer-plan-cell-actions">
            <div class="summer-plan-actions">
                ${regCalendarMount}
                ${pdCalendarMount}
                ${suggestBtn}
                <button type="button" class="summer-plan-action-link summer-plan-action-link--danger btn-remove-plan" data-entry-id="${entry.id}">Remove</button>
            </div>
        </td>
    `;
}

function openNoteModalForEntry(entry) {
    if (!entry || isPersonalPlanEntry(entry)) return;
    const campName = planEntryDisplayName(entry, cachedCampById);
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
        if (!entry || getPlanEntryType(entry) !== 'catalog' || entry.status !== 'want_to_book') return;

        const camp = cachedCampById?.get(entry.camp_id);
        createRegCalendarDropdown(mount, {
            entry,
            campFields: camp?.fields || null,
            campName: planEntryDisplayName(entry, cachedCampById),
            authEmail: summerPlanAuthEmail
        });
    });
}

function wirePickupDropoffCalendarDropdowns() {
    if (typeof createPickupDropoffCalendarDropdown !== 'function') return;

    document.querySelectorAll('[data-pickup-dropoff-calendar-mount]').forEach((mount) => {
        const entryId = mount.dataset.entryId;
        const entry = allEntries.find((e) => e.id === entryId);
        const type = getPlanEntryType(entry);
        if (!entry || entry.status !== 'booked') return;
        if (type !== 'catalog' && type !== 'custom') return;

        const camp = type === 'catalog' ? cachedCampById?.get(entry.camp_id) : null;
        createPickupDropoffCalendarDropdown(mount, {
            entry,
            campFields: camp?.fields || null,
            campName: planEntryDisplayName(entry, cachedCampById),
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

function wireSuggestCampButtons() {
    document.querySelectorAll('.btn-suggest-camp').forEach((btn) => {
        btn.addEventListener('click', () => {
            const entry = allEntries.find((e) => e.id === btn.dataset.entryId);
            if (!entry || getPlanEntryType(entry) !== 'custom') return;
            suggestCustomCamp(entry, btn);
        });
    });
}

async function suggestCustomCamp(entry, button) {
    const name = planEntryDisplayName(entry, cachedCampById);
    const confirmed = window.confirm(
        `Send “${name}” to a2summercamp@umich.edu so we can consider adding it to the catalog?`
    );
    if (!confirmed) return;

    button.disabled = true;
    try {
        await postCampSuggestion(entry);
        button.textContent = 'Suggestion sent';
    } catch (err) {
        button.disabled = false;
        alert(err.message || 'Could not send suggestion.');
    }
}

async function postCampSuggestion(entry) {
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
            campName: planEntryDisplayName(entry, cachedCampById),
            location: planEntryLocation(entry),
            startDate: entry.start_date,
            endDate: entry.end_date || '',
            cost: getEntryEstimatedCost(entry)
        })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.error || 'Could not send email.');
    }
}

function renderList(entries, campById, childNames) {
    const tbody = document.getElementById('summer-plan-list-body');
    if (!tbody) return;

    ensureChildNamesDatalist(childNames);
    tbody.innerHTML = '';

    for (const entry of entries) {
        const personal = isPersonalPlanEntry(entry);
        const familyWide = isFamilyWidePlanEntry(entry);
        const campData = personal ? null : campById.get(entry.camp_id);
        const campName = planEntryDisplayName(entry, campById);
        const isUnavailable = !personal && !campData;

        const tr = document.createElement('tr');
        tr.dataset.entryId = entry.id;
        tr.dataset.childName = entry.child_name || '';
        tr.dataset.entryType = getPlanEntryType(entry);
        tr.className = isUnavailable ? 'summer-plan-row-unavailable' : '';

        const weekStr = formatWeekOf(entry.start_date);
        const notesCellHtml = renderListNotesCell(entry);
        const actionsCellHtml = renderListActionsCell(entry);
        const campCellHtml = isUnavailable
            ? '<span class="summer-plan-unavailable">No longer available</span>'
            : personal
                ? `<span class="summer-plan-personal-name">${escapeHtml(campName)}</span>`
                : `<a href="camp-detail.html?id=${entry.camp_id}">${escapeHtml(campName)}</a>`;
        const statusCellHtml = familyWide
            ? '<td><span class="summer-plan-family-status">Booked</span></td>'
            : `<td>
                <select class="summer-plan-edit-status" data-entry-id="${entry.id}">
                    <option value="booked" ${entry.status === 'booked' ? 'selected' : ''}>Booked</option>
                    <option value="want_to_book" ${entry.status === 'want_to_book' ? 'selected' : ''}>Want to book</option>
                </select>
            </td>`;

        tr.innerHTML = `
            <td class="summer-plan-cell-camp">${campCellHtml}</td>
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
            ${statusCellHtml}
            ${notesCellHtml}
            ${actionsCellHtml}
        `;

        if (personal) {
            const locationInput = document.createElement('input');
            locationInput.type = 'text';
            locationInput.className = 'summer-plan-edit-location';
            locationInput.maxLength = MAX_CUSTOM_LOCATION_LENGTH;
            locationInput.placeholder = 'Location';
            locationInput.value = planEntryLocation(entry);
            locationInput.dataset.entryId = entry.id;
            tr.querySelector('.summer-plan-cell-camp')?.appendChild(locationInput);
        }

        const childCell = tr.querySelector('.summer-plan-cell-child');
        const swatch = document.createElement('span');
        swatch.className = 'summer-plan-child-swatch';
        swatch.style.backgroundColor = getChildColor(familyWide ? '' : entry.child_name);
        swatch.setAttribute('aria-hidden', 'true');
        swatch.title = familyWide ? 'All children' : (normalizeChildName(entry.child_name) || 'Unassigned');
        childCell.appendChild(swatch);

        if (familyWide) {
            const label = document.createElement('span');
            label.className = 'summer-plan-family-child';
            label.textContent = 'All children';
            childCell.appendChild(label);
        } else {
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
            childCell.appendChild(childInput);
        }

        tbody.appendChild(tr);
    }

    wireInlineEdit(childNames);
}

function wireInlineEdit(childNames) {
    document.querySelectorAll('.summer-plan-edit-start').forEach(input => {
        input.addEventListener('change', async () => {
            const row = document.querySelector(`tr[data-entry-id="${input.dataset.entryId}"]`);
            const ok = await saveRowFromDom(row);
            // Refresh so a cross-year date move drops the row without changing active year.
            if (ok) await afterRowSaved();
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

    document.querySelectorAll('.summer-plan-edit-location').forEach(input => {
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
        end_date: endInput?.value || null
    };
    if (statusSelect) updates.status = statusSelect.value || 'want_to_book';

    if (costInput) {
        const costResult = parseEstimatedCostInput(costInput.value);
        if (!costResult.ok) {
            alert('Please enter a valid cost (0 or greater).');
            return false;
        }
        updates.estimated_cost = costResult.value;
    }

    const locationInput = row.querySelector('.summer-plan-edit-location');
    if (locationInput) {
        const locationResult = parseCustomLocation(locationInput.value);
        if (!locationResult.ok) {
            alert(locationResult.error || 'Please enter a shorter location.');
            return false;
        }
        updates.custom_location = locationResult.value;
    }

    if (childInput) {
        updates.child_name = childInput.value ?? null;
        if (!normalizeChildName(updates.child_name)) {
            alert('Child name is required.');
            childInput.value = row.dataset.childName || '';
            return false;
        }
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
    // Keep activePlanYear; refreshViews re-scopes child filters and list/calendar.
    refreshViews();
}

function wireRemoveButtons() {
    document.querySelectorAll('.btn-remove-plan').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.entryId;
            const ok = await removePlanEntry(id);
            if (ok) {
                allEntries = allEntries.filter(e => e.id !== id);
                if (allEntries.length === 0) {
                    window.location.reload();
                    return;
                }
                refreshViews();
            }
        });
    });
}

function renderCalendarWeekCard(entry, campById) {
    const type = getPlanEntryType(entry);
    const personal = isPersonalPlanEntry(entry);
    const familyWide = isFamilyWidePlanEntry(entry);
    const camp = personal ? null : campById?.get?.(entry.camp_id);
    const campName = planEntryDisplayName(entry, campById);
    const isUnavailable = !personal && !camp;
    const childName = familyWide ? '' : normalizeChildName(entry.child_name);
    const childLabel = familyWide ? 'All children' : (childName ? escapeHtml(childName) : 'Unassigned');
    const childColor = getChildColor(familyWide ? '' : entry.child_name);
    const statusTagClass = entry.status === 'booked'
        ? 'summer-plan-week-card-status-booked'
        : 'summer-plan-week-card-status-want';
    const statusLabel = entry.status === 'booked' ? 'Booked' : 'Want to Book';
    const datesLabel = formatDateRange(entry.start_date, entry.end_date);
    const accent = getStatusAccentColor(entry.status);
    const note = getEntryNotes(entry);
    const notePreview = note ? truncatePlanNote(note, 80) : '';
    const noteLinkLabel = note ? 'Edit note' : 'Add note';
    const regCalendarMount =
        type === 'catalog' && entry.status === 'want_to_book'
            ? `<span class="summer-plan-reg-calendar-mount" data-reg-calendar-mount data-entry-id="${entry.id}"></span>`
            : '';
    const pdCalendarMount =
        (type === 'catalog' || type === 'custom') && entry.status === 'booked'
            ? `<span class="summer-plan-reg-calendar-mount" data-pickup-dropoff-calendar-mount data-entry-id="${entry.id}"></span>`
            : '';
    const suggestBtn = type === 'custom'
        ? `<button type="button" class="summer-plan-action-link btn-suggest-camp" data-entry-id="${entry.id}">${SUGGEST_CAMP_LINK_LABEL}</button>`
        : '';
    const location = personal ? planEntryLocation(entry) : '';
    const locationHtml = location
        ? `<p class="summer-plan-week-card-location">${escapeHtml(location)}</p>`
        : '';
    const noteBlock = personal
        ? (pdCalendarMount || suggestBtn
            ? `<p class="summer-plan-week-card-note"><span class="summer-plan-note-actions">${suggestBtn}${pdCalendarMount}</span></p>`
            : '')
        : `
        <p class="summer-plan-week-card-note">
            ${note ? `<span class="summer-plan-week-card-note-preview" title="${escapeHtml(note)}">${escapeHtml(notePreview)}</span>` : ''}
            <span class="summer-plan-note-actions">
                <button type="button" class="summer-plan-note-link" data-entry-id="${entry.id}">${noteLinkLabel}</button>
                ${regCalendarMount}
                ${pdCalendarMount}
            </span>
        </p>`;
    const campLink = personal || isUnavailable
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
            ${locationHtml}
            <p class="summer-plan-week-card-dates">${escapeHtml(datesLabel)}</p>
            <p class="summer-plan-week-card-cost">${formatEntryEstimatedCost(entry)}</p>
            ${noteBlock}
        </div>
    </article>`;
}

function renderCalendar(entries, campById) {
    const container = document.getElementById('summer-plan-calendar-weeks');
    if (!container) return;

    const weeks = getSummerWeeks(activePlanYear);
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
            : `<div class="summer-plan-week-empty">
                <p>No camps planned this week</p>
                ${personalPlanActionsHtml(week.startDate, week.endDate)}
            </div>`;

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
