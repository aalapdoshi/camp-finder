// registration-calendar.js — Add to Calendar dropdown + modal (Summer Plan want_to_book)

const REG_CAL_DELIVERY_LABELS = {
    google: 'Open in Google Calendar',
    ics: 'Download .ics file',
    email: 'Send email'
};

let regCalendarModalContext = null;
let regCalendarOpenMenu = null;

const REG_CALENDAR_TRIGGER_LABEL = 'Add reg. to calendar';
const REG_CALENDAR_TRIGGER_LABEL_FULL = 'Add Registration Time to Calendar';

/**
 * Mount Add to Calendar dropdown into container.
 * @param {HTMLElement} container
 * @param {{ entry: object, campFields: object|null, campName: string, authEmail: string }} ctx
 */
function createRegCalendarDropdown(container, ctx) {
    if (!container) return;

    container.innerHTML = '';
    const dropdown = document.createElement('span');
    dropdown.className = 'reg-calendar-dropdown';

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'summer-plan-action-link reg-calendar-trigger';
    trigger.setAttribute('aria-haspopup', 'menu');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-label', REG_CALENDAR_TRIGGER_LABEL_FULL);
    trigger.title = REG_CALENDAR_TRIGGER_LABEL_FULL;
    trigger.innerHTML = `${REG_CALENDAR_TRIGGER_LABEL} <span class="reg-calendar-chevron" aria-hidden="true">▾</span>`;

    const menu = document.createElement('div');
    menu.className = 'reg-calendar-menu';
    menu.setAttribute('role', 'menu');
    menu.hidden = true;

    const emailSubtitle = ctx.authEmail
        ? `Send to ${ctx.authEmail}`
        : 'Send to your account email';

    menu.innerHTML = `
        <button type="button" class="reg-calendar-menu-item" role="menuitem" data-delivery="email">
            <span class="material-symbols-outlined reg-calendar-menu-icon" aria-hidden="true">mail</span>
            <span class="reg-calendar-menu-text">
                <span class="reg-calendar-menu-title">Email me this invite</span>
                <span class="reg-calendar-menu-sub">${escapeHtml(emailSubtitle)}</span>
            </span>
        </button>
        <button type="button" class="reg-calendar-menu-item" role="menuitem" data-delivery="ics">
            <span class="material-symbols-outlined reg-calendar-menu-icon" aria-hidden="true">download</span>
            <span class="reg-calendar-menu-text">
                <span class="reg-calendar-menu-title">Apple / Outlook (.ics)</span>
                <span class="reg-calendar-menu-sub">Download .ics file</span>
            </span>
        </button>
        <button type="button" class="reg-calendar-menu-item" role="menuitem" data-delivery="google">
            <span class="material-symbols-outlined reg-calendar-menu-icon" aria-hidden="true">event</span>
            <span class="reg-calendar-menu-text">
                <span class="reg-calendar-menu-title">Google Calendar</span>
                <span class="reg-calendar-menu-sub">Opens Google Calendar in a new tab</span>
            </span>
        </button>
    `;

    dropdown.appendChild(trigger);
    dropdown.appendChild(menu);
    container.appendChild(dropdown);

    menu.addEventListener('click', (e) => e.stopPropagation());

    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const wasOpen = regCalendarOpenMenu?.menu === menu && !menu.hidden;
        closeAllRegCalendarMenus();
        if (!wasOpen) {
            openRegCalendarMenu(trigger, menu, dropdown);
        }
    });

    menu.querySelectorAll('[data-delivery]').forEach((item) => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            closeAllRegCalendarMenus();
            openRegistrationCalendarModal({
                deliveryMethod: item.dataset.delivery,
                entry: ctx.entry,
                campFields: ctx.campFields,
                campName: ctx.campName,
                authEmail: ctx.authEmail
            });
        });
    });
}

function positionRegCalendarMenu(trigger, menu) {
    menu.hidden = false;
    const rect = trigger.getBoundingClientRect();
    const menuWidth = menu.offsetWidth || 256;
    let left = rect.left;
    if (left + menuWidth > window.innerWidth - 8) {
        left = Math.max(8, window.innerWidth - menuWidth - 8);
    }
    const top = rect.bottom + 4;
    const maxTop = window.innerHeight - menu.offsetHeight - 8;
    menu.style.position = 'fixed';
    menu.style.top = `${Math.min(top, maxTop)}px`;
    menu.style.left = `${left}px`;
    menu.style.zIndex = '1200';
}

function openRegCalendarMenu(trigger, menu, dropdownEl) {
    menu.classList.add('reg-calendar-menu--open');
    if (!menu._regCalendarHome) {
        menu._regCalendarHome = dropdownEl;
    }
    if (menu.parentElement !== document.body) {
        document.body.appendChild(menu);
    }
    positionRegCalendarMenu(trigger, menu);
    trigger.setAttribute('aria-expanded', 'true');
    regCalendarOpenMenu = { menu, trigger, dropdownEl };
}

function closeAllRegCalendarMenus() {
    document.querySelectorAll('.reg-calendar-menu').forEach((m) => {
        m.hidden = true;
        m.classList.remove('reg-calendar-menu--open');
        m.style.position = '';
        m.style.top = '';
        m.style.left = '';
        m.style.zIndex = '';
        if (m._regCalendarHome && m.parentElement === document.body) {
            m._regCalendarHome.appendChild(m);
        }
    });
    document.querySelectorAll('.reg-calendar-trigger').forEach((t) => {
        t.setAttribute('aria-expanded', 'false');
    });
    regCalendarOpenMenu = null;
}

document.addEventListener('click', () => closeAllRegCalendarMenus());
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAllRegCalendarMenus();
});
window.addEventListener('scroll', () => closeAllRegCalendarMenus(), true);
window.addEventListener('resize', () => {
    if (regCalendarOpenMenu?.menu && !regCalendarOpenMenu.menu.hidden) {
        positionRegCalendarMenu(regCalendarOpenMenu.trigger, regCalendarOpenMenu.menu);
    }
});

/**
 * @param {object} options
 */
function openRegistrationCalendarModal(options) {
    const {
        deliveryMethod,
        entry,
        campFields,
        campName,
        authEmail
    } = options;

    regCalendarModalContext = { deliveryMethod, entry, campFields, campName, authEmail };

    let backdrop = document.getElementById('reg-calendar-backdrop');
    let modal = document.getElementById('reg-calendar-modal');

    if (!modal || !modal.querySelector('.reg-calendar-dialog')) {
        if (backdrop) backdrop.remove();
        if (modal) modal.remove();
        backdrop = null;
        modal = null;
    }

    if (!backdrop || !modal) {
        backdrop = document.createElement('div');
        backdrop.id = 'reg-calendar-backdrop';
        backdrop.className = 'reg-calendar-backdrop';
        modal = document.createElement('div');
        modal.id = 'reg-calendar-modal';
        modal.className = 'reg-calendar-modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-labelledby', 'reg-calendar-title');
        modal.setAttribute('aria-modal', 'true');
        modal.innerHTML = `
            <div class="reg-calendar-dialog">
                <header class="reg-calendar-header">
                    <div>
                        <h2 id="reg-calendar-title" class="reg-calendar-title">Add registration to calendar</h2>
                        <p class="reg-calendar-camp-name" id="reg-calendar-camp-name"></p>
                        <p class="reg-calendar-meta" id="reg-calendar-meta"></p>
                    </div>
                    <button type="button" class="reg-calendar-close" aria-label="Close">
                        <span class="material-symbols-outlined" aria-hidden="true">close</span>
                    </button>
                </header>
                <form id="reg-calendar-form" class="reg-calendar-form">
                    <div class="reg-calendar-body">
                        <div class="reg-calendar-field">
                            <label for="reg-calendar-date">Registration date</label>
                            <input type="date" id="reg-calendar-date" required>
                        </div>
                        <div class="reg-calendar-field">
                            <label for="reg-calendar-time">Registration time</label>
                            <input type="time" id="reg-calendar-time" required>
                        </div>
                        <p class="reg-calendar-hint">The calendar event runs 30 minutes before and after this time (America/Detroit).</p>
                        <div id="reg-calendar-warn-missing" class="reg-calendar-warn" style="display:none;">Registration date is not listed for this camp — enter the date and time.</div>
                        <div id="reg-calendar-warn-past" class="reg-calendar-warn" style="display:none;">This registration time is in the past. Registration may already be open.</div>
                        <div id="reg-calendar-error" class="reg-calendar-error" style="display:none;"></div>
                        <div id="reg-calendar-success" class="reg-calendar-success" style="display:none;"></div>
                    </div>
                    <footer class="reg-calendar-footer">
                        <button type="submit" class="reg-calendar-submit" id="reg-calendar-submit">Continue</button>
                        <button type="button" class="reg-calendar-cancel">Cancel</button>
                    </footer>
                </form>
            </div>
        `;
        document.body.appendChild(backdrop);
        document.body.appendChild(modal);

        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) closeRegistrationCalendarModal();
        });
        modal.querySelector('.reg-calendar-close').addEventListener('click', closeRegistrationCalendarModal);
        modal.querySelector('.reg-calendar-cancel').addEventListener('click', closeRegistrationCalendarModal);
        document.addEventListener('keydown', regCalendarModalEscapeHandler);
        modal.querySelector('#reg-calendar-form').addEventListener('submit', handleRegCalendarSubmit);

        const dateInput = modal.querySelector('#reg-calendar-date');
        const timeInput = modal.querySelector('#reg-calendar-time');
        dateInput?.addEventListener('change', updateRegCalendarWarnings);
        timeInput?.addEventListener('change', updateRegCalendarWarnings);
    }

    const campEl = document.getElementById('reg-calendar-camp-name');
    const metaEl = document.getElementById('reg-calendar-meta');
    const dateInput = document.getElementById('reg-calendar-date');
    const timeInput = document.getElementById('reg-calendar-time');
    const submitBtn = document.getElementById('reg-calendar-submit');
    const errEl = document.getElementById('reg-calendar-error');
    const successEl = document.getElementById('reg-calendar-success');
    const warnMissing = document.getElementById('reg-calendar-warn-missing');

    if (campEl) campEl.textContent = campName || 'Camp';

    const childLabel = normalizeChildName(entry?.child_name) || 'Unassigned';
    const planDates = formatDateRange(entry?.start_date, entry?.end_date);
    if (metaEl) metaEl.textContent = planDates ? `${childLabel} · ${planDates}` : childLabel;

    const catalogDate = campFields?.['Registration Opens Date'];
    const catalogTime = campFields?.['Registration Opens Time'];
    const parsedTime = parseRegistrationOpensTime(catalogTime);

    if (dateInput) dateInput.value = catalogDate && String(catalogDate).trim() ? String(catalogDate).trim() : '';
    if (timeInput) timeInput.value = formatTimeForInput(parsedTime);

    if (warnMissing) {
        warnMissing.style.display = !catalogDate || !String(catalogDate).trim() ? 'block' : 'none';
    }

    if (submitBtn) submitBtn.textContent = REG_CAL_DELIVERY_LABELS[deliveryMethod] || 'Continue';
    if (errEl) {
        errEl.textContent = '';
        errEl.style.display = 'none';
    }
    if (successEl) {
        successEl.textContent = '';
        successEl.style.display = 'none';
    }

    updateRegCalendarWarnings();

    document.body.style.overflow = 'hidden';
    backdrop.classList.add('active');
    modal.classList.add('active');
    dateInput?.focus();
}

function regCalendarModalEscapeHandler(e) {
    if (e.key === 'Escape') {
        const modal = document.getElementById('reg-calendar-modal');
        if (modal?.classList.contains('active')) closeRegistrationCalendarModal();
    }
}

function updateRegCalendarWarnings() {
    const dateInput = document.getElementById('reg-calendar-date');
    const timeInput = document.getElementById('reg-calendar-time');
    const warnPast = document.getElementById('reg-calendar-warn-past');
    if (!warnPast || !dateInput?.value || !timeInput?.value) {
        if (warnPast) warnPast.style.display = 'none';
        return;
    }
    warnPast.style.display = isRegistrationInPast(dateInput.value, timeInput.value) ? 'block' : 'none';
}

function buildRegCalendarEventParams() {
    const ctx = regCalendarModalContext;
    if (!ctx) return null;

    const dateInput = document.getElementById('reg-calendar-date');
    const timeInput = document.getElementById('reg-calendar-time');
    const registrationDate = dateInput?.value?.trim();
    const registrationTime = timeInput?.value?.trim();

    if (!registrationDate || !registrationTime) {
        return { error: 'Please enter both registration date and time.' };
    }

    const origin = window.location.origin || '';
    const campId = ctx.entry?.camp_id || '';
    const campDetailUrl = campId ? `${origin}/camp-detail.html?id=${encodeURIComponent(campId)}` : '';
    const registrationUrl =
        ctx.campFields?.['Registration URL'] ||
        ctx.campFields?.['Website'] ||
        '';

    return {
        campName: ctx.campName,
        childName: normalizeChildName(ctx.entry?.child_name),
        registrationDate,
        registrationTime,
        planDatesLabel: formatDateRange(ctx.entry?.start_date, ctx.entry?.end_date),
        campDetailUrl,
        registrationUrl,
        entryId: ctx.entry?.id || '',
        campId
    };
}

async function handleRegCalendarSubmit(e) {
    e.preventDefault();
    const ctx = regCalendarModalContext;
    if (!ctx) return;

    const errEl = document.getElementById('reg-calendar-error');
    const successEl = document.getElementById('reg-calendar-success');
    const submitBtn = document.getElementById('reg-calendar-submit');

    if (errEl) {
        errEl.style.display = 'none';
        errEl.textContent = '';
    }
    if (successEl) {
        successEl.style.display = 'none';
        successEl.textContent = '';
    }

    const params = buildRegCalendarEventParams();
    if (params?.error) {
        if (errEl) {
            errEl.textContent = params.error;
            errEl.style.display = 'block';
        }
        return;
    }

    try {
        if (ctx.deliveryMethod === 'google') {
            const url = buildGoogleCalendarUrl(params);
            window.open(url, '_blank', 'noopener,noreferrer');
            closeRegistrationCalendarModal();
            return;
        }

        if (ctx.deliveryMethod === 'ics') {
            const ics = buildRegistrationIcs(params);
            downloadIcsFile(getIcsFilename(params.campName, params.childName), ics);
            closeRegistrationCalendarModal();
            return;
        }

        if (ctx.deliveryMethod === 'email') {
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Sending…';
            }
            await sendRegistrationCalendarEmail(params);
            if (successEl) {
                successEl.textContent = `Invite sent to ${ctx.authEmail || 'your email'}. Check your inbox.`;
                successEl.style.display = 'block';
            }
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = REG_CAL_DELIVERY_LABELS.email;
            }
            return;
        }
    } catch (err) {
        console.error('Registration calendar delivery failed:', err);
        if (errEl) {
            errEl.textContent = err.message || 'Something went wrong. Please try again.';
            errEl.style.display = 'block';
        }
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = REG_CAL_DELIVERY_LABELS[ctx.deliveryMethod] || 'Continue';
        }
    }
}

/**
 * @param {string} filename
 * @param {string} icsContent
 */
function downloadIcsFile(filename, icsContent) {
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

/**
 * @param {object} params
 */
async function sendRegistrationCalendarEmail(params) {
    const session = await getSession();
    const token = session?.access_token;
    if (!token) throw new Error('Please log in again to send email.');

    const isLocal =
        window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const apiUrl = isLocal
        ? 'http://localhost:8888/.netlify/functions/send-registration-calendar'
        : '/api/send-registration-calendar';

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
            campName: params.campName,
            childName: params.childName,
            registrationDate: params.registrationDate,
            registrationTime: params.registrationTime,
            planDatesLabel: params.planDatesLabel,
            campDetailUrl: params.campDetailUrl,
            registrationUrl: params.registrationUrl,
            entryId: params.entryId,
            campId: params.campId
        })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.error || 'Could not send email.');
    }
}

function closeRegistrationCalendarModal() {
    const backdrop = document.getElementById('reg-calendar-backdrop');
    const modal = document.getElementById('reg-calendar-modal');
    if (backdrop) backdrop.classList.remove('active');
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = '';
    regCalendarModalContext = null;
}
