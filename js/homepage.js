// homepage.js - Homepage-specific functionality

/**
 * Initialize homepage functionality
 */
async function initHomepage() {
    // Set up search box
    const searchInput = document.getElementById('homepage-search');
    const searchButton = document.getElementById('homepage-search-btn');
    
    if (searchInput) {
        // Handle Enter key
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleHomepageSearch();
            }
        });
    }
    
    if (searchButton) {
        searchButton.addEventListener('click', handleHomepageSearch);
    }

    // Set up after care checkbox
    const afterCareCheckbox = document.getElementById('homepage-aftercare');
    if (afterCareCheckbox) {
        afterCareCheckbox.addEventListener('change', () => {
            if (afterCareCheckbox.checked) {
                redirectToBrowseWithAfterCare();
            }
        });
    }

    // Update stats
    await updateHomepageStats();

    // Load categories
    await loadCategories();
}

/**
 * Handle homepage search (button click or Enter key)
 */
function handleHomepageSearch() {
    const searchInput = document.getElementById('homepage-search');
    const query = searchInput ? searchInput.value.trim() : '';
    const afterCare = document.getElementById('homepage-aftercare')?.checked || false;
    
    // Always redirect to browse page (empty query shows all camps)
    if (query) {
        localStorage.setItem('searchQuery', query);
    }
    if (afterCare) {
        localStorage.setItem('afterCareFilter', 'true');
    }
    window.location.href = 'browse.html';
}

/**
 * Redirect to browse page with search query
 */
function redirectToBrowseWithSearch(query) {
    const afterCare = document.getElementById('homepage-aftercare')?.checked || false;
    
    localStorage.setItem('searchQuery', query);
    if (afterCare) {
        localStorage.setItem('afterCareFilter', 'true');
    }
    window.location.href = 'browse.html';
}

/**
 * Redirect to browse page with after care filter
 */
function redirectToBrowseWithAfterCare() {
    const searchQuery = document.getElementById('homepage-search')?.value.trim() || '';
    
    localStorage.setItem('afterCareFilter', 'true');
    if (searchQuery) {
        localStorage.setItem('searchQuery', searchQuery);
    }
    window.location.href = 'browse.html';
}

/**
 * Calculate and update homepage stats
 */
async function updateHomepageStats() {
    try {
        const camps = await fetchCamps();
        
        // Update total camps
        const totalCampsEl = document.getElementById('total-camps');
        if (totalCampsEl) {
            totalCampsEl.textContent = camps.length;
        }

        // Calculate age range
        const ageMins = camps
            .map(camp => camp.fields['Age Min'])
            .filter(age => age != null && age !== undefined);
        const ageMaxs = camps
            .map(camp => camp.fields['Age Max'])
            .filter(age => age != null && age !== undefined);
        
        const ageRangeEl = document.getElementById('age-range');
        if (ageRangeEl) {
            if (ageMins.length > 0 && ageMaxs.length > 0) {
                const minAge = Math.min(...ageMins);
                const maxAge = Math.max(...ageMaxs);
                ageRangeEl.textContent = `${minAge}-${maxAge}`;
            } else {
                ageRangeEl.textContent = 'N/A';
            }
        }

        // Calculate price range
        const prices = camps
            .map(camp => camp.fields['Cost Per Week'])
            .filter(price => price != null && price !== undefined && price > 0);
        
        const priceRangeEl = document.getElementById('price-range');
        if (priceRangeEl) {
            if (prices.length > 0) {
                const minPrice = Math.min(...prices);
                const maxPrice = Math.max(...prices);
                if (minPrice === maxPrice) {
                    priceRangeEl.textContent = `$${minPrice}`;
                } else {
                    priceRangeEl.textContent = `$${minPrice}-$${maxPrice}`;
                }
            } else {
                priceRangeEl.textContent = 'Varies';
            }
        }
    } catch (error) {
        console.error('Error updating homepage stats:', error);
        // Keep "Loading..." text if error occurs
    }
}

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHomepage);
} else {
    initHomepage();
}
