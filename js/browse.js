// browse.js - Browse and filter camps

let browseCamps = [];
let browseFilters = {
    searchQuery: '',
    age: '',
    maxPrice: '',
    city: 'all',
    category: 'all',
    afterCare: false,
};

let browseSearchTimeout = null;

async function initBrowsePage() {
    const searchInput = document.getElementById('browse-search');
    const ageInput = document.getElementById('browse-age');
    const maxPriceInput = document.getElementById('browse-max-price');
    const citySelect = document.getElementById('browse-city');
    const categorySelect = document.getElementById('browse-category');
    const afterCareCheckbox = document.getElementById('browse-aftercare');
    const clearBtn = document.getElementById('browse-clear');
    const clearBtn2 = document.getElementById('browse-clear-2');

    const resultsContainer = document.getElementById('browse-results');
    const resultsCountEl = document.getElementById('browse-results-count');
    const noResultsEl = document.getElementById('browse-no-results');

    try {
        // Load initial data
        browseCamps = await fetchCamps();
        const [cities, categories] = await Promise.all([
            getCities(),
            getCategories()
        ]);

        // Populate dropdowns
        if (citySelect) {
            cities.forEach(city => {
                const opt = document.createElement('option');
                opt.value = city;
                opt.textContent = city;
                citySelect.appendChild(opt);
            });
        }

        if (categorySelect) {
            categories.forEach(cat => {
                const opt = document.createElement('option');
                opt.value = cat;
                opt.textContent = cat;
                categorySelect.appendChild(opt);
            });
        }

        // Seed from localStorage (quickSearch/category cards)
        const storedSearch = localStorage.getItem('searchQuery');
        const storedCategory = localStorage.getItem('categoryFilter');
        const storedAfterCare = localStorage.getItem('afterCareFilter');

        if (storedSearch && searchInput) {
            browseFilters.searchQuery = storedSearch;
            searchInput.value = storedSearch;
            localStorage.removeItem('searchQuery');
        }

        if (storedCategory && categorySelect) {
            browseFilters.category = storedCategory;
            categorySelect.value = storedCategory;
            localStorage.removeItem('categoryFilter');
        }

        if (storedAfterCare === 'true' && afterCareCheckbox) {
            browseFilters.afterCare = true;
            afterCareCheckbox.checked = true;
            localStorage.removeItem('afterCareFilter');
        }

        // Wire up events
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                browseFilters.searchQuery = searchInput.value.trim();
                if (browseSearchTimeout) {
                    clearTimeout(browseSearchTimeout);
                }
                browseSearchTimeout = setTimeout(applyBrowseFiltersAndRender, 250);
            });
        }

        if (ageInput) {
            ageInput.addEventListener('input', () => {
                browseFilters.age = ageInput.value.trim();
                applyBrowseFiltersAndRender();
            });
        }

        if (maxPriceInput) {
            maxPriceInput.addEventListener('input', () => {
                browseFilters.maxPrice = maxPriceInput.value.trim();
                applyBrowseFiltersAndRender();
            });
        }

        if (citySelect) {
            citySelect.addEventListener('change', () => {
                browseFilters.city = citySelect.value;
                applyBrowseFiltersAndRender();
            });
        }

        if (categorySelect) {
            categorySelect.addEventListener('change', () => {
                browseFilters.category = categorySelect.value;
                applyBrowseFiltersAndRender();
            });
        }

        if (afterCareCheckbox) {
            afterCareCheckbox.addEventListener('change', () => {
                browseFilters.afterCare = afterCareCheckbox.checked;
                applyBrowseFiltersAndRender();
            });
        }

        const clearAll = () => {
            browseFilters = {
                searchQuery: '',
                age: '',
                maxPrice: '',
                city: 'all',
                category: 'all',
                afterCare: false,
            };

            if (searchInput) searchInput.value = '';
            if (ageInput) ageInput.value = '';
            if (maxPriceInput) maxPriceInput.value = '';
            if (citySelect) citySelect.value = 'all';
            if (categorySelect) categorySelect.value = 'all';
            if (afterCareCheckbox) afterCareCheckbox.checked = false;

            applyBrowseFiltersAndRender();
        };

        if (clearBtn) {
            clearBtn.addEventListener('click', clearAll);
        }
        if (clearBtn2) {
            clearBtn2.addEventListener('click', clearAll);
        }

        // Initial render
        applyBrowseFiltersAndRender();
    } catch (error) {
        console.error('Error initializing browse page:', error);
        if (resultsContainer) {
            resultsContainer.innerHTML = '<div class="loading">Unable to load camps. Please refresh the page.</div>';
        }
        if (resultsCountEl) {
            resultsCountEl.textContent = 'Unable to load camps.';
        }
        if (noResultsEl) {
            noResultsEl.style.display = 'none';
        }
    }
}

function applyBrowseFiltersAndRender() {
    const resultsContainer = document.getElementById('browse-results');
    const resultsCountEl = document.getElementById('browse-results-count');
    const noResultsEl = document.getElementById('browse-no-results');

    if (!resultsContainer || !Array.isArray(browseCamps)) {
        return;
    }

    const filtered = filterCamps(browseCamps, browseFilters);

    // Update count
    if (resultsCountEl) {
        const count = filtered.length;
        if (count === 0) {
            resultsCountEl.textContent = 'No camps found';
        } else if (count === 1) {
            resultsCountEl.textContent = '1 camp found';
        } else {
            resultsCountEl.textContent = `${count} camps found`;
        }
    }

    // Render results
    resultsContainer.innerHTML = '';

    if (filtered.length === 0) {
        if (noResultsEl) {
            noResultsEl.style.display = 'block';
        }
        return;
    }

    if (noResultsEl) {
        noResultsEl.style.display = 'none';
    }

    filtered.forEach(camp => {
        const card = createCampCard(camp);
        resultsContainer.appendChild(card);
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBrowsePage);
} else {
    initBrowsePage();
}

