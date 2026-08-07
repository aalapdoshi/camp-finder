// pickup-dropoff-calendar.js — Add pickup/dropoff to calendar (Summer Plan booked)

const PD_CAL_DELIVERY_LABELS = {
    google: 'Open in Google Calendar',
    ics: 'Download .ics file',
    email: 'Send email'
};

let pdCalendarModalContext = null;
let pdCalendarOpenMenu = null;

const PD_CALENDAR_TRIGGER_LABEL = 'Add pickup/dropoff to calendar';
const PD_CALENDAR_TRIGGER_LABEL_FULL = 'Add pickup/dropoff to calendar';

/**
 * Mount pickup/dropoff calendar dropdown into container.
 * @param {HTMLElement} container
 * @param {{ entry: object, campFields: object|null, campName: string, authEmail: string }} ctx
 */
function createPickupDropoffCalendarDropdown(container, ctx) {
    if (!container) return;

    container.innerHTML = '';
    const dropdown = document.createElement('span');
    dropdown.className = 'reg-calendar-dropdown';

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'summer-plan-action-link reg-calendar-trigger';
    trigger.setAttribute('aria-haspopup', 'menu');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-label', PD_CALENDAR_TRIGGER_LABEL_FULL);
    trigger.title = PD_CALENDAR_TRIGGER_LABEL_FULL;
    trigger.innerHTML = `${PD_CALENDAR_TRIGGER_LABEL} <span class="reg-calendar-chevron" aria-hidden="true">▾</span>`;

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
        const wasOpen = pdCalendarOpenMenu?.menu === menu && !menu.hidden;
        closeAllPdCalendarMenus();
        if (!wasOpen) {
            openPdCalendarMenu(trigger, menu, dropdown);
        }
    });

    menu.querySelectorAll('[data-delivery]').forEach((item) => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            closeAllPdCalendarMenus();
            openPickupDropoffCalendarModal({
                deliveryMethod: item.dataset.delivery,
                entry: ctx.entry,
                campFields: ctx.campFields,
                campName: ctx.campName,
                authEmail: ctx.authEmail
            });
        });
    });
}

function positionPdCalendarMenu(trigger, menu) {
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

function openPdCalendarMenu(trigger, menu, dropdownEl) {
    menu.classList.add('reg-calendar-menu--open');
    if (!menu._pdCalendarHome) {
        menu._pdCalendarHome = dropdownEl;
    }
    if (menu.parentElement !== document.body) {
        document.body.appendChild(menu);
    }
    positionPdCalendarMenu(trigger, menu);
    trigger.setAttribute('aria-expanded', 'true');
    pdCalendarOpenMenu = { menu, trigger, dropdownEl };
}

function closeAllPdCalendarMenus() {
    document.querySelectorAll('.reg-calendar-menu').forEach((m) => {
        m.hidden = true;
        m.classList.remove('reg-calendar-menu--open');
        m.style.position = '';
        m.style.top = '';
        m.style.left = '';
        m.style.zIndex = '';
        if (m._pdCalendarHome && m.parentElement === document.body) {
            m._pdCalendarHome.appendChild(m);
        }
        if (m._regCalendarHome && m.parentElement === document.body) {
            m._regCalendarHome.appendChild(m);
        }
    });
    document.querySelectorAll('.reg-calendar-trigger').forEach((t) => {
        t.setAttribute('aria-expanded', 'false');
    });
    pdCalendarOpenMenu = null;
    if (typeof regCalendarOpenMenu !== 'undefined') {
        regCalendarOpenMenu = null;
    }
}

document.addEventListener('click', () => closeAllPdCalendarMenus());
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAllPdCalendarMenus();
});
window.addEventListener('scroll', () => closeAllPdCalendarMenus(), true);
window.addEventListener('resize', () => {
    if (pdCalendarOpenMenu?.menu && !pdCalendarOpenMenu.menu.hidden) {
        positionPdCalendarMenu(pdCalendarOpenMenu.trigger, pdCalendarOpenMenu.menu);
    }
});

/**
 * @param {object} options
 */
function openPickupDropoffCalendarModal(options) {
    const { deliveryMethod, entry, campFields, campName, authEmail } = options;

    pdCalendarModalContext = { deliveryMethod, entry, campFields, campName, authEmail };

    let backdrop = document.getElementById('pd-calendar-backdrop');
    let modal = document.getElementById('pd-calendar-modal');

    if (!modal || !modal.querySelector('.reg-calendar-dialog')) {
        if (backdrop) backdrop.remove();
        if (modal) modal.remove();
        backdrop = null;
        modal = null;
    }

    if (!backdrop || !modal) {
        backdrop = document.createElement('div');
        backdrop.id = 'pd-calendar-backdrop';
        backdrop.className = 'reg-calendar-backdrop';
        modal = document.createElement('div');
        modal.id = 'pd-calendar-modal';
        modal.className = 'reg-calendar-modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-labelledby', 'pd-calendar-title');
        modal.setAttribute('aria-modal', 'true');
        modal.innerHTML = `
            <div class="reg-calendar-dialog">
                <header class="reg-calendar-header">
                    <div>
                        <h2 id="pd-calendar-title" class="reg-calendar-title">Add pickup/dropoff to calendar</h2>
                        <p class="reg-calendar-camp-name" id="pd-calendar-camp-name"></p>
                        <p class="reg-calendar-meta" id="pd-calendar-meta"></p>
                    </div>
                    <button type="button" class="reg-calendar-close" aria-label="Close">
                        <span class="material-symbols-outlined" aria-hidden="true">close</span>
                    </button>
                </header>
                <form id="pd-calendar-form" class="reg-calendar-form">
                    <div class="reg-calendar-body">
                        <div id="pd-calendar-schedule-notes-wrap" class="reg-calendar-schedule-notes-wrap" style="display:none;">
                            <p class="reg-calendar-field-label">Schedule notes</p>
                            <div id="pd-calendar-schedule-notes" class="reg-calendar-schedule-notes"></div>
                        </div>
                        <div class="reg-calendar-field">
                            <label for="pd-calendar-dropoff-time">Dropoff time</label>
                            <input type="time" id="pd-calendar-dropoff-time">
                        </div>
                        <div class="reg-calendar-field">
                            <label for="pd-calendar-pickup-time">Pickup time</label>
                            <input type="time" id="pd-calendar-pickup-time">
                        </div>
                        <p class="reg-calendar-hint">Each event spans 30 minutes before and after the time you set (America/Detroit). Download or email includes every weekday in your plan dates.</p>
                        <p id="pd-calendar-google-hint" class="reg-calendar-hint reg-calendar-hint--muted" style="display:none;">Google opens the first camp day only. Download or email for all weekdays.</p>
                        <div id="pd-calendar-warn-past" class="reg-calendar-warn" style="display:none;">Some times on the first camp day are in the past.</div>
                        <div id="pd-calendar-error" class="reg-calendar-error" style="display:none;"></div>
                        <div id="pd-calendar-success" class="reg-calendar-success" style="display:none;"></div>
                    </div>
                    <footer class="reg-calendar-footer">
                        <button type="submit" class="reg-calendar-submit" id="pd-calendar-submit">Continue</button>
                        <button type="button" class="reg-calendar-cancel">Cancel</button>
                    </footer>
                </form>
            </div>
        `;
        document.body.appendChild(backdrop);
        document.body.appendChild(modal);

        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) closePickupDropoffCalendarModal();
        });
        modal.querySelector('.reg-calendar-close').addEventListener('click', closePickupDropoffCalendarModal);
        modal.querySelector('.reg-calendar-cancel').addEventListener('click', closePickupDropoffCalendarModal);
        document.addEventListener('keydown', pdCalendarModalEscapeHandler);
        modal.querySelector('#pd-calendar-form').addEventListener('submit', handlePdCalendarSubmit);

        const dropoffInput = modal.querySelector('#pd-calendar-dropoff-time');
        const pickupInput = modal.querySelector('#pd-calendar-pickup-time');
        dropoffInput?.addEventListener('change', updatePdCalendarWarnings);
        pickupInput?.addEventListener('change', updatePdCalendarWarnings);
    }

    const campEl = document.getElementById('pd-calendar-camp-name');
    const metaEl = document.getElementById('pd-calendar-meta');
    const dropoffInput = document.getElementById('pd-calendar-dropoff-time');
    const pickupInput = document.getElementById('pd-calendar-pickup-time');
    const submitBtn = document.getElementById('pd-calendar-submit');
    const errEl = document.getElementById('pd-calendar-error');
    const successEl = document.getElementById('pd-calendar-success');
    const scheduleWrap = document.getElementById('pd-calendar-schedule-notes-wrap');
    const scheduleEl = document.getElementById('pd-calendar-schedule-notes');
    const googleHint = document.getElementById('pd-calendar-google-hint');

    if (campEl) campEl.textContent = campName || 'Camp';

    const childLabel = normalizeChildName(entry?.child_name) || 'Unassigned';
    const planDates = formatDateRange(entry?.start_date, entry?.end_date);
    if (metaEl) metaEl.textContent = planDates ? `${childLabel} · ${planDates}` : childLabel;

    const scheduleNotes = campFields?.['Schedule Notes'];
    if (scheduleWrap && scheduleEl) {
        if (scheduleNotes && String(scheduleNotes).trim()) {
            scheduleEl.textContent = String(scheduleNotes).trim();
            scheduleWrap.style.display = 'block';
        } else {
            scheduleWrap.style.display = 'none';
            scheduleEl.textContent = '';
        }
    }

    if (dropoffInput) dropoffInput.value = '';
    if (pickupInput) pickupInput.value = '';

    if (googleHint) {
        googleHint.style.display = deliveryMethod === 'google' ? 'block' : 'none';
    }

    if (submitBtn) submitBtn.textContent = PD_CAL_DELIVERY_LABELS[deliveryMethod] || 'Continue';
    if (errEl) {
        errEl.textContent = '';
        errEl.style.display = 'none';
    }
    if (successEl) {
        successEl.textContent = '';
        successEl.style.display = 'none';
    }

    updatePdCalendarWarnings();

    document.body.style.overflow = 'hidden';
    backdrop.classList.add('active');
    modal.classList.add('active');
    dropoffInput?.focus();
}

function pdCalendarModalEscapeHandler(e) {
    if (e.key === 'Escape') {
        const modal = document.getElementById('pd-calendar-modal');
        if (modal?.classList.contains('active')) closePickupDropoffCalendarModal();
    }
}

function getFirstWeekdayInPlan(entry) {
    const weekdays = enumerateWeekdaysInRange(entry?.start_date, entry?.end_date);
    return weekdays[0] || null;
}

function updatePdCalendarWarnings() {
    const dropoffInput = document.getElementById('pd-calendar-dropoff-time');
    const pickupInput = document.getElementById('pd-calendar-pickup-time');
    const warnPast = document.getElementById('pd-calendar-warn-past');
    const ctx = pdCalendarModalContext;
    if (!warnPast || !ctx?.entry) {
        if (warnPast) warnPast.style.display = 'none';
        return;
    }

    const firstDay = getFirstWeekdayInPlan(ctx.entry);
    if (!firstDay) {
        warnPast.style.display = 'none';
        return;
    }

    let past = false;
    if (dropoffInput?.value && isCampDayEventInPast(firstDay, dropoffInput.value)) past = true;
    if (pickupInput?.value && isCampDayEventInPast(firstDay, pickupInput.value)) past = true;
    warnPast.style.display = past ? 'block' : 'none';
}

function buildPdCalendarEventParams() {
    const ctx = pdCalendarModalContext;
    if (!ctx) return null;

    const dropoffInput = document.getElementById('pd-calendar-dropoff-time');
    const pickupInput = document.getElementById('pd-calendar-pickup-time');
    const dropoffTime = dropoffInput?.value?.trim() || '';
    const pickupTime = pickupInput?.value?.trim() || '';

    if (!dropoffTime && !pickupTime) {
        return { error: 'Please enter at least a dropoff or pickup time.' };
    }

    const origin = window.location.origin || '';
    const campId = ctx.entry?.camp_id || '';
    const campDetailUrl = campId ? `${origin}/camp-detail.html?id=${encodeURIComponent(campId)}` : '';
    const scheduleNotes = ctx.campFields?.['Schedule Notes']
        ? String(ctx.campFields['Schedule Notes']).trim()
        : '';

    try {
        const events = buildPickupDropoffEvents({
            campName: ctx.campName,
            childName: normalizeChildName(ctx.entry?.child_name),
            startDate: ctx.entry?.start_date,
            endDate: ctx.entry?.end_date,
            dropoffTime,
            pickupTime,
            planDatesLabel: formatDateRange(ctx.entry?.start_date, ctx.entry?.end_date),
            campDetailUrl,
            scheduleNotes,
            entryId: ctx.entry?.id || '',
            campId
        });

        return {
            events,
            dropoffTime,
            pickupTime,
            campName: ctx.campName,
            childName: normalizeChildName(ctx.entry?.child_name),
            startDate: ctx.entry?.start_date,
            endDate: ctx.entry?.end_date,
            planDatesLabel: formatDateRange(ctx.entry?.start_date, ctx.entry?.end_date),
            campDetailUrl,
            scheduleNotes,
            entryId: ctx.entry?.id || '',
            campId
        };
    } catch (err) {
        return { error: err.message || 'Could not build calendar events.' };
    }
}

async function handlePdCalendarSubmit(e) {
    e.preventDefault();
    const ctx = pdCalendarModalContext;
    if (!ctx) return;

    const errEl = document.getElementById('pd-calendar-error');
    const successEl = document.getElementById('pd-calendar-success');
    const submitBtn = document.getElementById('pd-calendar-submit');

    if (errEl) {
        errEl.style.display = 'none';
        errEl.textContent = '';
    }
    if (successEl) {
        successEl.style.display = 'none';
        successEl.textContent = '';
    }

    const params = buildPdCalendarEventParams();
    if (params?.error) {
        if (errEl) {
            errEl.textContent = params.error;
            errEl.style.display = 'block';
        }
        return;
    }

    try {
        if (ctx.deliveryMethod === 'google') {
            const firstDay = getFirstWeekdayInPlan(ctx.entry);
            const googleEvents = params.events.filter((ev) => ev.date === firstDay);
            const tabs = [];
            if (params.dropoffTime) {
                const dropoffEv = googleEvents.find((ev) => ev.type === 'dropoff');
                if (dropoffEv) tabs.push(buildGoogleCalendarUrlForEvent(dropoffEv));
            }
            if (params.pickupTime) {
                const pickupEv = googleEvents.find((ev) => ev.type === 'pickup');
                if (pickupEv) tabs.push(buildGoogleCalendarUrlForEvent(pickupEv));
            }
            tabs.forEach((url) => window.open(url, '_blank', 'noopener,noreferrer'));
            closePickupDropoffCalendarModal();
            return;
        }

        if (ctx.deliveryMethod === 'ics') {
            const ics = buildPickupDropoffIcs(params.events);
            downloadPdIcsFile(getPickupDropoffIcsFilename(params.campName, params.childName), ics);
            closePickupDropoffCalendarModal();
            return;
        }

        if (ctx.deliveryMethod === 'email') {
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Sending…';
            }
            await sendPickupDropoffCalendarEmail(params);
            if (successEl) {
                successEl.textContent = `Invite sent to ${ctx.authEmail || 'your email'}. Check your inbox.`;
                successEl.style.display = 'block';
            }
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = PD_CAL_DELIVERY_LABELS.email;
            }
            return;
        }
    } catch (err) {
        console.error('Pickup/dropoff calendar delivery failed:', err);
        if (errEl) {
            errEl.textContent = err.message || 'Something went wrong. Please try again.';
            errEl.style.display = 'block';
        }
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = PD_CAL_DELIVERY_LABELS[ctx.deliveryMethod] || 'Continue';
        }
    }
}

function downloadPdIcsFile(filename, icsContent) {
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

async function sendPickupDropoffCalendarEmail(params) {
    const session = await getSession();
    const token = session?.access_token;
    if (!token) throw new Error('Please log in again to send email.');

    const isLocal =
        window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const apiUrl = isLocal
        ? 'http://localhost:8888/.netlify/functions/send-pickup-dropoff-calendar'
        : '/api/send-pickup-dropoff-calendar';

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
            campName: params.campName,
            childName: params.childName,
            startDate: params.startDate,
            endDate: params.endDate,
            dropoffTime: params.dropoffTime || '',
            pickupTime: params.pickupTime || '',
            planDatesLabel: params.planDatesLabel,
            campDetailUrl: params.campDetailUrl,
            scheduleNotes: params.scheduleNotes,
            entryId: params.entryId,
            campId: params.campId
        })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.error || 'Could not send email.');
    }
}

function closePickupDropoffCalendarModal() {
    const backdrop = document.getElementById('pd-calendar-backdrop');
    const modal = document.getElementById('pd-calendar-modal');
    if (backdrop) backdrop.classList.remove('active');
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = '';
    pdCalendarModalContext = null;
}
