// camp-detail.js - Render a single camp's details based on ?id= query param

// Uses: airtable.js (computeRegistrationStatus, formatRegistrationDate, getCampById)
//       auth.js (getSession), favorites.js (addFavorite, removeFavorite, isFavorite)

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
        }
    } catch (error) {
        console.error('Error loading camp detail:', error);
        if (loadingEl) loadingEl.style.display = 'none';
        if (errorEl) errorEl.style.display = 'block';
    }
}

/**
 * Wire up the favorite button click handler.
 */
function wireFavoriteButton(container, campId, initialSaved) {
    const btn = container.querySelector('.btn-favorite-toggle');
    if (!btn) return;
    const state = { isSaved: initialSaved };
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
                btn.textContent = 'Add to Favorites';
                btn.classList.remove('btn-favorite-remove');
                btn.classList.add('btn-favorite-add');
                state.isSaved = false;
            }
        } else {
            const ok = await addFavorite(campId);
            if (ok) {
                btn.textContent = 'Remove from Favorites';
                btn.classList.remove('btn-favorite-add');
                btn.classList.add('btn-favorite-remove');
                state.isSaved = true;
            }
        }
    });
}

function renderCampDetail(camp, options = {}) {
    const { isSaved = false, isLoggedIn = false } = options;
    const fields = camp.fields || {};

    const name = fields['Camp Name'] || 'Camp';
    const category = fields['Primary Category'] || 'General';
    const ageMin = fields['Age Min'];
    const ageMax = fields['Age Max'];
    const costDisplay = fields['Cost Display'] || (fields['Cost Per Week'] != null ? `$${fields['Cost Per Week']}` : null);
    const city = fields['City'];
    const locationName = fields['Location Name'];
    const hasAfterCare = fields['Has After Care'];
    // Get description safely, avoiding null/undefined
    const description = (fields['Description'] && fields['Description'].toString().trim()) || 
                        (fields['Short Description'] && fields['Short Description'].toString().trim()) || 
                        '';
    const activities = Array.isArray(fields['Activities']) ? fields['Activities'] : [];
    const website = fields['Website'] || fields['Registration URL'] || null;

    // Optional schedule-related fields (will only show if present)
    const sessionDates = fields['Session Dates'] || fields['Dates'];
    const weeksOffered = fields['Weeks Offered'];

    // Notes fields
    const address = fields['Address'];
    const scheduleNotes = fields['Schedule Notes'];
    const registrationNotes = fields['Registration Notes'];
    const extendedCareNotes = fields['Extended Care Notes'];

    const ageText = (ageMin != null && ageMax != null) ? `${ageMin}-${ageMax}` : null;

    // Compute registration status and format date
    const registrationStatus = computeRegistrationStatus(fields);
    const registrationDate = formatRegistrationDate(fields['Registration Opens Date'], fields['Registration Opens Time']);
    
    // Get badge class based on status
    let statusBadgeClass = '';
    if (registrationStatus === 'Open Now') {
        statusBadgeClass = 'badge-status-open';
    } else if (registrationStatus === 'Coming Soon') {
        statusBadgeClass = 'badge-status-coming-soon';
    } else if (registrationStatus === 'Not Updated') {
        statusBadgeClass = 'badge-status-not-updated';
    }
    
    // Build registration status badge HTML
    const registrationBadgeHtml = registrationStatus ? 
        `<span class="badge ${statusBadgeClass}">${registrationStatus}</span>` : '';

    const metaItems = [];
    if (ageText) {
        metaItems.push({
            label: 'Ages',
            value: ageText
        });
    }
    if (costDisplay) {
        metaItems.push({
            label: 'Cost',
            value: costDisplay
        });
    }
    if (city) {
        metaItems.push({
            label: 'Location',
            value: locationName ? `${locationName}, ${city}` : city
        });
    }
    if (registrationDate) {
        metaItems.push({
            label: 'Registration',
            value: registrationDate
        });
    }

    const metaHtml = metaItems.map(item => `
        <div class="camp-detail-meta-item">
            <span class="detail-label">${item.label}:</span>
            <span class="detail-value">${item.value}</span>
        </div>
    `).join('');

    const afterCareHtml = hasAfterCare ? `
        <div class="badge">✓ After care available</div>
    ` : '';

    const activitiesHtml = activities.length > 0 ? `
        <section class="camp-detail-section">
            <h2>Activities</h2>
            <div class="camp-detail-activities">
                ${activities.map(act => `<span class="camp-activity-pill">${act}</span>`).join('')}
            </div>
        </section>
    ` : '';

    const scheduleHtml = (sessionDates || weeksOffered) ? `
        <section class="camp-detail-section">
            <h2>Schedule</h2>
            <div class="camp-detail-schedule">
                ${sessionDates ? `<p><span class="detail-label">Dates:</span> <span class="detail-value">${sessionDates}</span></p>` : ''}
                ${weeksOffered ? `<p><span class="detail-label">Weeks Offered:</span> <span class="detail-value">${weeksOffered}</span></p>` : ''}
            </div>
        </section>
    ` : '';

    // Build Notes section
    const notesItems = [];
    if (address) {
        notesItems.push({ label: 'Address', value: address });
    }
    if (scheduleNotes) {
        notesItems.push({ label: 'Schedule Notes', value: scheduleNotes });
    }
    if (registrationNotes) {
        notesItems.push({ label: 'Registration Notes', value: registrationNotes });
    }
    if (extendedCareNotes) {
        notesItems.push({ label: 'Extended Care Notes', value: extendedCareNotes });
    }

    const notesHtml = notesItems.length > 0 ? `
        <section class="camp-detail-section">
            <h2>Notes</h2>
            <div class="camp-detail-notes">
                ${notesItems.map(item => `
                    <div class="camp-detail-note-item">
                        <span class="detail-label">${item.label}:</span>
                        <span class="detail-value">${item.value}</span>
                    </div>
                `).join('')}
            </div>
        </section>
    ` : '';

    const websiteButton = website ? `
        <a href="${website}" target="_blank" rel="noopener noreferrer" class="btn-primary">
            Visit Camp Website
        </a>
    ` : '';

    const favoriteButtonHtml = isLoggedIn
        ? (isSaved
            ? `<button type="button" class="btn-favorite-toggle btn-favorite-remove">Remove from Favorites</button>`
            : `<button type="button" class="btn-favorite-toggle btn-favorite-add">Add to Favorites</button>`)
        : `<a href="login.html?redirectTo=${encodeURIComponent('camp-detail.html?id=' + camp.id)}" class="btn-secondary">Log in to save favorites</a>`;

    return `
        <header class="camp-detail-header">
            <div class="camp-detail-header-top">
                <div>
                    <span class="camp-category">${category}</span>
                    ${registrationBadgeHtml}
                </div>
                <h1 class="camp-detail-title">${name}</h1>
            </div>
            ${afterCareHtml}
            <div class="camp-detail-meta">
                ${metaHtml}
            </div>
            <div class="camp-detail-actions">
                ${websiteButton}
                ${favoriteButtonHtml}
            </div>
        </header>

        ${description ? `
        <section class="camp-detail-section">
            <h2>About this camp</h2>
            <p class="camp-detail-description">${description}</p>
        </section>
        ` : ''}

        ${notesHtml}
        ${scheduleHtml}
        ${activitiesHtml}
    `;
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCampDetailPage);
} else {
    initCampDetailPage();
}

