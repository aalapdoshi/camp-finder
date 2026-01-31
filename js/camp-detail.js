// camp-detail.js - Render a single camp's details based on ?id= query param

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
            detailEl.innerHTML = renderCampDetail(camp);
        }
    } catch (error) {
        console.error('Error loading camp detail:', error);
        if (loadingEl) loadingEl.style.display = 'none';
        if (errorEl) errorEl.style.display = 'block';
    }
}

function renderCampDetail(camp) {
    const fields = camp.fields || {};

    const name = fields['Camp Name'] || 'Camp';
    const category = fields['Primary Category'] || 'General';
    const ageMin = fields['Age Min'];
    const ageMax = fields['Age Max'];
    const costDisplay = fields['Cost Display'] || (fields['Cost Per Week'] ? `$${fields['Cost Per Week']}` : null);
    const city = fields['City'];
    const locationName = fields['Location Name'];
    const hasAfterCare = fields['Has After Care'];
    const description = fields['Description'] || fields['Short Description'] || '';
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

    return `
        <header class="camp-detail-header">
            <div class="camp-detail-header-top">
                <span class="camp-category">${category}</span>
                <h1 class="camp-detail-title">${name}</h1>
            </div>
            ${afterCareHtml}
            <div class="camp-detail-meta">
                ${metaHtml}
            </div>
            ${websiteButton}
        </header>

        <section class="camp-detail-section">
            <h2>About this camp</h2>
            <p class="camp-detail-description">${description}</p>
        </section>

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

