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
        const response = await fetch(
            `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Camps`,
            {
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_API_KEY}`
                }
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        campsCache = data.records;
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
        const response = await fetch(
            `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Categories`,
            {
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_API_KEY}`
                }
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        categoriesCache = data.records;
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

    card.innerHTML = `
        <div class="camp-category">${fields['Primary Category'] || 'General'}</div>
        <h3 class="camp-name">${fields['Camp Name']}</h3>
        <p class="camp-short-desc">${fields['Short Description'] || fields['Description']?.substring(0, 120) + '...' || ''}</p>
        
        <div class="camp-details">
            <div class="camp-detail-item">
                <span class="detail-label">Ages:</span>
                <span class="detail-value">${fields['Age Min']}-${fields['Age Max']}</span>
            </div>
            <div class="camp-detail-item">
                <span class="detail-label">Cost:</span>
                <span class="detail-value">${fields['Cost Display'] || '$' + fields['Cost Per Week']}</span>
            </div>
            <div class="camp-detail-item">
                <span class="detail-label">Location:</span>
                <span class="detail-value">${fields['City']}</span>
            </div>
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