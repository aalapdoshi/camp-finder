// airtable.js - Fetch and manage camp data from Airtable

// Global cache for camps data
let campsCache = null;
let categoriesCache = null;

/**
 * Fetch all camps from Airtable
 */
async function fetchCamps(forceRefresh = false) {
    if (campsCache && !forceRefresh) {
        return campsCache;
    }

    try {
        let url, headers;
        
        // Use Netlify proxy if available, otherwise direct API
        if (typeof AIRTABLE_API_ENDPOINT !== 'undefined' && AIRTABLE_API_ENDPOINT) {
            url = `${AIRTABLE_API_ENDPOINT}?table=Camps`;
            headers = {}; // No auth header needed, handled by proxy
        } else {
            url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Camps`;
            headers = {
                'Authorization': `Bearer ${AIRTABLE_API_KEY}`
            };
        }
        
        const response = await fetch(url, { headers });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        // Netlify proxy returns all records in one response (handles pagination server-side)
        // Direct API may need pagination handling
        let allRecords = data.records || [];
        let offset = data.offset;
        
        // Fetch remaining pages if using direct API (Netlify proxy handles pagination server-side)
        if (!AIRTABLE_API_ENDPOINT && offset) {
            while (offset) {
                const nextResponse = await fetch(
                    `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Camps?offset=${offset}`,
                    { headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}` } }
                );
                if (!nextResponse.ok) break;
                const nextData = await nextResponse.json();
                allRecords = allRecords.concat(nextData.records);
                offset = nextData.offset;
            }
        }
        
        campsCache = allRecords;
        return campsCache;
    } catch (error) {
        console.error('Error fetching camps:', error);
        return [];
    }
}

/**
 * Fetch categories from Airtable
 */
async function fetchCategories() {
    if (categoriesCache) {
        return categoriesCache;
    }

    try {
        let url, headers;
        
        // Use Netlify proxy if available, otherwise direct API
        if (typeof AIRTABLE_API_ENDPOINT !== 'undefined' && AIRTABLE_API_ENDPOINT) {
            url = `${AIRTABLE_API_ENDPOINT}?table=Categories`;
            headers = {}; // No auth header needed, handled by proxy
        } else {
            url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Categories`;
            headers = {
                'Authorization': `Bearer ${AIRTABLE_API_KEY}`
            };
        }
        
        const response = await fetch(url, { headers });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        // Netlify proxy returns all records in one response (handles pagination server-side)
        // Direct API may need pagination handling
        let allRecords = data.records || [];
        let offset = data.offset;
        
        // Fetch remaining pages if using direct API (Netlify proxy handles pagination server-side)
        if (!AIRTABLE_API_ENDPOINT && offset) {
            while (offset) {
                const nextResponse = await fetch(
                    `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Categories?offset=${offset}`,
                    { headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}` } }
                );
                if (!nextResponse.ok) break;
                const nextData = await nextResponse.json();
                allRecords = allRecords.concat(nextData.records);
                offset = nextData.offset;
            }
        }
        
        categoriesCache = allRecords;
        return categoriesCache;
    } catch (error) {
        console.error('Error fetching categories:', error);
        return [];
    }
}

/**
 * Get a single camp by ID
 */
async function getCampById(id) {
    const camps = await fetchCamps();
    return camps.find(camp => camp.id === id);
}

/**
 * Filter camps based on criteria
 */
function filterCamps(camps, filters) {
    return camps.filter(camp => {
        const fields = camp.fields;

        // Age filter
        if (filters.age) {
            const age = parseInt(filters.age);
            if (fields['Age Min'] > age || fields['Age Max'] < age) {
                return false;
            }
        }

        // Price filter
        if (filters.maxPrice) {
            const maxPrice = parseInt(filters.maxPrice);
            if (fields['Cost Per Week'] > maxPrice) {
                return false;
            }
        }

        // Location filter
        if (filters.city && filters.city !== 'all') {
            if (fields['City'] !== filters.city) {
                return false;
            }
        }

        // Category filter
        if (filters.category && filters.category !== 'all') {
            if (fields['Primary Category'] !== filters.category) {
                return false;
            }
        }

        // After care filter
        if (filters.afterCare) {
            if (!fields['Has After Care']) {
                return false;
            }
        }

        // Search query
        if (filters.searchQuery) {
            const query = filters.searchQuery.toLowerCase();
            const searchableText = [
                fields['Camp Name'],
                fields['Description'],
                fields['Short Description'],
                fields['Primary Category'],
                fields['City'],
                fields['Activities']?.join(' ')
            ].join(' ').toLowerCase();

            if (!searchableText.includes(query)) {
                return false;
            }
        }

        return true;
    });
}

/**
 * Load featured camps
 */
async function loadFeaturedCamps() {
    const container = document.getElementById('featured-camps');
    if (!container) return;

    try {
        const camps = await fetchCamps();
        const featured = camps.filter(camp => camp.fields['Featured'] === true);

        if (featured.length === 0) {
            // If no camps marked as featured, show first 6
            featured.push(...camps.slice(0, 6));
        }

        container.innerHTML = '';
        featured.slice(0, 6).forEach(camp => {
            container.appendChild(createCampCard(camp));
        });
    } catch (error) {
        console.error('Error loading featured camps:', error);
        container.innerHTML = '<p class="loading">Unable to load camps. Please refresh the page.</p>';
    }
}

/**
 * Load categories
 */
async function loadCategories() {
    const container = document.getElementById('categories-grid');
    if (!container) return;

    try {
        const categories = await fetchCategories();
        const camps = await fetchCamps();

        container.innerHTML = '';

        // If no categories in Airtable, create from camp data
        if (categories.length === 0) {
            const categoryMap = {};
            camps.forEach(camp => {
                const category = camp.fields['Primary Category'];
                if (category) {
                    categoryMap[category] = (categoryMap[category] || 0) + 1;
                }
            });

            Object.entries(categoryMap).forEach(([name, count]) => {
                container.appendChild(createCategoryCard({ fields: { 
                    'Category Name': name, 
                    'Camp Count': count 
                }}));
            });
        } else {
            categories.forEach(category => {
                container.appendChild(createCategoryCard(category));
            });
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

/**
 * Create a camp card element
 */
function createCampCard(camp) {
    const fields = camp.fields;
    const card = document.createElement('div');
    card.className = 'camp-card';

    // Get description text safely
    let descriptionText = '';
    if (fields['Short Description'] && fields['Short Description'].toString().trim()) {
      descriptionText = fields['Short Description'].toString().trim();
    } else if (fields['Description'] && fields['Description'].toString().trim()) {
      const desc = fields['Description'].toString().trim();
      descriptionText = desc.length > 120 ? desc.substring(0, 120) + '...' : desc;
    }
    
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
    
    card.innerHTML = `
        <div>
            <span class="camp-category">${fields['Primary Category'] || 'General'}</span>
            ${registrationBadgeHtml}
        </div>
        <h3 class="camp-name">${fields['Camp Name']}</h3>
        ${descriptionText ? `<p class="camp-short-desc">${descriptionText}</p>` : ''}
        
        <div class="camp-details">
            ${(fields['Age Min'] != null && fields['Age Max'] != null) ? `
            <div class="camp-detail-item">
                <span class="detail-label">Ages:</span>
                <span class="detail-value">${fields['Age Min']}-${fields['Age Max']}</span>
            </div>
            ` : ''}
            ${((fields['Cost Display'] && fields['Cost Display'].toString().trim()) || fields['Cost Per Week'] != null) ? `
            <div class="camp-detail-item">
                <span class="detail-label">Cost:</span>
                <span class="detail-value">${(fields['Cost Display'] && fields['Cost Display'].toString().trim()) || (fields['Cost Per Week'] != null ? '$' + fields['Cost Per Week'] : '')}</span>
            </div>
            ` : ''}
            ${fields['City'] ? `
            <div class="camp-detail-item">
                <span class="detail-label">Location:</span>
                <span class="detail-value">${fields['City']}</span>
            </div>
            ` : ''}
            ${registrationDate ? `
            <div class="camp-detail-item">
                <span class="detail-label">Registration:</span>
                <span class="detail-value">${registrationDate}</span>
            </div>
            ` : ''}
        </div>
        
        ${fields['Has After Care'] ? '<div class="badge">✓ After Care Available</div>' : ''}
        
        <a href="camp-detail.html?id=${camp.id}" class="btn-view-details">View Details</a>
    `;

    return card;
}

/**
 * Create a category card element
 */
function createCategoryCard(category) {
    const fields = category.fields;
    const card = document.createElement('div');
    card.className = 'category-card';
    card.onclick = () => {
        localStorage.setItem('categoryFilter', fields['Category Name']);
        window.location.href = 'browse.html';
    };

    // Icon mapping
    const iconMap = {
        'Sports': '⚽',
        'Arts & Crafts': '🎨',
        'STEM': '🧪',
        'Nature & Outdoor': '🌲',
        'Farm & Animals': '🐄',
        'Music': '🎵',
        'Academic': '📚',
        'General/Mixed': '⭐'
    };

    const icon = fields['Icon'] || iconMap[fields['Category Name']] || '🏕️';

    card.innerHTML = `
        <div class="category-icon">${icon}</div>
        <h3 class="category-name">${fields['Category Name']}</h3>
        <p class="category-count">${fields['Camp Count'] || 0} camps</p>
    `;

    return card;
}

/**
 * Compute registration status from camp fields
 * Hybrid approach: Use Registration Status from Airtable if present and valid,
 * otherwise compute from Registration Opens Date
 */
function computeRegistrationStatus(campFields) {
    const validStatuses = ['Open Now', 'Coming Soon', 'Not Updated'];
    
    // First, check if Registration Status exists and is valid
    if (campFields['Registration Status'] && validStatuses.includes(campFields['Registration Status'])) {
        return campFields['Registration Status'];
    }
    
    // Otherwise, compute from Registration Opens Date
    const dateStr = campFields['Registration Opens Date'];
    if (!dateStr || dateStr.toString().trim() === '') {
        return 'Not Updated';
    }
    
    try {
        // Parse YYYY-MM-DD format
        const [year, month, day] = dateStr.split('-').map(Number);
        const registrationDate = new Date(year, month - 1, day);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to compare dates only
        
        // Compare dates
        if (registrationDate < today) {
            return 'Open Now';
        } else {
            return 'Coming Soon';
        }
    } catch (error) {
        console.error('Error parsing registration date:', error);
        return 'Not Updated';
    }
}

/**
 * Format registration date for display
 * Converts YYYY-MM-DD to "Feb 2, 2026" format
 * Appends time if available: "Feb 2, 2026 at 7am"
 */
function formatRegistrationDate(dateStr, timeStr) {
    if (!dateStr || dateStr.toString().trim() === '') {
        return null;
    }
    
    try {
        // Parse YYYY-MM-DD format
        const [year, month, day] = dateStr.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        
        // Format as "Feb 2, 2026"
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                           'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const formattedDate = `${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
        
        // Append time if available
        if (timeStr && timeStr.toString().trim() !== '') {
            return `${formattedDate} at ${timeStr.toString().trim()}`;
        }
        
        return formattedDate;
    } catch (error) {
        console.error('Error formatting registration date:', error);
        return null;
    }
}

/**
 * Get unique cities from camps
 */
async function getCities() {
    const camps = await fetchCamps();
    const cities = new Set();
    camps.forEach(camp => {
        if (camp.fields['City']) {
            cities.add(camp.fields['City']);
        }
    });
    return Array.from(cities).sort();
}

/**
 * Get unique categories from camps
 */
async function getCategories() {
    const camps = await fetchCamps();
    const categories = new Set();
    camps.forEach(camp => {
        if (camp.fields['Primary Category']) {
            categories.add(camp.fields['Primary Category']);
        }
    });
    return Array.from(categories).sort();
}