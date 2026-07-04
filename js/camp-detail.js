// camp-detail.js - Render a single camp's details based on ?id= query param

// Uses: airtable.js (computeRegistrationStatus, formatRegistrationDate, getCampById)
//       auth.js (getSession), favorites.js (addFavorite, removeFavorite, isFavorite)

function escapeHtml(text) {
    if (text == null) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

function campDetailHeartSvg(filled) {
    const fill = filled ? 'currentColor' : 'none';
    return `<svg class="camp-detail-btn-heart" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="${fill}" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
}

function formatScheduleBlock(text) {
    if (!text) return '';
    const str = String(text).trim();
    if (!str) return '';
    const parts = str.split(/\n+|;\s*/).map((s) => s.trim()).filter(Boolean);
    if (parts.length <= 1) {
        return `<p class="camp-detail-schedule-text">${escapeHtml(str)}</p>`;
    }
    return `<ul class="camp-detail-schedule-list">${parts.map((p) => `<li>${escapeHtml(p)}</li>`).join('')}</ul>`;
}

function campDetailCard(icon, title, bodyHtml) {
    if (!bodyHtml) return '';
    return `
        <section class="camp-detail-card">
            <header class="camp-detail-card-header">
                <span class="material-symbols-outlined camp-detail-card-icon" aria-hidden="true">${icon}</span>
                <h2>${escapeHtml(title)}</h2>
            </header>
            <div class="camp-detail-card-body">
                ${bodyHtml}
            </div>
        </section>
    `;
}

function campDetailFact(icon, label, value) {
    if (!value) return '';
    return `
        <div class="camp-detail-fact">
            <span class="material-symbols-outlined camp-detail-fact-icon" aria-hidden="true">${icon}</span>
            <div class="camp-detail-fact-text">
                <span class="camp-detail-fact-label">${escapeHtml(label)}</span>
                <span class="camp-detail-fact-value">${escapeHtml(value)}</span>
            </div>
        </div>
    `;
}

async function initCampDetailPage() {
    const loadingEl = document.getElementById('camp-detail-loading');
    const errorEl = document.getElementById('camp-detail-error');
    const detailEl = document.getElementById('camp-detail');

    const params = new URLSearchParams(window.location.search);
    const campId = params.get('id');

    if (!campId) {
        if (loadingEl) loadingEl.style.display = 'none';
        if (errorEl) {
            errorEl.style.display = 'block';
            errorEl.querySelector('h1').textContent = "We couldn't find that camp";
            errorEl.querySelector('p').textContent = 'No camp was specified. Please go back to Browse and try again.';
        }
        return;
    }

    try {
        const camp = await getCampById(campId);

        if (!camp) {
            if (loadingEl) loadingEl.style.display = 'none';
            if (errorEl) errorEl.style.display = 'block';
            return;
        }

        if (loadingEl) loadingEl.style.display = 'none';
        if (detailEl) {
            detailEl.style.display = 'block';
            const session = await getSession();
            const isLoggedIn = !!session?.user?.id;
            const savedIds = isLoggedIn ? await getSavedCampIds() : [];
            const isSaved = savedIds.includes(campId);
            detailEl.innerHTML = renderCampDetail(camp, { isSaved, isLoggedIn });
            if (isLoggedIn) wireFavoriteButton(detailEl, campId, isSaved);
            wireAddToPlanButton(detailEl, campId, camp.fields['Camp Name'] || 'Camp', camp.fields);
        }
    } catch (error) {
        console.error('Error loading camp detail:', error);
        if (loadingEl) loadingEl.style.display = 'none';
        if (errorEl) errorEl.style.display = 'block';
    }
}

/**
 * Wire up the Add to Summer Plan button.
 */
function wireAddToPlanButton(container, campId, campName, campFields = null) {
    const btn = container.querySelector('.btn-add-to-plan');
    if (!btn) return;
    btn.addEventListener('click', async () => {
        if (typeof openAddToPlanModal === 'function') {
            await openAddToPlanModal(campId, campName, { campFields });
        }
    });
}

/**
 * Wire up the favorite button click handler.
 */
function wireFavoriteButton(container, campId, initialSaved) {
    const btn = container.querySelector('.btn-favorite-toggle');
    if (!btn) return;
    const state = { isSaved: initialSaved };
    const labelEl = btn.querySelector('.camp-detail-btn-label');

    function updateButton(saved) {
        if (labelEl) {
            labelEl.textContent = saved ? 'Remove from Favorites' : 'Add to Favorites';
        }
        const iconEl = btn.querySelector('.camp-detail-btn-heart');
        if (iconEl) {
            iconEl.setAttribute('fill', saved ? 'currentColor' : 'none');
        }
        btn.classList.toggle('camp-detail-btn-outline-active', saved);
        btn.classList.toggle('btn-favorite-remove', saved);
        btn.classList.toggle('btn-favorite-add', !saved);
    }

    updateButton(initialSaved);

    btn.addEventListener('click', async () => {
        const session = await getSession();
        if (!session?.user?.id) {
            const redirectTo = encodeURIComponent(`camp-detail.html?id=${campId}`);
            window.location.href = `login.html?redirectTo=${redirectTo}`;
            return;
        }
        if (state.isSaved) {
            const ok = await removeFavorite(campId);
            if (ok) {
                state.isSaved = false;
                updateButton(false);
            }
        } else {
            const ok = await addFavorite(campId);
            if (ok) {
                state.isSaved = true;
                updateButton(true);
            }
        }
    });
}

function renderCampDetail(camp, options = {}) {
    const { isSaved = false, isLoggedIn = false } = options;
    const fields = camp.fields || {};

    const name = fields['Camp Name'] || 'Camp';
    const category = fields['Primary Category'] || 'General';
    const ageText = typeof formatCampAges === 'function'
        ? formatCampAges(fields).replace(/^Ages\s+/i, '')
        : ((fields['Age Min'] != null && fields['Age Max'] != null) ? `${fields['Age Min']}-${fields['Age Max']}` : '');
    const costDisplay = typeof formatCampCostDisplay === 'function'
        ? formatCampCostDisplay(fields)
        : (fields['Cost Display'] || (fields['Cost Per Week'] != null ? `$${fields['Cost Per Week']}` : ''));
    const city = fields['City'];
    const locationName = fields['Location Name'];
    const hasAfterCare = fields['Has After Care'];
    const shortDescription = (fields['Short Description'] && fields['Short Description'].toString().trim()) || '';
    const description = (fields['Description'] && fields['Description'].toString().trim()) || shortDescription || '';
    const activities = Array.isArray(fields['Activities']) ? fields['Activities'] : [];
    const website = fields['Website'] || fields['Registration URL'] || null;

    const sessionDates = fields['Session Dates'] || fields['Dates'];
    const weeksOffered = fields['Weeks Offered'];

    const address = fields['Address'];
    const scheduleNotes = fields['Schedule Notes'];
    const registrationNotes = fields['Registration Notes'];
    const extendedCareNotes = fields['Extended Care Notes'];

    const registrationStatus = computeRegistrationStatus(fields);
    const registrationDate = formatRegistrationDate(fields['Registration Opens Date'], fields['Registration Opens Time']);
    const registrationBadgeHtml = typeof getRegistrationBadgeHtml === 'function'
        ? getRegistrationBadgeHtml(registrationStatus, true)
        : '';

    const locationLine = city
        ? (locationName ? `${locationName}, ${city}` : city)
        : (locationName || '');

    const afterCareBadgeHtml = hasAfterCare
        ? `<span class="camp-detail-after-care-badge"><span class="material-symbols-outlined" aria-hidden="true">nightlight</span> After care available</span>`
        : '';

    const subtitleHtml = shortDescription && shortDescription !== description
        ? `<p class="camp-detail-subtitle">${escapeHtml(shortDescription)}</p>`
        : '';

    const websiteButton = website
        ? `<a href="${website}" target="_blank" rel="noopener noreferrer" class="camp-detail-btn-primary">Visit Website</a>`
        : '';

    const favoriteLabel = isSaved ? 'Remove from Favorites' : 'Add to Favorites';
    const favoriteButtonHtml = isLoggedIn
        ? `<button type="button" class="camp-detail-btn-outline btn-favorite-toggle ${isSaved ? 'camp-detail-btn-outline-active btn-favorite-remove' : 'btn-favorite-add'}">${campDetailHeartSvg(isSaved)}<span class="camp-detail-btn-label">${favoriteLabel}</span></button>`
        : `<a href="login.html?redirectTo=${encodeURIComponent('camp-detail.html?id=' + camp.id)}" class="camp-detail-btn-outline">${campDetailHeartSvg(false)}<span class="camp-detail-btn-label">Log in to save favorites</span></a>`;

    const addToPlanButtonHtml = isLoggedIn
        ? `<button type="button" class="camp-detail-btn-primary btn-add-to-plan">Add to Summer Plan</button>`
        : `<a href="login.html?redirectTo=${encodeURIComponent('camp-detail.html?id=' + camp.id)}" class="camp-detail-btn-outline">Log in to add to summer plan</a>`;

    const aboutHtml = description
        ? campDetailCard('info', 'About this camp', `<p class="camp-detail-description">${escapeHtml(description)}</p>`)
        : '';

    let scheduleBody = '';
    if (sessionDates) {
        scheduleBody += `<div class="camp-detail-schedule-block"><span class="camp-detail-schedule-label">Session dates</span>${formatScheduleBlock(sessionDates)}</div>`;
    }
    if (weeksOffered) {
        scheduleBody += `<div class="camp-detail-schedule-block"><span class="camp-detail-schedule-label">Weeks offered</span>${formatScheduleBlock(weeksOffered)}</div>`;
    }
    if (scheduleNotes) {
        scheduleBody += `<div class="camp-detail-schedule-block"><span class="camp-detail-schedule-label">Schedule notes</span><p class="camp-detail-schedule-text">${escapeHtml(scheduleNotes)}</p></div>`;
    }
    const scheduleHtml = scheduleBody ? campDetailCard('calendar_month', 'Schedule', scheduleBody) : '';

    const activitiesHtml = activities.length > 0
        ? campDetailCard('sports_soccer', 'Activities', `<div class="camp-detail-activities">${activities.map((act) => `<span class="camp-activity-pill">${escapeHtml(act)}</span>`).join('')}</div>`)
        : '';

    const registrationCardHtml = registrationNotes
        ? campDetailCard('event_note', 'Registration notes', `<p class="camp-detail-note-text">${escapeHtml(registrationNotes)}</p>`)
        : '';

    let extendedCareBody = '';
    if (extendedCareNotes) {
        extendedCareBody = `<p class="camp-detail-note-text">${escapeHtml(extendedCareNotes)}</p>`;
    } else if (hasAfterCare) {
        extendedCareBody = '<p class="camp-detail-note-text">After care is available for this camp.</p>';
    }
    const extendedCareCardHtml = extendedCareBody
        ? campDetailCard('nightlight', 'Extended care', extendedCareBody)
        : '';

    const notesRowHtml = (registrationCardHtml || extendedCareCardHtml)
        ? `<div class="camp-detail-notes-row">${registrationCardHtml}${extendedCareCardHtml}</div>`
        : '';

    const quickFacts = [
        campDetailFact('child_care', 'Ages', ageText),
        campDetailFact('payments', 'Cost', costDisplay),
        campDetailFact('location_on', 'Location', locationLine),
        campDetailFact('event', 'Registration opens', registrationDate)
    ].filter(Boolean).join('');

    const quickDetailsHtml = quickFacts
        ? `<aside class="camp-detail-sidebar-card camp-detail-quick-details">
            <h2 class="camp-detail-sidebar-title">Quick details</h2>
            <div class="camp-detail-facts">${quickFacts}</div>
        </aside>`
        : '';

    const mapsUrl = address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
        : null;
    const locationCardHtml = address
        ? `<aside class="camp-detail-sidebar-card camp-detail-location-card">
            <h2 class="camp-detail-sidebar-title">Location</h2>
            <p class="camp-detail-location-address">${escapeHtml(address)}</p>
            ${mapsUrl ? `<a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" class="camp-detail-maps-link">Open in Maps <span class="material-symbols-outlined" aria-hidden="true">open_in_new</span></a>` : ''}
        </aside>`
        : '';

    return `
        <header class="camp-detail-hero">
            <div class="camp-detail-hero-badges">
                <span class="camp-category">${escapeHtml(category)}</span>
                ${registrationBadgeHtml}
                ${afterCareBadgeHtml}
            </div>
            <h1 class="camp-detail-title">${escapeHtml(name)}</h1>
            ${subtitleHtml}
        </header>

        <div class="camp-detail-action-bar">
            ${websiteButton}
            ${favoriteButtonHtml}
            ${addToPlanButtonHtml}
        </div>

        <div class="camp-detail-columns">
            <div class="camp-detail-main">
                ${aboutHtml}
                ${scheduleHtml}
                ${activitiesHtml}
                ${notesRowHtml}
            </div>
            <div class="camp-detail-sidebar">
                ${quickDetailsHtml}
                ${locationCardHtml}
            </div>
        </div>
    `;
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCampDetailPage);
} else {
    initCampDetailPage();
}
